import { Request, Response, NextFunction } from 'express';
import { SecurityLogger } from '../logger/security.logger';
import { IUserDocument } from '../types/interfaces/user.interface';
import { existsSync, readdirSync, readFileSync } from 'fs';
import path from 'path';
import rateLimit from 'express-rate-limit';

/**
 * Allowed MIME types for different file operations
 */
const ALLOWED_MIME_TYPES = {
	images: ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/x-windows-bmp'],
	excel: [
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
		'application/vnd.ms-excel', // .xls
		'application/octet-stream' // Sometimes Excel files are detected as this
	],
	zip: ['application/zip'],
	json: ['application/json']
};

/**
 * Check MIME type from file buffer
 * Uses magic bytes to detect actual file type
 */
const getMimeTypeFromBuffer = (buffer: Buffer): string | null => {
	// Check for common image signatures
	if (buffer.length < 4) return null;

	// JPEG magic bytes: FF D8 FF
	if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
		return 'image/jpeg';
	}

	// PNG magic bytes: 89 50 4E 47
	if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
		return 'image/png';
	}

	// BMP magic bytes: 42 4D
	if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
		return 'image/bmp';
	}

	// Excel XLSX magic bytes: 50 4B (ZIP signature, as XLSX is a ZIP file)
	if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
		// Further check for XLSX by looking for specific internal structure
		const bufferStr = buffer.toString('ascii', 0, Math.min(512, buffer.length));
		if (bufferStr.includes('xl/') || bufferStr.includes('word/') || bufferStr.includes('ppt/')) {
			return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
		}
	}

	// Excel XLS magic bytes: D0 CF 11 E0 A1 B1 1A E1 (OLE2 signature)
	if (
		buffer.length >= 8 &&
		buffer[0] === 0xd0 &&
		buffer[1] === 0xcf &&
		buffer[2] === 0x11 &&
		buffer[3] === 0xe0 &&
		buffer[4] === 0xa1 &&
		buffer[5] === 0xb1 &&
		buffer[6] === 0x1a &&
		buffer[7] === 0xe1
	) {
		return 'application/vnd.ms-excel';
	}

	return null;
};

/**
 * Validate file MIME type against allowed types
 */
const validateMimeType = (
	fileBuffer: Buffer,
	fileName: string,
	allowedTypes: string[]
): { isValid: boolean; detectedType: string | null; reason?: string } => {
	const detectedType = getMimeTypeFromBuffer(fileBuffer);

	if (!detectedType) {
		return {
			isValid: false,
			detectedType: null,
			reason: 'Could not detect file type from content'
		};
	}

	const isValid = allowedTypes.includes(detectedType);

	if (!isValid) {
		return {
			isValid: false,
			detectedType,
			reason: `Detected MIME type '${detectedType}' is not allowed for file '${fileName}'`
		};
	}

	return {
		isValid: true,
		detectedType
	};
};

/**
 * Batch-specific rate limiter - more restrictive due to resource-intensive nature
 */
export const batchRateLimit = rateLimit({
	windowMs: 5 * 60 * 1000, // 5 minutes
	max: 3, // limit each IP to 3 batch requests per windowMs
	message: {
		success: false,
		message: 'Too many batch processing requests. Please try again in 5 minutes.',
		retryAfter: 300
	},
	standardHeaders: true,
	legacyHeaders: false,
	handler: (req: Request, res: Response) => {
		SecurityLogger.rateLimitExceeded(req, 'batch_processing');
		res.status(429).json({
			success: false,
			message: 'Too many batch processing requests. Please try again in 5 minutes.',
			retryAfter: 300
		});
	}
});

/**
 * Comprehensive security validation middleware for batch operations
 * Protects against:
 * - Path traversal attacks
 * - Directory escape attempts
 * - Excessive file processing (DoS)
 * - Large request payloads
 * - Unauthorized access
 */
