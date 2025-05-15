import { Request, Response, NextFunction } from 'express';
import { Logger } from '../logger';

/**
 * Middleware that logs all incoming requests and their responses
 */
export function routeLoggerMiddleware(
	options: {
		skipPaths?: RegExp[];
		logBody?: boolean;
		logHeaders?: boolean;
	} = {}
) {
	const {
		skipPaths = [/^\/health$/, /^\/favicon.ico$/],
		logBody = false, // Don't log bodies by default to avoid sensitive data logging
		logHeaders = false // Don't log headers by default
	} = options;

	return (req: Request, res: Response, next: NextFunction) => {
		// Skip logging for excluded paths
		if (skipPaths.some((pattern) => pattern.test(req.path))) {
			return next();
		}

		const startTime = Date.now();

		// Store original body if needed
		const originalBody = logBody ? JSON.parse(JSON.stringify(req.body || {})) : null;
		const originalHeaders = logHeaders ? JSON.parse(JSON.stringify(req.headers || {})) : null;

		// Create a reference to original end method
		const originalEnd = res.end;
		let responseBody: unknown;

		// Override end method to intercept and log response
		res.end = function (chunk: unknown, encoding?: BufferEncoding | (() => void), cb?: () => void): Response {
			const duration = Date.now() - startTime;

			// Store response body if request failed
			if (res.statusCode >= 400 && chunk) {
				try {
					// Convert Buffer to string if needed
					const stringChunk = Buffer.isBuffer(chunk) ? chunk.toString('utf-8') : chunk;
					responseBody = typeof stringChunk === 'string' ? JSON.parse(stringChunk) : stringChunk;
					res['responseBody'] = responseBody;
				} catch {
					// If parsing fails, store as-is but ensure it's a string
					responseBody = Buffer.isBuffer(chunk) ? chunk.toString('utf-8') : String(chunk);
					res['responseBody'] = responseBody;
				}

				// Log error response
				Logger.error('Request failed', {
					path: req.originalUrl,
					method: req.method,
					statusCode: res.statusCode,
					duration,
					errorResponse: responseBody,
					requestBody: originalBody,
					username: req.user?.username
				});
			}

			// Attach response to request for logger access
			req.res = res;

			// Log the request and its completion
			Logger.request(req, duration);

			if (logBody) {
				Logger.debug('Request details', {
					path: req.originalUrl,
					body: originalBody,
					headers: originalHeaders,
					statusCode: res.statusCode,
					responseBody: responseBody,
					username: req.user?.username
				});
			}

			return originalEnd.call(this, chunk, encoding as BufferEncoding, cb);
		};

		next();
	};
}

/**
 * Error logging middleware - should be placed after routes
 */
export function errorLoggerMiddleware() {
	return (err: Error, req: Request, res: Response, next: NextFunction) => {
		Logger.error(`Route error: ${err.message}`, {
			path: req.originalUrl,
			method: req.method,
			statusCode: res.statusCode,
			error: {
				name: err.name,
				message: err.message,
				stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
			},
			userId: req.user?.id,
			username: req.user?.username
		});

		next(err);
	};
}
