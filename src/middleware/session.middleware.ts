import session from 'express-session';
import redisStore from '../db/redis/store.database';
import { SecurityConfigDefault } from '../config/security.config';

/**
 * Express session configuration
 */
export const sessionMiddleware = session({
	store: redisStore(),
	name: SecurityConfigDefault.SESSION.NAME,
	secret: process.env['SESSION_SECRET'],
	resave: false,
	rolling: true,
	saveUninitialized: false,
	proxy: false, // Do not trust reverse proxies; rely on direct connection info
	cookie: {
		maxAge: SecurityConfigDefault.SESSION.TIMEOUT,
		httpOnly: SecurityConfigDefault.SESSION.COOKIE.HTTP_ONLY,
		secure: SecurityConfigDefault.SESSION.COOKIE.SECURE,
		sameSite: SecurityConfigDefault.SESSION.COOKIE.SAME_SITE,
		path: SecurityConfigDefault.SESSION.COOKIE.PATH
	}
});
