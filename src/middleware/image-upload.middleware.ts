import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import {
	ALLOWED_IMAGE_MIME_TYPES,
	IMAGE_UPLOAD_POLICY,
	MAX_UPLOAD_FILE_SIZE_BYTES,
	MAX_UPLOAD_FILE_SIZE_MB
} from '../config/upload.config';
import { SecurityLogger } from '../logger/security.logger';

class UnsupportedImageTypeError extends Error {
	constructor(public readonly mimeType: string) {
		super(`Unsupported image type: ${mimeType}`);
	}
}

function detectImageMime(buffer: Buffer): (typeof ALLOWED_IMAGE_MIME_TYPES)[number] | null {
	if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
		return 'image/jpeg';
	}
	if (
		buffer.length >= 8 &&
		buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
	) {
		return 'image/png';
	}
	if (
		buffer.length >= 12 &&
		buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
		buffer.subarray(8, 12).toString('ascii') === 'WEBP'
	) {
		return 'image/webp';
	}
	return null;
}

function rejectUpload(req: Request, res: Response, status: number, code: string, message: string) {
	try {
		SecurityLogger.maliciousInputBlocked(req, code, {
			message,
			policy: IMAGE_UPLOAD_POLICY
		});
	} catch (error) {
		console.error('Failed to log rejected upload:', error);
	}

	return res.status(status).json({
		status,
		msg: message,
		data: {
			code,
			policy: IMAGE_UPLOAD_POLICY
		}
	});
}

export function createImageUploadMiddleware(options: { multiple?: boolean; fieldName?: string } = {}) {
	const fieldName = options.fieldName || (options.multiple ? 'images' : 'image');
	const upload = multer({
		storage: multer.memoryStorage(),
		limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES },
		fileFilter: (_req, file, callback) => {
			if ((ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
				return callback(null, true);
			}
			return callback(new UnsupportedImageTypeError(file.mimetype));
		}
	});
	const middleware = options.multiple ? upload.array(fieldName) : upload.single(fieldName);

	return (req: Request, res: Response, next: NextFunction) => {
		res.setHeader('X-Upload-Max-File-Size', MAX_UPLOAD_FILE_SIZE_BYTES);
		res.setHeader('X-Upload-Allowed-Types', ALLOWED_IMAGE_MIME_TYPES.join(','));
		middleware(req, res, (error: unknown) => {
			if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
				return rejectUpload(
					req,
					res,
					413,
					'file_too_large',
					`حجم فایل بیش از حد مجاز ${MAX_UPLOAD_FILE_SIZE_MB} مگابایت است.`
				);
			}
			if (error instanceof UnsupportedImageTypeError) {
				return rejectUpload(
					req,
					res,
					415,
					'invalid_file_type',
					`نوع فایل ${error.mimeType} مجاز نیست. فقط تصاویر JPG، JPEG، PNG و WEBP پذیرفته می‌شوند.`
				);
			}
			if (error) return next(error);

			const files = (options.multiple ? req.files : req.file ? [req.file] : []) as Express.Multer.File[];
			for (const file of files) {
				const detectedMime = detectImageMime(file.buffer);
				const declaredMime = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
				if (!detectedMime || detectedMime !== declaredMime) {
					return rejectUpload(
						req,
						res,
						415,
						'file_content_type_mismatch',
						'محتوای واقعی فایل با نوع اعلام‌شده مطابقت ندارد یا فرمت تصویر مجاز نیست.'
					);
				}
			}

			return next();
		});
	};
}
