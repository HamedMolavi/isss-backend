import { Request, Response, NextFunction } from 'express';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { SecurityLogger } from '../logger/security.logger';

/**
 * Input Sanitization Middleware
 *
 * Provides protection against:
 * 1. CRLF Injection - Filters carriage return and line feed characters
 * 2. Excessive Input Length - Limits string field lengths
 * 3. Stack Trace Exposure - Handled by global error handler
 */

// Configuration for input limits
const INPUT_LIMITS = {
	// Default maximum string length for regular fields
	DEFAULT_MAX_LENGTH: 500,

	// Maximum length for specific field types
	FIELD_LIMITS: {
		username: 50,
		password: 128,
		email: 100,
		phone_number: 20,
		name: 100,
		first_name: 50,
		last_name: 50,
		national_code: 20,
		personnel_code: 30,
		title: 200,
		description: 2000,
		address: 500,
		ip: 45, // IPv6 max length
		url: 2048,
		path: 1024
	} as Record<string, number>,

	// Fields that are allowed to be longer (like base64 images)
	EXEMPT_FIELDS: ['image', 'photo', 'avatar', 'file', 'base64', 'content', 'data', 'body', 'token'],

	// Maximum depth for nested objects
	MAX_OBJECT_DEPTH: 10,

	// Maximum array length
	MAX_ARRAY_LENGTH: 1000
};

/**
 * Check if a field name should be exempt from length limits
 */
function isExemptField(fieldName: string): boolean {
	const lowerFieldName = fieldName.toLowerCase();
	return INPUT_LIMITS.EXEMPT_FIELDS.some((exempt) => lowerFieldName.includes(exempt));
}

/**
 * Get the maximum allowed length for a field
 */
function getFieldMaxLength(fieldName: string): number {
	const lowerFieldName = fieldName.toLowerCase();

	// Check for exact match first
	if (INPUT_LIMITS.FIELD_LIMITS[lowerFieldName]) {
		return INPUT_LIMITS.FIELD_LIMITS[lowerFieldName];
	}

	// Check for partial match
	for (const [key, limit] of Object.entries(INPUT_LIMITS.FIELD_LIMITS)) {
		if (lowerFieldName.includes(key)) {
			return limit;
		}
	}

	return INPUT_LIMITS.DEFAULT_MAX_LENGTH;
}

/**
 * CRLF characters that should be filtered
 */
// eslint-disable-next-line no-control-regex
const CRLF_PATTERN = /[\r\n\x00-\x08\x0B\x0C\x0E-\x1F]/g;

/**
 * Check if a string contains CRLF injection attempts
 */
function containsCRLF(value: string): boolean {
	return CRLF_PATTERN.test(value);
}

/**
 * Sanitize a string by removing CRLF characters
 */
function sanitizeCRLF(value: string): string {
	return value.replace(CRLF_PATTERN, '');
}

interface ValidationResult {
	valid: boolean;
	error?: string;
	field?: string;
	sanitized?: boolean;
}

/**
 * Recursively validate and sanitize an object
 */
function validateAndSanitizeObject(
	obj: unknown,
	path: string = '',
	depth: number = 0
): ValidationResult & { value?: unknown } {
	// Check depth limit
	if (depth > INPUT_LIMITS.MAX_OBJECT_DEPTH) {
		return {
			valid: false,
			error: 'Request structure too deeply nested',
			field: path
		};
	}

	// Handle null/undefined
	if (obj === null || obj === undefined) {
		return { valid: true, value: obj };
	}

	// Handle strings
	if (typeof obj === 'string') {
		const fieldName = path.split('.').pop() || '';
		let strValue = obj;

		// Check for CRLF injection
		if (containsCRLF(strValue)) {
			// Sanitize instead of rejecting
			strValue = sanitizeCRLF(strValue);
		}

		// Check length limit (skip exempt fields)
		if (!isExemptField(fieldName)) {
			const maxLength = getFieldMaxLength(fieldName);
			if (strValue.length > maxLength) {
				return {
					valid: false,
					error: `Field '${fieldName}' exceeds maximum length of ${maxLength} characters`,
					field: path
				};
			}
		}

		return { valid: true, value: strValue };
	}

	// Handle arrays
	if (Array.isArray(obj)) {
		if (obj.length > INPUT_LIMITS.MAX_ARRAY_LENGTH) {
			return {
				valid: false,
				error: `Array at '${path}' exceeds maximum length of ${INPUT_LIMITS.MAX_ARRAY_LENGTH}`,
				field: path
			};
		}

		const sanitizedArray: unknown[] = [];
		for (let i = 0; i < obj.length; i++) {
			const result = validateAndSanitizeObject(obj[i], `${path}[${i}]`, depth + 1);
			if (!result.valid) {
				return result;
			}
			sanitizedArray.push(result.value);
		}
		return { valid: true, value: sanitizedArray };
	}

	// Handle objects
	if (typeof obj === 'object') {
		const sanitizedObj: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj)) {
			const fieldPath = path ? `${path}.${key}` : key;
			const result = validateAndSanitizeObject(value, fieldPath, depth + 1);
			if (!result.valid) {
				return result;
			}
			sanitizedObj[key] = result.value;
		}
		return { valid: true, value: sanitizedObj };
	}

	// Other types (numbers, booleans) pass through
	return { valid: true, value: obj };
}

/**
 * Input Sanitization Middleware
 *
 * Validates and sanitizes request body, query, and params:
 * - Removes CRLF characters to prevent injection attacks
 * - Enforces maximum string lengths
 * - Limits object nesting depth
 * - Limits array lengths
 */
export function inputSanitizationMiddleware(req: Request, res: Response, next: NextFunction) {
	try {
		// Validate and sanitize body
		if (req.body && typeof req.body === 'object') {
			const bodyResult = validateAndSanitizeObject(req.body, 'body');
			if (!bodyResult.valid) {
				SecurityLogger.maliciousInputBlocked(req, 'input_validation_failed', {
					error: bodyResult.error,
					field: bodyResult.field
				});
				return ApiRes(res, {
					status: HttpStatus.BAD_REQUEST,
					msg: bodyResult.error || 'Invalid input'
				});
			}
			req.body = bodyResult.value;
		}

		// Validate and sanitize query parameters
		if (req.query && typeof req.query === 'object') {
			const queryResult = validateAndSanitizeObject(req.query, 'query');
			if (!queryResult.valid) {
				SecurityLogger.maliciousInputBlocked(req, 'query_validation_failed', {
					error: queryResult.error,
					field: queryResult.field
				});
				return ApiRes(res, {
					status: HttpStatus.BAD_REQUEST,
					msg: queryResult.error || 'Invalid query parameters'
				});
			}
			req.query = queryResult.value as typeof req.query;
		}

		// Validate and sanitize URL parameters
		if (req.params && typeof req.params === 'object') {
			const paramsResult = validateAndSanitizeObject(req.params, 'params');
			if (!paramsResult.valid) {
				SecurityLogger.maliciousInputBlocked(req, 'params_validation_failed', {
					error: paramsResult.error,
					field: paramsResult.field
				});
				return ApiRes(res, {
					status: HttpStatus.BAD_REQUEST,
					msg: paramsResult.error || 'Invalid URL parameters'
				});
			}
			req.params = paramsResult.value as typeof req.params;
		}

		next();
	} catch {
		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'Invalid request format'
		});
	}
}

/**
 * Export configuration for external use
 */
export { INPUT_LIMITS };
