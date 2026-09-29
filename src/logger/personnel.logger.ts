import { Request } from 'express';
import { Logger } from '.';
import { getClientIP } from '../tools/util.tools';
import { sanitizeUserAgent } from '../tools/user_agent.utility';

/**
 * Personnel management event types
 */
export enum PersonnelEventType {
	PERSONNEL_CREATED = 'personnel_created',
	PERSONNEL_CREATE_FAILED = 'personnel_create_failed',
	PERSONNEL_UPDATED = 'personnel_updated',
	PERSONNEL_UPDATE_FAILED = 'personnel_update_failed',
	PERSONNEL_DELETED = 'personnel_deleted',
	PERSONNEL_DELETE_FAILED = 'personnel_delete_failed'
}

/**
 * Personnel management logger
 */
export class PersonnelLogger {
	private static createBaseLogData(
		req: Request,
		action: string,
		success: boolean,
		type: string = 'personnel_management'
	) {
		return {
			type,
			action,
			success,
			userid: req.user?._id?.toString(),
			username: req.user?.username,
			ip: getClientIP(req) || 'unknown',
			userAgent: sanitizeUserAgent(req.get('User-Agent')),
			method: req.method,
			url: req.originalUrl,
			timestamp: new Date()
		};
	}

	/**
	 * Log successful personnel creation
	 */
	static personnelCreated(req: Request, newPersonnel: { _id: string; name: string; role: string }): void {
		Logger.info('Personnel created successfully', {
			...this.createBaseLogData(req, PersonnelEventType.PERSONNEL_CREATED, true),
			details: {
				newPersonnelId: newPersonnel._id,
				newPersonnelName: newPersonnel.name,
				assignedRole: newPersonnel.role,
				createdBy: req.user?.username
			}
		});
	}

	/**
	 * Log failed personnel creation
	 */
	static personnelCreateFailed(req: Request, error: string, personnelData?: Record<string, unknown>): void {
		Logger.error('Personnel creation failed', {
			...this.createBaseLogData(req, PersonnelEventType.PERSONNEL_CREATE_FAILED, false),
			details: {
				error,
				attemptedPersonnelData: personnelData,
				attemptedBy: req.user?.username
			}
		});
	}

	/**
	 * Log personnel update
	 */
	static personnelUpdated(
		req: Request,
		targetPersonnel: { _id: string; name: string },
		updatedFields: string[],
		changes?: Record<string, { old: unknown; new: unknown }>
	): void {
		Logger.info('Personnel updated successfully', {
			...this.createBaseLogData(req, PersonnelEventType.PERSONNEL_UPDATED, true),
			details: {
				targetPersonnelId: targetPersonnel._id,
				targetPersonnelName: targetPersonnel.name,
				updatedFields,
				changes,
				updatedBy: req.user?.username
			}
		});
	}

	/**
	 * Log personnel deletion
	 */
	static personnelDeleted(req: Request, deletedPersonnel: { _id: string; name: string; role: string }): void {
		Logger.info('Personnel deleted successfully', {
			...this.createBaseLogData(req, PersonnelEventType.PERSONNEL_DELETED, true),
			details: {
				deletedPersonnelId: deletedPersonnel._id,
				deletedPersonnelName: deletedPersonnel.name,
				deletedPersonnelRole: deletedPersonnel.role,
				deletedBy: req.user?.username
			}
		});
	}
}
