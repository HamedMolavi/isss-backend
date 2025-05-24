import { Router } from 'express';
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

const router: Router = Router();

///////////////////////////////////////////////////////////////////////////////// Credentials and authentication
router.use(
	cors({
		origin: '*',
		credentials: true
	})
);

router.use([
	cookieParser(),
	authHeaderExtraction,
	sessionMiddleware,
	passport.initialize(),
	passport.session()
]);

///////////////////////////////////////////////////////////////////////////////// Parsing & Logger
router.use(
	bodyParser.json({ limit: '50mb' }),
	bodyParser.urlencoded({
		limit: '50mb',
		extended: true
	}),
	bodyParser.text({ limit: '200mb' }),
	fileUpload(),
	flash(),
	setupLogger(),
	localVarMiddleware,
	routeLoggerMiddleware(),
	errorLoggerMiddleware()
);

export default router;