export const batchSecurityValidation = (req: Request, res: Response, next: NextFunction) => {
	try {
		// 1. Path traversal validation
		const requestedPath = req.body?.path;
		if (requestedPath) {
			// Normalize path and check for directory traversal attempts
			const normalizedPath = path.normalize(requestedPath);

			// Check for dangerous patterns
			const dangerousPatterns = [
				'..', // Parent directory traversal
				'/etc/',
				'/var/',
				'/usr/',
				'/root/', // System directories
				'\\\\', // Windows UNC paths
				'~/', // Home directory
				'$', // Environment variables
				'%' // URL encoding attempts
			];

			const containsDangerousPattern = dangerousPatterns.some(
				(pattern) => normalizedPath.includes(pattern) || requestedPath.includes(pattern)
			);

			if (containsDangerousPattern) {
				SecurityLogger.maliciousInputBlocked(req, 'path_traversal', {
					path: requestedPath,
					normalizedPath
				});
				return res.status(400).json({
					success: false,
					message: 'Invalid path detected. Path traversal attempts are not allowed.'
				});
			}

			// Ensure path is relative and within expected directory structure
			if (path.isAbsolute(normalizedPath)) {
				SecurityLogger.maliciousInputBlocked(req, 'absolute_path', {
					path: requestedPath
				});
				return res.status(400).json({
					success: false,
					message: 'Absolute paths are not allowed. Please use relative paths only.'
				});
			}
		}

		// 2. Directory existence and permissions validation
		if (requestedPath) {
			const fullPath = path.join(__dirname, '../../face_DB', requestedPath);

			// Check if path exists and is within the allowed directory
			const basePath = path.join(__dirname, '../../face_DB');
			const resolvedPath = path.resolve(fullPath);
			const resolvedBasePath = path.resolve(basePath);

			if (!resolvedPath.startsWith(resolvedBasePath)) {
				SecurityLogger.maliciousInputBlocked(req, 'directory_escape', {
					requestedPath,
					resolvedPath,
					basePath: resolvedBasePath
				});
				return res.status(400).json({
					success: false,
					message: 'Access denied. Path is outside allowed directory.'
				});
			}

			// Check if directory exists and has reasonable file count
			if (existsSync(resolvedPath)) {
				try {
					const files = readdirSync(resolvedPath);
					const maxFiles = 10000; // Reasonable limit to prevent resource exhaustion

					if (files.length > maxFiles) {
						SecurityLogger.maliciousInputBlocked(req, 'excessive_files', {
							path: requestedPath,
							fileCount: files.length,
							maxAllowed: maxFiles
						});
						return res.status(400).json({
							success: false,
							message: `Directory contains too many files (${files.length}). Maximum allowed: ${maxFiles}.`
						});
					}
				} catch (error) {
					SecurityLogger.maliciousInputBlocked(req, 'directory_access_error', {
						path: requestedPath,
						error: error instanceof Error ? error.message : 'Unknown error'
					});
					return res.status(400).json({
						success: false,
						message: 'Cannot access specified directory.'
					});
				}
			}
		}

		// 3. Request size validation
		const requestSizeLimit = 1024 * 1024; // 1MB limit for batch requests
		const requestSize = JSON.stringify(req.body).length;

		if (requestSize > requestSizeLimit) {
			SecurityLogger.maliciousInputBlocked(req, 'request_too_large', {
				size: requestSize,
				limit: requestSizeLimit
			});
			return res.status(413).json({
				success: false,
				message: 'Request payload too large.'
			});
		}

		// 4. User permission level validation for batch operations
		const user = req.user as IUserDocument;
		if (!user || !user.access_level) {
			SecurityLogger.suspiciousActivity(req, 'batch_operation_unauthorized_access', {
				reason: 'No user or access level found',
				securityCheck: 'failed'
			});
			return res.status(401).json({
				success: false,
				message: 'Authentication required for batch operations.'
			});
		}

		// 5. Additional security checks for file extensions and MIME types (if path contains files)
		if (requestedPath && existsSync(path.join(__dirname, '../../face_DB', requestedPath))) {
			try {
				const files = readdirSync(path.join(__dirname, '../../face_DB', requestedPath), {
					withFileTypes: true
				});
				const allowedExtensions = ['.jpg', '.jpeg', '.png', '.bmp'];
				const suspiciousFiles: string[] = [];
				const mimeTypeViolations: string[] = [];

				for (const file of files) {
					if (file.isFile()) {
						const fileName = file.name;
						const ext = path.extname(fileName).toLowerCase();

						// Check file extension
						if (ext && !allowedExtensions.includes(ext)) {
							suspiciousFiles.push(fileName);
						}

						// Sample MIME type check for first few files to avoid performance impact
						if (allowedExtensions.includes(ext) && mimeTypeViolations.length < 5) {
							try {
								const filePath = path.join(__dirname, '../../face_DB', requestedPath, fileName);
								const fileBuffer = readFileSync(filePath);
								const mimeValidation = validateMimeType(fileBuffer, fileName, ALLOWED_MIME_TYPES.images);

								if (!mimeValidation.isValid) {
									mimeTypeViolations.push(`${fileName} (detected: ${mimeValidation.detectedType})`);
								}
							} catch {
								// Skip files that can't be read
							}
						}
					}
				}

				if (suspiciousFiles.length > 0) {
					SecurityLogger.maliciousInputBlocked(req, 'suspicious_file_extensions', {
						path: requestedPath,
						suspiciousFiles: suspiciousFiles.slice(0, 10), // Log first 10 suspicious files
						allowedExtensions
					});
					return res.status(400).json({
						success: false,
						message: 'Directory contains files with unsupported extensions.'
					});
				}

				if (mimeTypeViolations.length > 0) {
					SecurityLogger.maliciousInputBlocked(req, 'invalid_image_mime_types', {
						path: requestedPath,
						violations: mimeTypeViolations,
						allowedMimeTypes: ALLOWED_MIME_TYPES.images
					});
					return res.status(400).json({
						success: false,
						message: `Directory contains files with invalid content types: ${mimeTypeViolations.join(', ')}`
					});
				}
			} catch {
				// Directory read error already handled above
			}
		}

		// 6. Log security validation success
		SecurityLogger.suspiciousActivity(req, 'batch_operation_security_validated', {
			validatedPath: requestedPath,
			requestSize,
			userLevel: user.access_level?.toString(),
			securityCheck: 'passed'
		});

		next();
	} catch (error) {
		SecurityLogger.suspiciousActivity(req, 'batch_operation_security_validation_failed', {
			error: error instanceof Error ? error.message : 'Unknown error',
			securityCheck: 'failed'
		});
		return res.status(500).json({
			success: false,
			message: 'Security validation failed.'
		});
	}
};

