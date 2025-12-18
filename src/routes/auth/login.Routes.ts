import { Router } from 'express';
import { dtoValidationMiddleware } from '../../validation/dto';
import { LoginBodyDto } from '../../validation/dto/login.dto';
import { assignPassport, sendTokenToclient } from '../../authentication/authorize.auth';
import { preventConcurrentSessions } from '../../middleware/concurrent-sessions.middleware';
import { LoginRateLimiter } from '../../middleware/login-rate-limit.middleware';
import { checkIPRestriction } from '../../middleware/ip-restriction.middleware';
import { generateLoginCaptcha, validateLoginCaptcha } from '../../middleware/captcha.middleware';

const LoginRouter: Router = Router();

const route_prefix = '';

// Fetch login captcha
LoginRouter.get(`${route_prefix}/captcha`, generateLoginCaptcha);

// Login route
LoginRouter.post(
	`${route_prefix}`,
	dtoValidationMiddleware(LoginBodyDto, {
		skipMissingProperties: false,
		detailedMassage: false,
		info: 'Invalid login credentials'
	}),
	LoginRateLimiter.checkRateLimit(), // Check rate limits first
	validateLoginCaptcha, // Ensure captcha is valid
	preventConcurrentSessions(), // Prevent concurrent sessions
	assignPassport,
	checkIPRestriction, // Check IP restrictions
	LoginRateLimiter.recordAttempt(), // Record the attempt after authentication
	sendTokenToclient
);

export default LoginRouter;
