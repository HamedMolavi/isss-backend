import { Router } from 'express';
import { dtoValidationMiddleware } from '../../validation/dto';
import { LoginBodyDto } from '../../validation/dto/login.dto';
import { assignPassport, sendTokenToclient } from '../../authentication/authorize.auth';
import { preventConcurrentSessions } from '../../middleware/concurrent-sessions.middleware';
import { LoginRateLimiter } from '../../middleware/login-rate-limit.middleware';
import { checkIPRestriction } from '../../middleware/ip-restriction.middleware';

const LoginRouter: Router = Router();

const route_prefix = '';

// Login route
LoginRouter.post(
	`${route_prefix}`,
	dtoValidationMiddleware(LoginBodyDto, {
		skipMissingProperties: true,
		detailedMassage: true
	}),
	LoginRateLimiter.checkRateLimit(), // Check rate limits first
	preventConcurrentSessions(), // Prevent concurrent sessions
	assignPassport,
	checkIPRestriction, // Check IP restrictions
	LoginRateLimiter.recordAttempt(), // Record the attempt after authentication
	sendTokenToclient
);

export default LoginRouter;
