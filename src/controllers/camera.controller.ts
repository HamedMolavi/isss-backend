import { Request, Response } from 'express';
import Camera from '../db/mongo/models/camera';
import User from '../db/mongo/models/user';
import Personnel from '../db/mongo/models/personnel';
import Car from '../db/mongo/models/car';
import Schedule from '../db/mongo/models/schedule';
import ModelToCamera from '../db/mongo/models/modelToCamera';
import mongoose, { Document, Types } from 'mongoose';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { ICamera } from '../types/interfaces/camera.interface';
import { IUser } from '../types/interfaces/user.interface';

/**
 * Create a new camera
 */
export const create = async (req: Request, res: Response) => {
	try {
		const payload = req.body;

		// Create camera
		const doc = new Camera({
			section_id: payload.section_id,
			nvr: payload.nvr,
			ip: payload.ip,
			name: payload.name,
			username: payload.username,
			password: payload.password,
			network: payload.network,
			is_enabled: payload.is_enabled,
			camera_type: payload.camera_type,
			url: payload.url
		});

		const result = await doc.save();

		// Update user camera access
		const user = (await User.findById(req.user._id).exec()) as IUser & Required<{ _id: Types.ObjectId }>;
		const accessedCameras = user.camera_access ?? [];
		accessedCameras.push(result._id);

		await User.findOneAndUpdate(
			req.user._id,
			{ $set: { camera_access: accessedCameras } },
			{ new: true, overwrite: true }
		);

		return ApiRes(res, {
			status: HttpStatus.CREATED,
			data: result.toJSON()
		});
	} catch {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to create camera'
		});
	}
};

/**
 * Get camera info for stream
 */
export const getCameraInfo = async (req: Request, res: Response) => {
	// This will be handled by testCameraMiddleware
	// Implementation depends on your testCameraMiddleware logic
	return ApiRes(res, {
		status: HttpStatus.OK,
		data: req.body
	});
};

/**
 * Get all cameras with search functionality
 */
export const getAll = async (req: Request, res: Response) => {
	try {
		const search = (req.query.search as string) || '';
		const page = parseInt(req.query.page as string) > 0 ? parseInt(req.query.page as string) : 1;
		const perPage =
			(req.query.perPage as string)?.toLowerCase() === 'all'
				? 10000
				: parseInt(req.query.perPage as string) > 0
					? parseInt(req.query.perPage as string)
					: 10;

		let query = {};
		if (search) {
			if (['true', 'false'].includes(search.toLowerCase())) {
				query = { damaged: search.toLowerCase() === 'true' };
			} else {
				query = {
					$or: [
						{ ip: { $regex: search, $options: 'i' } },
						{ nvr: { $regex: search, $options: 'i' } },
						{ network: { $regex: search, $options: 'i' } },
						{ name: { $regex: search, $options: 'i' } }
					]
				};
			}
		}

		const skip = (page - 1) * perPage;
		const cameras = await Camera.find(query).populate('section_id').skip(skip).limit(perPage).exec();

		const total = await Camera.countDocuments(query);

		// Filter cameras based on user access
		const filteredCameras = cameras.map((camera) => sendFunction(camera, req)).filter(Boolean);

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				cameras: filteredCameras,
				pagination: {
					page,
					perPage,
					total: filteredCameras.length,
					pages: Math.ceil(total / perPage)
				}
			}
		});
	} catch {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to fetch cameras'
		});
	}
};

/**
 * Get camera by ID
 */
export const getById = async (req: Request, res: Response) => {
	try {
		const id = req.params.id;
		const camera = await Camera.findById(id).populate('section_id').exec();

		if (!camera) {
			return ApiRes(res, {
				status: HttpStatus.NOT_FOUND,
				msg: 'Camera not found'
			});
		}

		const filteredCamera = sendFunction(camera, req);
		if (!filteredCamera) {
			return ApiRes(res, {
				status: HttpStatus.FORBIDDEN,
				msg: 'Access denied'
			});
		}

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: filteredCamera
		});
	} catch {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to fetch camera'
		});
	}
};

/**
 * Get personnel whitelist for camera
 */
export const getWhitelistPersonnel = async (req: Request, res: Response) => {
	try {
		const cameraId = req.params.id;
		const page = parseInt(req.query.page as string) > 0 ? parseInt(req.query.page as string) : 1;
		const perPage =
			(req.query.perPage as string)?.toLowerCase() === 'all'
				? 10000
				: parseInt(req.query.perPage as string) > 0
					? parseInt(req.query.perPage as string)
					: 10;

		const skip = (page - 1) * perPage;
		const personnel = await Personnel.find({
			camera_whitelist: { $in: [new mongoose.Types.ObjectId(cameraId)] }
		})
			.populate('section_id')
			.skip(skip)
			.limit(perPage)
			.exec();

		const total = await Personnel.countDocuments({
			camera_whitelist: { $in: [new mongoose.Types.ObjectId(cameraId)] }
		});

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				personnel,
				pagination: {
					page,
					perPage,
					total,
					pages: Math.ceil(total / perPage)
				}
			}
		});
	} catch {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to fetch personnel whitelist'
		});
	}
};

/**
 * Get cars whitelist for camera
 */
