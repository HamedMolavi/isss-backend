import { Router } from 'express';
import { dtoValidationMiddleware } from '../../validation/dto';
import { LoginBodyDto } from '../../validation/dto/login.dto';
import { assignPassport, sendTokenToclient } from '../../authentication/authorize.auth';
import * as AuthController from '../../controllers/auth.controller';

const LoginRouter: Router = Router();

const route_prefix = '';

// Login route
LoginRouter.post(
	`${route_prefix}`,
	dtoValidationMiddleware(LoginBodyDto, {
		skipMissingProperties: true,
		detailedMassage: true
	}),
	assignPassport,
	AuthController.handleUserAuthentication,
	sendTokenToclient
);

export default LoginRouter;
