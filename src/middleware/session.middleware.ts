import session from 'express-session';
import redisStore from '../db/redis/store.database';

/**
 * Session configuration
 */
const SESSION_CONFIG = {
	TIMEOUT: 30 * 60 * 1000 // 30 minutes
};

/**
 * Express session configuration
 */
export const sessionMiddleware = session({
	store: redisStore(),
	name: 'Bearer',
	secret: process.env['SESSION_SECRET'],
	resave: false,
	rolling: true,
	saveUninitialized: false,
	cookie: {
		maxAge: SESSION_CONFIG.TIMEOUT,
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production'
	}
});
