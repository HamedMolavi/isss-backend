import { Router } from 'express';
import { accessCheck } from '../../authentication/accessCheck.auth';
import * as UserIntegrityController from '../../controllers/userIntegrity.controller';

const UserIntegrityRouter: Router = Router();

const route_prefix = '';

/**
 * GET /api/config/user-integrity/verify
 * Verify integrity of usernames (all users or specific count)
 * Query params: count (optional, default: all users, max: 10000)
 */
UserIntegrityRouter.get(
	`${route_prefix}/verify`,
	accessCheck('system'), // Require system access for integrity operations
	UserIntegrityController.verifyUsernamesIntegrity
);

/**
 * GET /api/config/user-integrity/check/:userId
 * Check if a specific user's username has been modified
 */
UserIntegrityRouter.get(
	`${route_prefix}/check/:userId`,
	accessCheck('system'), // Require system access for integrity operations
	UserIntegrityController.checkUsernameModification
);

/**
 * GET /api/config/user-integrity/status
 * Get user integrity service status
 */
UserIntegrityRouter.get(
	`${route_prefix}/status`,
	accessCheck('system'), // Require system access for integrity operations
	UserIntegrityController.getUserIntegrityStatus
);

export default UserIntegrityRouter;