export const getWhitelistCars = async (req: Request, res: Response) => {
	try {
		const cameraId = req.params.id;
		const page = parseInt(req.query.page as string) > 0 ? parseInt(req.query.page as string) : 1;
		const perPage =
			(req.query.perPage as string)?.toLowerCase() === 'all'
				? 10000
				: parseInt(req.query.perPage as string) > 0
					? parseInt(req.query.perPage as string)
					: 10;

		const skip = (page - 1) * perPage;
		const cars = await Car.find({
			camera_whitelist: { $in: [new mongoose.Types.ObjectId(cameraId)] }
		})
			.populate('section_id')
			.skip(skip)
			.limit(perPage)
			.exec();

		const total = await Car.countDocuments({
			camera_whitelist: { $in: [new mongoose.Types.ObjectId(cameraId)] }
		});

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				cars,
				pagination: {
					page,
					perPage,
					total,
					pages: Math.ceil(total / perPage)
				}
			}
		});
	} catch {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to fetch cars whitelist'
		});
	}
};

/**
 * Get combined whitelist (personnel and cars) for camera
 */
export const getWhitelist = async (req: Request, res: Response) => {
	try {
		const cameraId = req.params.id;
		const page = parseInt(req.query.page as string) > 0 ? parseInt(req.query.page as string) : 1;
		const perPage =
			(req.query.perPage as string)?.toLowerCase() === 'all'
				? 10000
				: parseInt(req.query.perPage as string) > 0
					? parseInt(req.query.perPage as string)
					: 10;

		const [personnel, cars] = await Promise.all([
			Personnel.find({
				camera_whitelist: { $in: [new mongoose.Types.ObjectId(cameraId)] }
			})
				.populate('section_id')
				.exec(),
			Car.find({
				camera_whitelist: { $in: [new mongoose.Types.ObjectId(cameraId)] }
			})
				.populate('section_id')
				.exec()
		]);

		const data = [personnel, cars];

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				whitelist: data,
				pagination: {
					page,
					perPage,
					total: data.length,
					pages: Math.ceil(data.length / perPage)
				}
			}
		});
	} catch {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to fetch whitelist'
		});
	}
};

/**
 * Get schedules for camera
 */
export const getSchedules = async (req: Request, res: Response) => {
	try {
		const cameraId = req.params.id;
		const page = parseInt(req.query.page as string) > 0 ? parseInt(req.query.page as string) : 1;
		const perPage =
			(req.query.perPage as string)?.toLowerCase() === 'all'
				? 10000
				: parseInt(req.query.perPage as string) > 0
					? parseInt(req.query.perPage as string)
					: 10;

		const m2cs = await ModelToCamera.find({
			camera_id: new mongoose.Types.ObjectId(cameraId)
		}).exec();

		const modelCameraIds = m2cs.map((m2c) => m2c._id);

		const skip = (page - 1) * perPage;
		const schedules = await Schedule.find({
			model_camera_id: { $in: modelCameraIds }
		})
			.populate('model_camera_id')
			.skip(skip)
			.limit(perPage)
			.exec();

		const total = await Schedule.countDocuments({
			model_camera_id: { $in: modelCameraIds }
		});

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				schedules,
				pagination: {
					page,
					perPage,
					total,
					pages: Math.ceil(total / perPage)
				}
			}
		});
	} catch {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to fetch schedules'
		});
	}
};

/**
 * Update camera by ID
 */
export const updateById = async (req: Request, res: Response) => {
	try {
		const id = req.params.id;
		const payload = req.body;

		// Set damaged status
		payload.damaged = payload.damaged ?? false;

		const camera = await Camera.findByIdAndUpdate(id, payload, { new: true }).populate('section_id').exec();

		if (!camera) {
			return ApiRes(res, {
				status: HttpStatus.NOT_FOUND,
				msg: 'Camera not found'
			});
		}

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: camera.toJSON()
		});
	} catch {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to update camera'
		});
	}
};

/**
 * Delete camera by ID
 */
export const deleteById = async (req: Request, res: Response) => {
	try {
		const id = req.params.id;

		const camera = await Camera.findByIdAndDelete(id).exec();

		if (!camera) {
			return ApiRes(res, {
				status: HttpStatus.NOT_FOUND,
				msg: 'Camera not found'
			});
		}

		return ApiRes(res, {
			status: HttpStatus.NO_CONTENT,
			data: camera
		});
	} catch {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to delete camera'
		});
	}
};

/**
 * Helper function to filter camera data based on user role and access
 */
function sendFunction(
	camera: Document<unknown, Record<string, unknown>, ICamera> &
		Omit<ICamera & Required<{ _id: Types.ObjectId }>, never>,
	req: Request
) {
	if (req.user.role === 'admin') {
		return {
			_id: camera._id,
			section_id: camera.section_id,
			network: camera.network,
			url: camera.url,
			nvr: camera.nvr,
			ip: camera.ip,
			damaged: camera.damaged,
			name: camera.name,
			username: camera.username,
			password: camera.password,
			is_enabled: camera.is_enabled,
			create_date: camera.create_date,
			camera_type: camera.camera_type
		};
	} else if (req.user.role === 'user') {
		if (req.user.camera_access?.some((id: Types.ObjectId) => id.toString() === camera._id.toString())) {
			return camera.toJSON();
		}
	}
	// return undefined to skip if user has no access
	return undefined;
}
