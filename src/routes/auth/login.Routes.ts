import { Router } from 'express';
import { dtoValidationMiddleware } from '../../validation/dto';
import { LoginBodyDto } from '../../validation/dto/login.dto';
import { assignPassport, reLogin, sendTokenToclient } from '../../authentication/authorize.auth';
import { preventConcurrentSessions } from '../../middleware/concurrent-sessions.middleware';

const LoginRouter: Router = Router();

const route_prefix = '';

// Login route
LoginRouter.post(
	`${route_prefix}`,
	reLogin,
	dtoValidationMiddleware(LoginBodyDto, {
		skipMissingProperties: true,
		detailedMassage: true
	}),
	preventConcurrentSessions(), // Prevent concurrent sessions
	assignPassport,
	sendTokenToclient
);

export default LoginRouter;
