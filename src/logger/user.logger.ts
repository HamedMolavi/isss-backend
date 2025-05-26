import { Request } from 'express';
import { Logger } from '.';

/**
 * User management event types
 */
export enum UserEventType {
	USER_CREATED = 'user_created',
	USER_CREATE_FAILED = 'user_create_failed',
	USER_UPDATED = 'user_updated',
	USER_UPDATE_FAILED = 'user_update_failed',
	USER_DELETED = 'user_deleted',
	USER_DELETE_FAILED = 'user_delete_failed',
	ROLE_ASSIGNED = 'role_assigned',
	ROLE_ASSIGNMENT_FAILED = 'role_assignment_failed',
	ACCESS_LEVEL_ASSIGNED = 'access_level_assigned',
	ACCESS_LEVEL_ASSIGNMENT_FAILED = 'access_level_assignment_failed',
	PERMISSION_CHECK_SUCCESS = 'permission_check_success',
	PERMISSION_CHECK_FAILED = 'permission_check_failed'
}

/**
 * User management logger
 */
export class UserLogger {
	private static createBaseLogData(
		req: Request,
		action: string,
		success: boolean,
		type: string = 'user_management'
	) {
		return {
			type,
			action,
			success,
			userid: req.user?._id?.toString(),
			username: req.user?.username,
			ip: req.ip || req.socket.remoteAddress || 'unknown',
			userAgent: req.get('User-Agent') || 'unknown',
			method: req.method,
			url: req.originalUrl,
			timestamp: new Date()
		};
	}

	/**
	 * Log successful user creation
	 */
	static userCreated(
		req: Request,
		newUser: { _id: string; username: string; role: string; access_level: string }
	): void {
		Logger.info('User created successfully', {
			...this.createBaseLogData(req, UserEventType.USER_CREATED, true),
			details: {
				newUserId: newUser._id,
				newUsername: newUser.username,
				assignedRole: newUser.role,
				assignedAccessLevel: newUser.access_level,
				createdBy: req.user?.username
			}
		});
	}

	/**
	 * Log failed user creation
	 */
	static userCreateFailed(req: Request, error: string, userData?: Record<string, unknown>): void {
		Logger.error('User creation failed', {
			...this.createBaseLogData(req, UserEventType.USER_CREATE_FAILED, false),
			details: {
				error,
				attemptedUserData: userData,
				attemptedBy: req.user?.username
			}
		});
	}

	/**
	 * Log successful role assignment
	 */
	static roleAssigned(
		req: Request,
		targetUser: { _id: string; username: string },
		oldRole: string,
		newRole: string
	): void {
		Logger.info('User role assigned successfully', {
			...this.createBaseLogData(req, UserEventType.ROLE_ASSIGNED, true),
			details: {
				targetUserId: targetUser._id,
				targetUsername: targetUser.username,
				previousRole: oldRole,
				newRole: newRole,
				assignedBy: req.user?.username
			}
		});
	}

	/**
	 * Log failed role assignment
	 */
	static roleAssignmentFailed(
		req: Request,
		targetUserId: string,
		error: string,
		attemptedRole?: string
	): void {
		Logger.error('User role assignment failed', {
			...this.createBaseLogData(req, UserEventType.ROLE_ASSIGNMENT_FAILED, false),
			details: {
				targetUserId,
				attemptedRole,
				error,
				attemptedBy: req.user?.username
			}
		});
	}

	/**
	 * Log successful access level assignment
	 */
	static accessLevelAssigned(
		req: Request,
		targetUser: { _id: string; username: string },
		oldAccessLevel: string,
		newAccessLevel: string
	): void {
		Logger.info('User access level assigned successfully', {
			...this.createBaseLogData(req, UserEventType.ACCESS_LEVEL_ASSIGNED, true),
			details: {
				targetUserId: targetUser._id,
				targetUsername: targetUser.username,
				previousAccessLevel: oldAccessLevel,
				newAccessLevel: newAccessLevel,
				assignedBy: req.user?.username
			}
		});
	}

	/**
	 * Log successful permission check
	 */
	static permissionCheckSuccess(req: Request, permission: string, resource: string, action: string): void {
		Logger.info('Permission check passed', {
			...this.createBaseLogData(req, UserEventType.PERMISSION_CHECK_SUCCESS, true, 'permission_check'),
			details: {
				permission,
				resource,
				requestedAction: action,
				userRole: req.user?.role
			}
		});
	}

	/**
	 * Log failed permission check
	 */
	static permissionCheckFailed(
		req: Request,
		permission: string,
		resource: string,
		action: string,
		reason?: string
	): void {
		Logger.warn('Permission check failed', {
			...this.createBaseLogData(req, UserEventType.PERMISSION_CHECK_FAILED, false, 'permission_check'),
			details: {
				permission,
				resource,
				requestedAction: action,
				userRole: req.user?.role,
				reason: reason || 'Insufficient permissions'
			}
		});
	}

	/**
	 * Log user update
	 */
	static userUpdated(
		req: Request,
		targetUser: { _id: string; username: string },
		updatedFields: string[],
		changes?: Record<string, { old: unknown; new: unknown }>
	): void {
		Logger.info('User updated successfully', {
			...this.createBaseLogData(req, UserEventType.USER_UPDATED, true),
			details: {
				targetUserId: targetUser._id,
				targetUsername: targetUser.username,
				updatedFields,
				changes,
				updatedBy: req.user?.username
			}
		});
	}

	/**
	 * Log user deletion
	 */
	static userDeleted(req: Request, deletedUser: { _id: string; username: string; role: string }): void {
		Logger.info('User deleted successfully', {
			...this.createBaseLogData(req, UserEventType.USER_DELETED, true),
			details: {
				deletedUserId: deletedUser._id,
				deletedUsername: deletedUser.username,
				deletedUserRole: deletedUser.role,
				deletedBy: req.user?.username
			}
		});
	}
}
