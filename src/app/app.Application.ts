import express, { Application, NextFunction, Request, Response } from 'express';
import { RegisterRoutes } from '../routes/route.registration';
import { RegisterMiddleware } from '../middleware/middleware.registration';
import { ApiError } from '../types/classes/error.class';

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

/////////////////////////////////////////////////////////////////////////////////
// MIDDLEWARE REGISTRATION
// All middleware is registered through the centralized RegisterMiddleware function
// This includes: CORS, authentication, parsing, logging, sessions, etc.
RegisterMiddleware(app);

/////////////////////////////////////////////////////////////////////////////////
// ROUTE REGISTRATION
// All routes are registered through the centralized RegisterRoutes function
// This includes: auth, config, reports, logs, system routes with proper middleware
RegisterRoutes(app);

/////////////////////////////////////////////////////////////////////////////////
// ERROR HANDLING

// 404 Handler - Catch all unmatched routes
app.use(function notFound(req: Request, _res: Response, next: NextFunction) {
	const err = new ApiError(404, `Requested path ${req.path} not found`);
	next(err);
});

// Global Error Handler - Handle all application errors
app.use(function errorHandler(err: ApiError, _req: Request, res: Response) {
	const statusCode = err.statusCode || 500;

	// Log error details (except for file not found errors)
	if (err.message !== 'File not found') {
		console.log('Error in endpoint: ', {
			success: false,
			message: err.message,
			stack: err.stack
		});
	}

	// Send error response
	return res.status(statusCode).send({
		success: false,
		message: err.message,
		stack: process.env.NODE_ENV === 'development' ? err.stack : ''
	});
});

export default app;
