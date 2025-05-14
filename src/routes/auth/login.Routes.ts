import { Router, Request, Response, NextFunction } from 'express';
import { dtoValidationMiddleware } from '../../validation/dto';
import { LoginBodyDto } from '../../validation/dto/login.dto';
import { assignPassport, reLogin, sendTokenToclient } from '../../authentication/authorize.auth';
import { Logger } from '../../logger';

const router: Router = Router();
const logger = new Logger();

// Request logging middleware
router.use((req: Request, _res: Response, next: NextFunction) => {
	logger.request(req);
	next();
});

const handleUserAuthentication = (req: Request, res: Response, next: NextFunction) => {
	if (!req.user || !req.user._id) {
		logger.authEvent('unknown', 'login', false, { error: 'User not found' }, req);
		return res.status(401).json({ message: 'Authentication failed' });
	}

	logger.authEvent(req.user._id.toString(), 'login', true, {}, req);
	next();
};

router.post(
	'',
	reLogin,
	dtoValidationMiddleware(LoginBodyDto, {
		skipMissingProperties: true,
		detailedMassage: true
	}),
	assignPassport,
	handleUserAuthentication,
	sendTokenToclient
);

export default router;
