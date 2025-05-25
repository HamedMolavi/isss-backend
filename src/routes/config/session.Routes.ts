import { Router } from 'express';
import { roleCheck } from '../../authentication/accessCheck.auth';
import * as SessionController from '../../controllers/session.controller';

const SessionRouter: Router = Router();

const route_prefix = '';

// Admin only: Get all active sessions
SessionRouter.get(`${route_prefix}`, roleCheck('admin'), SessionController.getAllSessions);

// Admin only: Terminate a specific session by ID
SessionRouter.delete(`${route_prefix}/:id`, roleCheck('admin'), SessionController.terminateSession);

// Admin only: Terminate all sessions except current one
SessionRouter.delete(
	`${route_prefix}/terminate/all`,
	roleCheck('admin'),
	SessionController.terminateAllSessions
);

// Admin only: Get sessions for a specific user
SessionRouter.get(`${route_prefix}/user/:userId`, roleCheck('admin'), SessionController.getUserSessions);

// User access: Get current user's own sessions
SessionRouter.get(`${route_prefix}/me`, SessionController.getCurrentUserSessions);

export default SessionRouter;
