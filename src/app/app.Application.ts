import express, { Application, NextFunction, Request, Response } from 'express';
import { RegisterRoutes } from '../routes/route.registration';
import { RegisterMiddleware } from '../middleware/middleware.registration';
import { ApiError } from '../types/classes/error.class';

type ExpressLayer = {
	name?: string;
	path?: string;
	route?: {
		methods: Record<string, boolean>;
	};
	handle?: {
		stack?: ExpressLayer[];
	};
	match(path: string): boolean;
};

function findAllowedMethods(stack: ExpressLayer[], path: string): Set<string> {
	const allowedMethods = new Set<string>();

	for (const layer of stack) {
		if (!layer.match(path)) continue;

		if (layer.route) {
			for (const [method, enabled] of Object.entries(layer.route.methods)) {
				if (enabled) allowedMethods.add(method.toUpperCase());
			}
			continue;
		}

		if (layer.name === 'router' && layer.handle?.stack) {
			const matchedPrefix = layer.path ?? '';
			const nestedPath = path.slice(matchedPrefix.length) || '/';
			for (const method of findAllowedMethods(layer.handle.stack, nestedPath)) {
				allowedMethods.add(method);
			}
		}
	}

	// Express automatically handles HEAD requests for GET routes.
	if (allowedMethods.has('GET')) allowedMethods.add('HEAD');

	return allowedMethods;
}

/**
 * Express Application Setup
 *
 * This application uses a centralized registration pattern for both middleware and routes:
 * - RegisterMiddleware: Centralized middleware registration (auth, parsing, logging, etc.)
 * - RegisterRoutes: Centralized route registration (auth, config, reports, logs, system)
 *
 * All routes are prefixed with /api/v1 as defined in BaseConfig
 */

// Create Express application instance
const app: Application = express();
app.set('json limit', '600mb');
// Explicitly disable trust proxy to avoid using X-Forwarded-* for IPs
app.set('trust proxy', false);

/////////////////////////////////////////////////////////////////////////////////
// APPLICATION INITIALIZATION
// Async function to properly initialize middleware and routes
export async function initializeApp(): Promise<Application> {
	// MIDDLEWARE REGISTRATION
	// All middleware is registered through the centralized RegisterMiddleware function
	// This includes: CORS, authentication, parsing, logging, sessions, etc.
	await RegisterMiddleware(app);

	// ROUTE REGISTRATION
	// All routes are registered through the centralized RegisterRoutes function
	// This includes: auth, config, reports, logs, system routes with proper middleware
	RegisterRoutes(app);

	/////////////////////////////////////////////////////////////////////////////////
	// ERROR HANDLING (must be registered AFTER routes)

	// Distinguish an unknown method on a known route (405) from an unknown route (404).
	app.use(function notFound(req: Request, _res: Response, next: NextFunction) {
		const routerStack = (app as Application & { _router?: { stack: ExpressLayer[] } })._router?.stack ?? [];
		const allowedMethods = findAllowedMethods(routerStack, req.path);

		if (allowedMethods.size > 0 && !allowedMethods.has(req.method.toUpperCase())) {
			_res.set('Allow', [...allowedMethods].sort().join(', '));
			return next(new ApiError(405, `Method ${req.method} not allowed for requested path ${req.path}`));
		}

		const err = new ApiError(404, `Requested path ${req.path} not found`);
		return next(err);
	});

	// Global Error Handler - Handle all application errors
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	app.use(function errorHandler(err: ApiError, _req: Request, res: Response, _next: NextFunction) {
		const statusCode = err.statusCode || 500;

		// Log error details internally (except for file not found errors)
		if (err.message !== 'File not found') {
			console.error('Error in endpoint:', err.message);
			// Only log stack trace to console in development
			if (process.env.NODE_ENV === 'development') {
				console.error('Stack:', err.stack);
			}
		}

		// Sanitize error message - remove sensitive information
		let safeMessage = 'An error occurred';

		// Only show specific error messages for client errors (4xx)
		if (statusCode >= 400 && statusCode < 500) {
			// Filter out sensitive information from error messages
			const sensitivePatterns = [
				/mongodb/i,
				/mongoose/i,
				/redis/i,
				/postgres/i,
				/mysql/i,
				/sql/i,
				/database/i,
				/connection/i,
				/ECONNREFUSED/i,
				/ETIMEDOUT/i,
				/at\s+\w+\s+\(/i, // Stack trace pattern
				/node_modules/i,
				/internal/i,
				/\.js:\d+:\d+/i // File path pattern
			];

			const containsSensitiveInfo = sensitivePatterns.some((pattern) => pattern.test(err.message));

			if (!containsSensitiveInfo) {
				safeMessage = err.message;
			}
		}

		// Send sanitized error response - NEVER include stack trace
		return res.status(statusCode).json({
			success: false,
			status: statusCode,
			msg: safeMessage
		});
	});

	return app;
}

export default app;