/**
 * Comprehensive security validation for file upload operations
 */
export const fileUploadSecurityValidation = (req: Request, res: Response, next: NextFunction) => {
	try {
		// 1. File size and MIME type validation
		if (req.files) {
			const maxFileSize = 50 * 1024 * 1024; // 50MB limit
			const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();

			for (const file of files) {
				// Check file size
				if ('size' in file && file.size > maxFileSize) {
					SecurityLogger.maliciousInputBlocked(req, 'file_too_large', {
						fileName: file.name,
						fileSize: file.size,
						maxAllowed: maxFileSize
					});
					return res.status(413).json({
						success: false,
						message: `File ${file.name} is too large. Maximum allowed: ${maxFileSize / (1024 * 1024)}MB.`
					});
				}

				// Check MIME type based on file content
				if ('data' in file && Buffer.isBuffer(file.data)) {
					let allowedTypes: string[] = [];
					const fileName = file.name.toLowerCase();

					// Determine allowed MIME types based on context/file name
					if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
						allowedTypes = ALLOWED_MIME_TYPES.excel;
					} else if (fileName.match(/\.(jpg|jpeg|png|bmp)$/)) {
						allowedTypes = ALLOWED_MIME_TYPES.images;
					} else {
						// For unknown extensions, allow both images and Excel files
						allowedTypes = [...ALLOWED_MIME_TYPES.images, ...ALLOWED_MIME_TYPES.excel];
					}

					const mimeValidation = validateMimeType(file.data, file.name, allowedTypes);

					if (!mimeValidation.isValid) {
						SecurityLogger.maliciousInputBlocked(req, 'invalid_mime_type', {
							fileName: file.name,
							detectedMimeType: mimeValidation.detectedType,
							allowedMimeTypes: allowedTypes,
							reason: mimeValidation.reason
						});
						return res.status(400).json({
							success: false,
							message: `File ${file.name} has invalid content type. ${mimeValidation.reason || 'File content does not match expected format.'}`
						});
					}

					// Log successful MIME type validation
					SecurityLogger.suspiciousActivity(req, 'file_mime_type_validated', {
						fileName: file.name,
						detectedMimeType: mimeValidation.detectedType,
						fileSize: file.size,
						securityCheck: 'passed'
					});
				}
			}
		}

		// 2. User authentication check
		const user = req.user as IUserDocument;
		if (!user || !user.access_level) {
			SecurityLogger.suspiciousActivity(req, 'file_upload_unauthorized_access', {
				reason: 'No user or access level found',
				securityCheck: 'failed'
			});
			return res.status(401).json({
				success: false,
				message: 'Authentication required for file upload operations.'
			});
		}

		// 3. Log successful validation
		SecurityLogger.suspiciousActivity(req, 'file_upload_security_validated', {
			fileCount: req.files ? Object.keys(req.files).length : 0,
			userLevel: user.access_level?.toString(),
			securityCheck: 'passed'
		});

		next();
	} catch (error) {
		SecurityLogger.suspiciousActivity(req, 'file_upload_security_validation_failed', {
			error: error instanceof Error ? error.message : 'Unknown error',
			securityCheck: 'failed'
		});
		return res.status(500).json({
			success: false,
			message: 'File upload security validation failed.'
		});
	}
};
