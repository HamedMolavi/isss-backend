import { Router } from 'express';
import { roleCheck } from '../../authentication/accessCheck.auth';
import * as SecurityConfigController from '../../controllers/securityConfig.controller';

const SecurityConfigRouter: Router = Router();

const route_prefix = '';

// Admin only: Get current security configuration
SecurityConfigRouter.get(`${route_prefix}`, roleCheck('admin'), SecurityConfigController.getConfig);

// Admin only: Update max concurrent sessions
SecurityConfigRouter.put(
	`${route_prefix}/max-sessions`,
	roleCheck('admin'),
	SecurityConfigController.updateMaxConcurrentSessions
);

// Admin only: Update password requirements
SecurityConfigRouter.put(
	`${route_prefix}/password-requirements`,
	roleCheck('admin'),
	SecurityConfigController.updatePasswordRequirements
);

// Admin only: Update login rate limit settings
SecurityConfigRouter.put(
	`${route_prefix}/rate-limit`,
	roleCheck('admin'),
	SecurityConfigController.updateLoginRateLimit
);

// Admin only: Update log backup settings
SecurityConfigRouter.put(
	`${route_prefix}/log-backup`,
	roleCheck('admin'),
	SecurityConfigController.updateLogBackupSettings
);

// Admin only: Update session settings
SecurityConfigRouter.put(
	`${route_prefix}/session`,
	roleCheck('admin'),
	SecurityConfigController.updateSessionSettings
);

export default SecurityConfigRouter;
