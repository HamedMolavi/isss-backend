import { Request, Response, NextFunction } from 'express';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';

/**
 * HTTP Methods Security Middleware
 *
 * Provides protection against:
 * 1. Unauthorized HTTP methods - Returns 405 Method Not Allowed
 * 2. OPTIONS method abuse - Restricts OPTIONS responses
 * 3. Header exposure - Removes sensitive headers from responses
 */

// Allowed HTTP methods for the API
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

// Headers that should be removed from responses
const HEADERS_TO_REMOVE = ['X-Powered-By', 'Server', 'X-AspNet-Version', 'X-AspNetMvc-Version'];

/**
 * Middleware to handle OPTIONS requests restrictively
 * Only allows OPTIONS for CORS preflight with specific origins
 */
export function optionsHandler(req: Request, res: Response, next: NextFunction) {
	if (req.method === 'OPTIONS' || req.method === 'HEAD') {
		// Get the origin from the request
		const origin = req.headers.origin;

		// If no origin header, this is not a valid CORS preflight
		if (!origin) {
			return ApiRes(res, {
				status: HttpStatus.METHOD_NOT_ALLOWED,
				msg: 'OPTIONS method not allowed'
			});
		}

		// Set minimal CORS headers for preflight
		res.setHeader('Access-Control-Allow-Origin', origin);
		res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
		res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
		res.setHeader('Access-Control-Allow-Credentials', 'true');

		// Don't expose sensitive headers
		res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');

		// End the preflight request
		return res.status(204).end();
	}

	next();
}

/**
 * Middleware to validate HTTP methods
 * Returns 405 Method Not Allowed for unsupported methods
 */
export function methodValidator(req: Request, res: Response, next: NextFunction) {
	const method = req.method.toUpperCase();

	// Check if method is allowed
	if (!ALLOWED_METHODS.includes(method)) {
		// Set Allow header to indicate which methods are supported
		res.setHeader('Allow', ALLOWED_METHODS.join(', '));

		return ApiRes(res, {
			status: HttpStatus.METHOD_NOT_ALLOWED,
			msg: `Method ${method} is not allowed`
		});
	}

	next();
}

/**
 * Middleware to remove sensitive headers from responses
 * Prevents information disclosure through headers
 */
export function headerSanitizer(_req: Request, res: Response, next: NextFunction) {
	// Remove sensitive headers
	for (const header of HEADERS_TO_REMOVE) {
		res.removeHeader(header);
	}

	// Override the setHeader method to prevent re-adding removed headers
	const originalSetHeader = res.setHeader.bind(res);
	res.setHeader = function (name: string, value: string | number | readonly string[]) {
		// Block setting of sensitive headers
		if (HEADERS_TO_REMOVE.map((h) => h.toLowerCase()).includes(name.toLowerCase())) {
			return res;
		}
		return originalSetHeader(name, value);
	};

	// Add security headers
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('X-Frame-Options', 'DENY');
	res.setHeader('X-XSS-Protection', '0'); // Disabled as per modern security recommendations
	res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
	res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
	res.setHeader('Pragma', 'no-cache');
	res.setHeader('Expires', '0');

	next();
}

/**
 * Combined HTTP security middleware
 * Applies all HTTP method and header security measures
 *
 * This middleware should be registered FIRST in the middleware chain
 */
export function httpSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
	// 1. Remove sensitive headers
	for (const header of HEADERS_TO_REMOVE) {
		res.removeHeader(header);
	}

	// 2. Add security headers for all responses
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('X-Frame-Options', 'DENY');
	res.setHeader('X-XSS-Protection', '0'); // Disabled as per modern security recommendations (use CSP instead)
	res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
	res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
	res.setHeader('Pragma', 'no-cache');
	res.setHeader('Expires', '0');

	// 3. Handle OPTIONS requests (CORS preflight)
	if (req.method === 'OPTIONS') {
		const origin = req.headers.origin;

		// Only allow OPTIONS for valid CORS preflight requests
		if (!origin) {
			return ApiRes(res, {
				status: HttpStatus.METHOD_NOT_ALLOWED,
				msg: 'OPTIONS method not allowed'
			});
		}

		res.setHeader('Access-Control-Allow-Origin', origin);
		res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
		res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
		res.setHeader('Access-Control-Allow-Credentials', 'true');
		res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');

		return res.status(204).end();
	}

	// 4. Validate HTTP method
	const method = req.method.toUpperCase();
	if (!ALLOWED_METHODS.includes(method)) {
		res.setHeader('Allow', ALLOWED_METHODS.join(', '));

		return ApiRes(res, {
			status: HttpStatus.METHOD_NOT_ALLOWED,
			msg: `Method ${method} is not allowed`
		});
	}

	next();
}

export { ALLOWED_METHODS, HEADERS_TO_REMOVE };
