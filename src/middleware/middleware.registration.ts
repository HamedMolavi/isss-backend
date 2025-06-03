import { Application, Request, NextFunction, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import flash from 'connect-flash';
import passport from 'passport';
import fileUpload from 'express-fileupload';
import localVarMiddleware from './localVar.middleware';
import { setupLogger } from './logger.middleware';
import { sessionMiddleware } from './session.middleware';
import { authHeaderExtraction } from './auth.middleware';
import { errorLoggerMiddleware, routeLoggerMiddleware } from './routeLogger.middleware';
import { registerSecurityMiddleware } from './security.middleware';
import { BaseConfig } from '../config/base.config';
import { verifyLogIntegrityMiddleware } from './logIntegrity.middleware';

export function RegisterMiddleware(app: Application) {
	// Register security middleware
	registerSecurityMiddleware(app);

	///////////////////////////////////////////////////////////////////////////////// Credentials and authentication

	// CORS - Cross-Origin Resource Sharing configuration
	// Allows requests from any origin with credentials
	app.use(
		cors({
			origin: '*',
			credentials: true
		})
	);

	// Cookie Parser - Parses cookies attached to the client request object
	app.use(cookieParser());

	// Auth Header Extraction - Extracts Bearer token from Authorization header to cookies
	app.use(authHeaderExtraction);

	// Session Middleware - Redis-based session management with 30min timeout
	app.use(sessionMiddleware);

	// Passport Initialize - Initialize Passport authentication middleware
	app.use(passport.initialize());

	// Passport Session - Enable persistent login sessions
	app.use(passport.session());

	///////////////////////////////////////////////////////////////////////////////// Parsing & Logger

	// Body Parser JSON - Parse JSON payloads up to 50mb
	app.use(bodyParser.json({ limit: '50mb' }));

	// Body Parser URL-encoded - Parse URL-encoded payloads up to 50mb
	app.use(
		bodyParser.urlencoded({
			limit: '50mb',
			extended: true
		})
	);

	// Body Parser Text - Parse text payloads up to 200mb
	app.use(bodyParser.text({ limit: '200mb' }));

	// File Upload - Handle multipart/form-data file uploads
	app.use(fileUpload());

	// Flash Messages - Enable flash messaging for user feedback
	app.use(flash());

	// Logger Setup - Initialize Winston logger for the application
	app.use(setupLogger());

	// Local Variables - Set up response locals and timezone handling
	app.use(localVarMiddleware);

	// Route Logger - Log all incoming requests and responses
	app.use(routeLoggerMiddleware());

	// Log Integrity Verification - Verify log integrity for GET requests
	app.use(verifyLogIntegrityMiddleware);

	// Error Logger - Log application errors
	app.use(errorLoggerMiddleware());

	// Custom API middleware for versioned routes (if needed for future enhancements)
	app.use(`${BaseConfig.API_PREFIX}/*`, (req: Request, res: Response, next: NextFunction) => {
		// Add any custom API middleware logic here
		// For example: API key validation, request logging, etc.
		next();
	});
}
