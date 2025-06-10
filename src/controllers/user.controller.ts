import { Request, Response } from 'express';
import User from '../db/mongo/models/user';
import { Types, FilterQuery } from 'mongoose';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { UserLogger } from '../logger/user.logger';
import { getSessionManager } from '../services/session.service';
import { IUserDocument } from '../types/interfaces/user.interface';

/**
 * Create a new user
 */
export const create = async (req: Request, res: Response) => {
	const payload = req.body;
	// trim string based values
	for (const key in payload) {
		if (Object.prototype.hasOwnProperty.call(payload, key)) {
			const element = payload[key];
			if (typeof element === 'string') payload[key] = element.trim();
		}
	}

	const doc = new User(payload);
	const result = await doc.save().catch((err) => {
		UserLogger.userCreateFailed(req, err.message, payload);
		return null;
	});

	if (!result) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to create user'
		});
	}

	// Log successful user creation with role assignment
	UserLogger.userCreated(req, {
		_id: result._id.toString(),
		username: result.username,
		role: result.role,
		access_level: result.access_level.toString()
	});

	req.flash('info', `User added.`);
	return ApiRes(res, {
		status: HttpStatus.CREATED,
		data: result.toJSON()
	});
};

/**
 * Get all users with search functionality
 */
export const getAll = async (req: Request, res: Response) => {
	const search = (req.query.search as string) || '';
	const includeInactive = req.query.includeInactive === 'true';

	// Build base query
	const query: FilterQuery<IUserDocument> = {};

	// Add search filter if provided
	if (search) {
		query.username = { $regex: search, $options: 'i' };
	}

	// Show active users by default, include inactive if requested
	if (!includeInactive) {
		query.is_active = true;
	}

	const users = await User.find(query)
		.populate('access_level')
		.exec()
		.catch(() => null);

	return ApiRes(res, {
		status: users ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR,
		data: users
	});
};

/**
 * Get user by ID
 */
export const getById = async (req: Request, res: Response) => {
	const id = req.params.id;
	const user = await User.findById(id)
		.populate('access_level')
		.exec()
		.catch(() => null);

	if (!user) {
		req.flash('error', 'User not found');
		return ApiRes(res, {
			status: HttpStatus.NOT_FOUND,
			msg: 'User not found'
		});
	}

	return ApiRes(res, {
		status: HttpStatus.OK,
		data: user.toJSON()
	});
};

/**
 * Update user by ID
 */
export const updateById = async (req: Request, res: Response) => {
	const id = req.params.id;
	const payload = req.body;

	// Get the current user for logging changes
	const currentUser = await User.findById(id)
		.exec()
		.catch(() => null);
	if (!currentUser) {
		req.flash('error', 'User not found');
		return ApiRes(res, {
			status: HttpStatus.NOT_FOUND,
			msg: 'User not found'
		});
	}

	// Handle camera_access conversion
	if (payload.camera_access) {
		payload.camera_access = payload.camera_access.map((str: string) => new Types.ObjectId(str));
	}

	// Track changes for logging
	const changes: Record<string, { old: unknown; new: unknown }> = {};
	const updatedFields: string[] = [];

	Object.keys(payload).forEach((key) => {
		if (payload[key] !== undefined && payload[key] !== currentUser[key as keyof typeof currentUser]) {
			changes[key] = {
				old: currentUser[key as keyof typeof currentUser],
				new: payload[key]
			};
			updatedFields.push(key);
		}
	});

	const user = await User.findByIdAndUpdate(id, payload, { new: true })
		.exec()
		.catch((err) => {
			UserLogger.roleAssignmentFailed(req, id, err.message, payload.role);
			return null;
		});

	if (!user) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to update user'
		});
	}

	// Log role assignment if role was changed
	if (payload.role && payload.role !== currentUser.role) {
		UserLogger.roleAssigned(
			req,
			{
				_id: user._id.toString(),
				username: user.username
			},
			currentUser.role,
			payload.role
		);
	}

	// Log access level assignment if access_level was changed
	if (payload.access_level && payload.access_level !== currentUser.access_level?.toString()) {
		UserLogger.accessLevelAssigned(
			req,
			{
				_id: user._id.toString(),
				username: user.username
			},
			currentUser.access_level?.toString() || 'none',
			payload.access_level.toString()
		);
	}

	// Log general user update
	if (updatedFields.length > 0) {
		UserLogger.userUpdated(
			req,
			{
				_id: user._id.toString(),
				username: user.username
			},
			updatedFields,
			changes
		);
	}

	// Terminate all user sessions except current one if username was changed
	if (payload.username && payload.username !== currentUser.username) {
		try {
			const sessionManager = await getSessionManager();
			await sessionManager.terminateUserSessions(user._id.toString(), req.sessionID);
		} catch (error) {
			// Log error but don't fail the user update
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.error(
				`Failed to terminate sessions for user ${user._id} after username update: ${errorMessage}`
			);
		}
	}

	req.flash('info', 'User updated.');
	return ApiRes(res, {
		status: HttpStatus.OK,
		data: user.toJSON()
	});
};

/**
 * Delete user by ID
 */
