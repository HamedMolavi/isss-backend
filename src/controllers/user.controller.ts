import { Request, Response } from 'express';
import User from '../db/mongo/models/user';
import { Types } from 'mongoose';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';

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
	const result = await doc.save().catch(() => null);

	if (!result) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR
		});
	}

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
	const query = search ? { username: { $regex: search, $options: 'i' } } : {};

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

	// Handle camera_access conversion
	if (payload.camera_access) {
		payload.camera_access = payload.camera_access.map((str: string) => new Types.ObjectId(str));
	}

	const user = await User.findByIdAndUpdate(id, payload, { new: true })
		.exec()
		.catch(() => null);

	if (!user) {
		req.flash('error', 'User not found');
		return ApiRes(res, {
			status: HttpStatus.NOT_FOUND,
			msg: 'User not found'
		});
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
	const user = await User.findByIdAndDelete(id)
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
		status: HttpStatus.NO_CONTENT,
		data: user
	});
};

/**
 * Update user password (temporary route - should be removed)
 */
export const updatePassword = async (req: Request, res: Response) => {
	const user = req.user;
	if (!user) {
		return ApiRes(res, {
			status: HttpStatus.UNAUTHORIZED,
			msg: 'Login first!'
		});
	}

	if (!req?.body?.current_password) {
		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'current password is required'
		});
	}

	if (!req?.body?.new_password) {
		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'new password is required!'
		});
	}

	const userInfo = await User.findById(user?._id)
		.exec()
		.catch(() => null);
	if (!userInfo) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR
		});
	}

	const isMatch = userInfo?.checkPassword(req?.body?.current_password);
	if (!isMatch) {
		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'password is not correct'
		});
	}

	const updateResult = await User.updateOne(
		{ _id: user._id },
		{ $set: { password: req.body.new_password } },
		{ new: true, overwrite: true }
	)
		.exec()
		.catch(() => null);

	return ApiRes(res, {
		status: updateResult ? HttpStatus.CREATED : HttpStatus.INTERNAL_SERVER_ERROR,
		data: updateResult ? user : undefined
	});
};
