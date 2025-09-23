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
import { getStreamCacheService } from '../services/streamCache.service';

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

		// Validate cameraId is a valid ObjectId
		if (!mongoose.Types.ObjectId.isValid(cameraId)) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Invalid camera ID'
			});
		}

		const page = parseInt(req.query.page as string) > 0 ? parseInt(req.query.page as string) : 1;
		const perPage =
			(req.query.perPage as string)?.toLowerCase() === 'all'
				? 10000
				: parseInt(req.query.perPage as string) > 0
					? parseInt(req.query.perPage as string)
					: 10;

		const skip = (page - 1) * perPage;

		// Convert string to ObjectId
		const objectId = new mongoose.Types.ObjectId(cameraId);

		const personnelDocs = await Personnel.find({
			camera_whitelist: { $in: [objectId] }
		})
			.skip(skip)
			.limit(perPage)
			.exec();

		// Convert personnel documents to JSON properly
		const personnel = await Promise.all(personnelDocs.map(async (person) => await person.toJSON()));

		const total = await Personnel.countDocuments({
			camera_whitelist: { $in: [objectId] }
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
	} catch (error) {
		console.error('Error fetching personnel whitelist:', error);
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

		// Validate cameraId is a valid ObjectId
		if (!mongoose.Types.ObjectId.isValid(cameraId)) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Invalid camera ID'
			});
		}

		const page = parseInt(req.query.page as string) > 0 ? parseInt(req.query.page as string) : 1;
		const perPage =
			(req.query.perPage as string)?.toLowerCase() === 'all'
				? 10000
				: parseInt(req.query.perPage as string) > 0
					? parseInt(req.query.perPage as string)
					: 10;

		const skip = (page - 1) * perPage;

		// Convert string to ObjectId
		const objectId = new mongoose.Types.ObjectId(cameraId);

		const carDocs = await Car.find({
			camera_whitelist: { $in: [objectId] }
		})
			.skip(skip)
			.limit(perPage)
			.exec();

		// Convert car documents to JSON
		const cars = carDocs.map((car) => car.toJSON());

		const total = await Car.countDocuments({
			camera_whitelist: { $in: [objectId] }
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
	} catch (error) {
		console.error('Error fetching cars whitelist:', error);
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

		// Validate cameraId is a valid ObjectId
		if (!mongoose.Types.ObjectId.isValid(cameraId)) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Invalid camera ID'
			});
		}

		const page = parseInt(req.query.page as string) > 0 ? parseInt(req.query.page as string) : 1;
		const perPage =
			(req.query.perPage as string)?.toLowerCase() === 'all'
				? 10000
				: parseInt(req.query.perPage as string) > 0
					? parseInt(req.query.perPage as string)
					: 10;

		// Convert string to ObjectId
		const objectId = new mongoose.Types.ObjectId(cameraId);

		const [personnelDocs, carDocs] = await Promise.all([
			Personnel.find({
				camera_whitelist: { $in: [objectId] }
			}).exec(),
			Car.find({
				camera_whitelist: { $in: [objectId] }
			}).exec()
		]);

		// Convert documents to JSON properly
		const [personnel, cars] = await Promise.all([
			Promise.all(personnelDocs.map(async (person) => await person.toJSON())),
			Promise.all(carDocs.map((car) => car.toJSON()))
		]);

		const data = [personnel, cars];

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				whitelist: data,
				pagination: {
					page,
					perPage,
					total: personnel.length + cars.length,
					pages: Math.ceil((personnel.length + cars.length) / perPage)
				}
			}
		});
	} catch (error) {
		console.error('Error fetching whitelist:', error);
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

		// Validate cameraId is a valid ObjectId
		if (!mongoose.Types.ObjectId.isValid(cameraId)) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Invalid camera ID'
			});
		}

		const page = parseInt(req.query.page as string) > 0 ? parseInt(req.query.page as string) : 1;
		const perPage =
			(req.query.perPage as string)?.toLowerCase() === 'all'
				? 10000
				: parseInt(req.query.perPage as string) > 0
					? parseInt(req.query.perPage as string)
					: 10;

		// Convert string to ObjectId
		const objectId = new mongoose.Types.ObjectId(cameraId);

		const m2cs = await ModelToCamera.find({
			camera_id: objectId
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
	} catch (error) {
		console.error('Error fetching schedules:', error);
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
			status: HttpStatus.NO_CONTENT
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

/**
 * Create a temporary playback stream for a camera
 */
export const createPlaybackStream = async (req: Request, res: Response) => {
	try {
		const { camera_id, start_date, report_id, end_date } = req.body;

		// Find the camera
		const camera = await Camera.findById(camera_id).exec();
		if (!camera) {
			return ApiRes(res, {
				status: HttpStatus.NOT_FOUND,
				msg: 'Camera not found'
			});
		}

		// Check if user has access to this camera
		const hasAccess = await checkCameraAccess(req, camera);
		if (!hasAccess) {
			return ApiRes(res, {
				status: HttpStatus.FORBIDDEN,
				msg: 'Access denied to this camera'
			});
		}

		// Parse dates
		const startDate = new Date(start_date);
		const endDate = end_date ? new Date(end_date) : new Date(startDate.getTime() + 20 * 1000); // Default: +20 seconds (10 before + 10 after)

		// Validate dates
		if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Invalid date format'
			});
		}

		if (startDate >= endDate) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Start date must be before end date'
			});
		}

		// Check Redis cache first
		const streamCache = await getStreamCacheService();
		const cachedStream = await streamCache.getCachedStream(
			camera_id,
			startDate.toISOString(),
			endDate.toISOString(),
			report_id
		);

		if (cachedStream) {
			// Before returning cached stream, verify it's still available in go2rtc
			const { go2rtcService } = await import('../services/go2rtc.service');
			const isStreamAvailable = await go2rtcService.isStreamAvailable(cachedStream.streamName);

			if (isStreamAvailable) {
				// Stream is available, return from cache
				return ApiRes(res, {
					status: HttpStatus.OK,
					data: {
						stream_name: cachedStream.streamName,
						camera_id: cachedStream.camera_id,
						start_date: cachedStream.start_date,
						end_date: cachedStream.end_date,
						report_id: cachedStream.report_id,
						expires_in: new Date(cachedStream.expires_at).getTime() - Date.now(),
						expires_at: cachedStream.expires_at
					}
				});
			} else {
				// Stream is not available in go2rtc, remove from cache and create new one
				await streamCache.removeCachedStream(
					camera_id,
					startDate.toISOString(),
					endDate.toISOString(),
					report_id
				);
				// Continue to create new stream below
			}
		}

		// Prepare camera data
		const cameraData = {
			nvr_type: camera.nvr_type || 'hikvision', // Default to hikvision if not specified
			ip: camera.ip,
			username: camera.username,
			password: camera.password,
			nvr: camera.nvr || '1'
		};

		// Create playback stream using go2rtc service
		const { createPlaybackStream: createStream } = await import('../services/go2rtc.service');
		const result = await createStream(cameraData, startDate, endDate, report_id);

		const responseData = {
			stream_name: result.streamName,
			camera_id: camera._id.toString(),
			start_date: startDate.toISOString(),
			end_date: endDate.toISOString(),
			report_id: report_id || null,
			expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
		};

		// Cache the response in Redis
		await streamCache.cacheStream(
			camera_id,
			startDate.toISOString(),
			endDate.toISOString(),
			{
				streamName: result.streamName,
				camera_id: camera._id.toString(),
				start_date: startDate.toISOString(),
				end_date: endDate.toISOString(),
				report_id: report_id || undefined,
				created_at: new Date().toISOString(),
				expires_at: responseData.expires_at
			},
			report_id,
			30 * 60 // 30 minutes TTL
		);

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: responseData
		});
	} catch (error) {
		console.error('Failed to create playback stream:', error);
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to create playback stream'
		});
	}
};

/**
 * Check if user has access to camera
 */
async function checkCameraAccess(req: Request, camera: ICamera): Promise<boolean> {
	const user = req.user as IUser;

	// Admin and technician have access to all cameras
	if (user.role === 'admin' || user.role === 'technician') {
		return true;
	}

	// Regular user needs explicit camera access
	if (user.role === 'user') {
		return user.camera_access?.some((id: Types.ObjectId) => id.toString() === camera._id.toString()) || false;
	}

	return false;
}