export const deleteById = async (req: Request, res: Response) => {
	const id = req.params.id;

	// Get user before deletion for logging
	const userToDelete = await User.findById(id)
		.exec()
		.catch(() => null);
	if (!userToDelete) {
		req.flash('error', 'User not found');
		return ApiRes(res, {
			status: HttpStatus.NOT_FOUND,
			msg: 'User not found'
		});
	}

	const user = await User.findByIdAndDelete(id)
		.exec()
		.catch(() => null);

	if (!user) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to delete user'
		});
	}

	// Log successful user deletion
	UserLogger.userDeleted(req, {
		_id: user._id.toString(),
		username: user.username,
		role: user.role
	});

	// Terminate all user sessions since user is being deleted
	try {
		const sessionManager = await getSessionManager();
		await sessionManager.terminateUserSessions(user._id.toString());
	} catch (error) {
		// Log error but don't fail the user deletion
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error(`Failed to terminate sessions for deleted user ${user._id}: ${errorMessage}`);
	}

	return ApiRes(res, {
		status: HttpStatus.NO_CONTENT,
		data: user
	});
};

/**
 * Update user password
 */
export const updatePassword = async (req: Request, res: Response) => {
	const user = req.user;
	if (!user) {
		return ApiRes(res, {
			status: HttpStatus.UNAUTHORIZED,
			msg: 'Authentication required'
		});
	}

	// Check if new password is same as current password
	if (req.body.current_password === req.body.new_password) {
		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'New password must be different from current password'
		});
	}

	const userInfo = await User.findById(user?._id)
		.exec()
		.catch((err) => {
			UserLogger.userPasswordUpdateFailed(req, user._id.toString(), err.message);
			return null;
		});

	if (!userInfo) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to retrieve user information'
		});
	}

	// Verify current password
	const isMatch = await userInfo.checkPassword(req.body.current_password);
	if (!isMatch) {
		UserLogger.userPasswordUpdateFailed(req, user._id.toString(), 'Invalid current password');
		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'Current password is incorrect'
		});
	}

	// Update password
	const updateResult = await User.updateOne(
		{ _id: user._id },
		{ $set: { password: req.body.new_password } },
		{ new: true }
	)
		.exec()
		.catch((err) => {
			UserLogger.userPasswordUpdateFailed(req, user._id.toString(), err.message);
			return null;
		});

	if (!updateResult || updateResult.modifiedCount === 0) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to update password'
		});
	}

	// Log successful password update
	UserLogger.userPasswordUpdated(req, {
		_id: user._id.toString(),
		username: userInfo.username
	});

	// Terminate all other user sessions except current one
	try {
		const sessionManager = await getSessionManager();
		await sessionManager.terminateUserSessions(user._id.toString(), req.sessionID);
	} catch (error) {
		// Log error but don't fail the password update
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		UserLogger.userPasswordUpdateFailed(
			req,
			user._id.toString(),
			`Failed to terminate sessions: ${errorMessage}`
		);
	}

	return ApiRes(res, {
		status: HttpStatus.OK,
		msg: 'Password updated successfully. All other sessions have been terminated.'
	});
};

/**
 * Activate user by ID
 */
export const activateUser = async (req: Request, res: Response) => {
	const id = req.params.id;

	// Check if user exists
	const existingUser = await User.findById(id)
		.exec()
		.catch(() => null);
	if (!existingUser) {
		req.flash('error', 'User not found');
		return ApiRes(res, {
			status: HttpStatus.NOT_FOUND,
			msg: 'User not found'
		});
	}

	// Check if user is already active
	if (existingUser.is_active) {
		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'User is already active'
		});
	}

	// Activate user
	const user = await User.findByIdAndUpdate(id, { is_active: true }, { new: true })
		.exec()
		.catch((err) => {
			console.error('Failed to activate user:', err.message);
			return null;
		});

	if (!user) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to activate user'
		});
	}

	// Log user activation
	UserLogger.userUpdated(
		req,
		{
			_id: user._id.toString(),
			username: user.username
		},
		['is_active'],
		{
			is_active: { old: false, new: true }
		}
	);

	req.flash('info', 'User activated successfully.');
	return ApiRes(res, {
		status: HttpStatus.OK,
		data: user.toJSON(),
		msg: 'User activated successfully'
	});
};

/**
 * Deactivate user by ID
 */
export const deactivateUser = async (req: Request, res: Response) => {
	const id = req.params.id;

	// Prevent self-deactivation
	if (req.user?._id.toString() === id) {
		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'You cannot deactivate your own account'
		});
	}

	// Check if user exists
	const existingUser = await User.findById(id)
		.exec()
		.catch(() => null);
	if (!existingUser) {
		req.flash('error', 'User not found');
		return ApiRes(res, {
			status: HttpStatus.NOT_FOUND,
			msg: 'User not found'
		});
	}

	// Check if user is already inactive
	if (!existingUser.is_active) {
		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'User is already inactive'
		});
	}

	// Deactivate user
	const user = await User.findByIdAndUpdate(id, { is_active: false }, { new: true })
		.exec()
		.catch((err) => {
			console.error('Failed to deactivate user:', err.message);
			return null;
		});

	if (!user) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to deactivate user'
		});
	}

	// Log user deactivation
	UserLogger.userUpdated(
		req,
		{
			_id: user._id.toString(),
			username: user.username
		},
		['is_active'],
		{
			is_active: { old: true, new: false }
		}
	);

	// Terminate all user sessions since user is being deactivated
	try {
		const sessionManager = await getSessionManager();
		await sessionManager.terminateUserSessions(user._id.toString());
	} catch (error) {
		// Log error but don't fail the deactivation
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error(`Failed to terminate sessions for deactivated user ${user._id}: ${errorMessage}`);
	}

	req.flash('info', 'User deactivated successfully.');
	return ApiRes(res, {
		status: HttpStatus.OK,
		data: user.toJSON(),
		msg: 'User deactivated successfully'
	});
};
