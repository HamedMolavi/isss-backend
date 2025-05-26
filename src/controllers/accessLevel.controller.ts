import { Request, Response } from 'express';
import AccessLevel from '../db/mongo/models/accessLevel';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { Logger } from '../logger';
import { objectToAuthHex } from '../tools/utils.tools';
import { accessList } from '../types/interfaces/accessLevel.interface';

/**
 * Create a new access level
 */
export const create = async (req: Request, res: Response) => {
	const payload = req.body;

	// Transform access permissions to hex format
	const transformedPayload: Record<string, unknown> = { name: payload.name };
	for (const key of accessList) {
		if (payload[key]) {
			transformedPayload[key] = objectToAuthHex(payload[key]);
		}
	}

	// Trim string values
	for (const key in transformedPayload) {
		if (Object.prototype.hasOwnProperty.call(transformedPayload, key)) {
			const element = transformedPayload[key];
			if (typeof element === 'string') transformedPayload[key] = element.trim();
		}
	}

	const doc = new AccessLevel(transformedPayload);
	const result = await doc.save().catch((err) => {
		Logger.error('Failed to create access level', {
			type: 'access_level',
			action: 'create_failed',
			userid: req.user?._id?.toString(),
			username: req.user?.username,
			details: { error: err.message, payload: transformedPayload }
		});
		return null;
	});

	if (!result) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to create access level'
		});
	}

	// Log successful access level creation
	Logger.info('Access level created successfully', {
		type: 'access_level',
		action: 'create_success',
		userid: req.user?._id?.toString(),
		username: req.user?.username,
		details: {
			accessLevelId: result._id.toString(),
			accessLevelName: result.name,
			permissions: payload
		}
	});

	req.flash('info', 'Access level added.');
	return ApiRes(res, {
		status: HttpStatus.CREATED,
		data: result.toJSON()
	});
};

/**
 * Get all access levels
 */
export const getAll = async (req: Request, res: Response) => {
	const accessLevels = await AccessLevel.find()
		.exec()
		.catch(() => null);

	return ApiRes(res, {
		status: accessLevels ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR,
		data: accessLevels
	});
};

/**
 * Get access level by ID
 */
export const getById = async (req: Request, res: Response) => {
	const id = req.params.id;
	const accessLevel = await AccessLevel.findById(id)
		.exec()
		.catch(() => null);

	if (!accessLevel) {
		req.flash('error', 'Access level not found');
		return ApiRes(res, {
			status: HttpStatus.NOT_FOUND,
			msg: 'Access level not found'
		});
	}

	return ApiRes(res, {
		status: HttpStatus.OK,
		data: accessLevel.toJSON()
	});
};

/**
 * Update access level by ID
 */
export const updateById = async (req: Request, res: Response) => {
	const id = req.params.id;
	const payload = req.body;

	// Get the current access level for logging
	const currentAccessLevel = await AccessLevel.findById(id)
		.exec()
		.catch(() => null);
	if (!currentAccessLevel) {
		req.flash('error', 'Access level not found');
		return ApiRes(res, {
			status: HttpStatus.NOT_FOUND,
			msg: 'Access level not found'
		});
	}

	// Transform access permissions to hex format
	const updateObject: Record<string, unknown> = {};
	for (const key of accessList) {
		if (payload[key] !== undefined) {
			updateObject[key] = objectToAuthHex(payload[key]);
		}
	}

	const updatedAccessLevel = await AccessLevel.findByIdAndUpdate(id, { $set: updateObject }, { new: true })
		.exec()
		.catch((err) => {
			Logger.error('Failed to update access level', {
				type: 'access_level',
				action: 'update_failed',
				userid: req.user?._id?.toString(),
				username: req.user?.username,
				details: {
					error: err.message,
					accessLevelId: id,
					accessLevelName: currentAccessLevel.name,
					updatePayload: payload
				}
			});
			return null;
		});

	if (!updatedAccessLevel) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to update access level'
		});
	}

	// Log successful access level update (role assignment change)
	Logger.info('Access level updated successfully', {
		type: 'access_level',
		action: 'update_success',
		userid: req.user?._id?.toString(),
		username: req.user?.username,
		details: {
			accessLevelId: updatedAccessLevel._id.toString(),
			accessLevelName: updatedAccessLevel.name,
			previousPermissions: currentAccessLevel.toJSON(),
			newPermissions: updatedAccessLevel.toJSON(),
			changedFields: Object.keys(payload)
		}
	});

	req.flash('info', 'Access level updated.');
	return ApiRes(res, {
		status: HttpStatus.OK,
		data: updatedAccessLevel.toJSON()
	});
};

/**
 * Delete access level by ID
 */
export const deleteById = async (req: Request, res: Response) => {
	const id = req.params.id;

	// Get the access level before deletion for logging
	const accessLevelToDelete = await AccessLevel.findById(id)
		.exec()
		.catch(() => null);
	if (!accessLevelToDelete) {
		req.flash('error', 'Access level not found');
		return ApiRes(res, {
			status: HttpStatus.NOT_FOUND,
			msg: 'Access level not found'
		});
	}

	const deletedAccessLevel = await AccessLevel.findByIdAndDelete(id)
		.exec()
		.catch((err) => {
			Logger.error('Failed to delete access level', {
				type: 'access_level',
				action: 'delete_failed',
				userid: req.user?._id?.toString(),
				username: req.user?.username,
				details: {
					error: err.message,
					accessLevelId: id,
					accessLevelName: accessLevelToDelete.name
				}
			});
			return null;
		});

	if (!deletedAccessLevel) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to delete access level'
		});
	}

	// Log successful access level deletion
	Logger.info('Access level deleted successfully', {
		type: 'access_level',
		action: 'delete_success',
		userid: req.user?._id?.toString(),
		username: req.user?.username,
		details: {
			accessLevelId: deletedAccessLevel._id.toString(),
			accessLevelName: deletedAccessLevel.name,
			deletedPermissions: deletedAccessLevel.toJSON()
		}
	});

	return ApiRes(res, {
		status: HttpStatus.NO_CONTENT,
		data: deletedAccessLevel
	});
};
