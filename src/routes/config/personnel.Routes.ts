import { Router, Request, Response, NextFunction } from 'express';
import { requestForGetPersonnel } from '../../db/elastic/connect.database';
import Camera from '../../db/mongo/models/camera';
import Personnel from '../../db/mongo/models/personnel';
import { IPersonnel } from '../../types/interfaces/personnel.interface';
import { dtoValidationMiddleware } from '../../validation/dto';
import { CreatePersonnelBody, UpdatePersonnelBody } from '../../validation/dto/personnel.dto';
import { existCheck } from '../../validation/db';
import { createMiddleware } from '../../db/mongo/create.database';
import { readByIdMiddleware, readMiddleware } from '../../db/mongo/read.database';
import { updateByIdMiddleware } from '../../db/mongo/update.database';
import { deleteByIdMiddleware } from '../../db/mongo/delete.database';
import mongoose from 'mongoose';
import Time, { allowedPassConvert, allowedPassRevert } from '../../tools/time.tools';
import { DoNotAllowOnDefault, injectDataMiddleware } from '../../tools/request.tools';
import { PersonnelLogger } from '../../logger/personnel.logger';
import { ApiRes } from '../../utils/api.response';
import { HttpStatus } from '../../types/http_status';
import PersonImage from '../../db/mongo/models/personImage';
import { remove_file } from '../../file_upload/aws/remove';
import { personnelCreationRateLimit } from '../../middleware/resource-rate-limit.middleware';
import { accessCheck } from '../../authentication/accessCheck.auth';

const router: Router = Router();

// Apply access check middleware to all personnel routes
router.use(accessCheck('personnel'));

type SearchValue = string | boolean;
type SearchResult =
	| {
			[key: string]: SearchValue;
	  }
	| {
			$or: Array<{ [key: string]: { $regex: string } }>;
	  };

const rawSearch = (search: string): SearchResult => {
	if (search.includes(':')) {
		const res: { [key: string]: SearchValue } = {};
		const splitted = search.split(':');
		for (let i = 0; i < splitted.length; i += 2) {
			const key = splitted[i];
			const value = splitted[i + 1];
			if (!value) continue;

			if (value.toLowerCase() === 'true') {
				res[key] = true;
			} else if (value.toLowerCase() === 'false') {
				res[key] = false;
			} else {
				res[key] = value;
			}
		}
		return res;
	}

	return {
		$or: [
			{ first_name: { $regex: search } },
			{ last_name: { $regex: search } },
			{ national_code: { $regex: search } },
			{ personnel_code: { $regex: search } },
			{ phone_number: { $regex: search } }
		]
	};
};

const specialTypes = ['hostile', 'guest', 'client'] as const;
type PersonType = (typeof specialTypes)[number] | 'normal';

const personnelDefaultQueryFunction = (bodyQueryParams: { type?: string }) => {
	const result: { person_type: PersonType } = { person_type: 'normal' };
	if (bodyQueryParams.type && typeof bodyQueryParams.type === 'string') {
		const type = specialTypes.find((st) => st === bodyQueryParams.type!.toLowerCase());
		if (type) {
			result.person_type = type;
		}
	}
	return result;
};

// Success handlers for personnel operations
const handlePersonnelSuccess = {
	create: async (req: Request, res: Response, next: NextFunction) => {
		try {
			const doc = req.body['doc'];

			if (doc) {
				PersonnelLogger.personnelCreated(req, {
					_id: doc._id.toString(),
					name: `${doc.first_name} ${doc.last_name}`,
					role: doc.person_type
				});

				const docData = doc.toJSON ? await doc.toJSON() : JSON.parse(JSON.stringify(doc));

				return ApiRes(res, {
					status: HttpStatus.CREATED,
					msg: 'Personnel created successfully',
					data: docData
				});
			} else {
				return ApiRes(res, {
					status: HttpStatus.INTERNAL_SERVER_ERROR,
					msg: 'Personnel creation failed - no document returned'
				});
			}
		} catch (error) {
			console.error('Error in personnel creation success handler:', error);
			// Still send response even if logging fails
			const doc = req.body['doc'];
			if (doc) {
				const docData = JSON.parse(JSON.stringify(doc));
				return ApiRes(res, {
					status: HttpStatus.CREATED,
					msg: 'Personnel created successfully',
					data: docData
				});
			} else {
				next(error);
			}
		}
	},

	update: async (req: Request, res: Response, next: NextFunction) => {
		try {
			const doc = req.body['doc'];
			if (doc) {
				PersonnelLogger.personnelUpdated(
					req,
					{
						_id: doc._id.toString(),
						name: `${doc.first_name} ${doc.last_name}`
					},
					Object.keys(req.body)
				);

				// Convert Mongoose document to JSON
				const docData = doc.toJSON ? await doc.toJSON() : JSON.parse(JSON.stringify(doc));

				return ApiRes(res, {
					status: HttpStatus.OK,
					msg: 'Personnel updated successfully',
					data: docData
				});
			} else {
				return ApiRes(res, {
					status: HttpStatus.INTERNAL_SERVER_ERROR,
					msg: 'Personnel update failed - no document returned'
				});
			}
		} catch (error) {
			console.error('Error in personnel update success handler:', error);
			// Still send response even if logging fails
			const doc = req.body['doc'];
			if (doc) {
				const docData = JSON.parse(JSON.stringify(doc));
				return ApiRes(res, {
					status: HttpStatus.OK,
					msg: 'Personnel updated successfully',
					data: docData
				});
			} else {
				next(error);
			}
		}
	},

	delete: async (req: Request, res: Response, next: NextFunction) => {
		try {
			const doc = req.body['doc'];
			if (doc) {
				PersonnelLogger.personnelDeleted(req, {
					_id: doc._id.toString(),
					name: `${doc.first_name} ${doc.last_name}`,
					role: doc.person_type
				});

				// Convert Mongoose document to JSON
				const docData = doc.toJSON ? await doc.toJSON() : JSON.parse(JSON.stringify(doc));

				return ApiRes(res, {
					status: HttpStatus.OK,
					msg: 'Personnel deleted successfully',
					data: docData
				});
			} else {
				return ApiRes(res, {
					status: HttpStatus.INTERNAL_SERVER_ERROR,
					msg: 'Personnel deletion failed - no document returned'
				});
			}
		} catch (error) {
			console.error('Error in personnel deletion success handler:', error);
			// Still send response even if logging fails
			const doc = req.body['doc'];
			if (doc) {
				const docData = JSON.parse(JSON.stringify(doc));
				return ApiRes(res, {
					status: HttpStatus.OK,
					msg: 'Personnel deleted successfully',
					data: docData
				});
			} else {
				next(error);
			}
		}
	}
};

// Error handlers for personnel operations
const handlePersonnelError = {
	create: (err: Error, req: Request, res: Response) => {
		try {
			const doc = req.body['doc'];
			PersonnelLogger.personnelCreateFailed(
				req,
				err.message,
				doc
					? {
							_id: doc._id.toString(),
							name: `${doc.first_name} ${doc.last_name}`
						}
					: undefined
			);
		} catch (logError) {
			console.error('Error logging personnel creation failure:', logError);
		}

		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'Personnel creation failed',
			data: { error: err.message }
		});
	},

	update: (err: Error, req: Request, res: Response) => {
		try {
			const errorDetails = {
				error: err.message,
				targetId: req.params.id,
				attemptedChanges: req.body
			};
			PersonnelLogger.personnelCreateFailed(req, `Personnel update failed: ${err.message}`, errorDetails);
		} catch (logError) {
			console.error('Error logging personnel update failure:', logError);
		}

		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'Personnel update failed',
			data: { error: err.message }
		});
	},

	delete: (err: Error, req: Request, res: Response) => {
		try {
			const errorDetails = {
				error: err.message,
				targetId: req.params.id
			};
			PersonnelLogger.personnelCreateFailed(req, `Personnel deletion failed: ${err.message}`, errorDetails);
		} catch (logError) {
			console.error('Error logging personnel deletion failure:', logError);
		}

		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'Personnel deletion failed',
			data: { error: err.message }
		});
	}
};

router.post(
	'',
	personnelCreationRateLimit, // Rate limit to prevent race condition attacks
	dtoValidationMiddleware(CreatePersonnelBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development',
		info: 'please fill all fields'
	}),
	injectDataMiddleware(allowedPassConvert, { injData: 'allowed_pass' }),
	createMiddleware(
		[
			'first_name',
			'last_name',
			'national_code',
			'email',
			'phone_number',
			'job_id',
			'tracked',
			'personnel_code',
			'camera_whitelist',
			'allowed_pass',
			'alert'
		],
		Personnel,
		{ next: true, save: 'doc' }
	),
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			await handlePersonnelSuccess.create(req, res, next);
		} catch (error) {
			handlePersonnelError.create(error as Error, req, res);
		}
	}
);
router.get(
	'(/:type(search|hostile|guest|client))?/?$',
	readMiddleware(Personnel, rawSearch, {
		next: false,
		send: personnelSendFunction,
		populate: true,
		defaultQuery: personnelDefaultQueryFunction
	})
);

router.get('/:id', readByIdMiddleware(Personnel, { populate: true }));

router.patch(
	'/:id',
	dtoValidationMiddleware(UpdatePersonnelBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development',
		info: 'please fill all fields'
	}),
	existCheck(
		Personnel,
		{ $or: [{ national_code: 'national_code' }, { personnel_code: 'personnel_code' }] },
		'Personnel already exists!'
	),
	updateByIdMiddleware(Personnel, {
		next: true,
		save: 'doc',
		update: {
			time_start: {
				name: 'allowed_pass.start',
				fn: (payload) =>
					new Date(
						payload.date_start + ' ' + payload.time_start + Time.getUtcOffset(process.env.TZ ?? 'Asia/Tehran')
					).getTime()
			},
			time_end: {
				name: 'allowed_pass.end',
				fn: (payload) =>
					new Date(
						payload.date_end + ' ' + payload.time_end + Time.getUtcOffset(process.env.TZ ?? 'Asia/Tehran')
					).getTime()
			}
		}
	}),
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			await handlePersonnelSuccess.update(req, res, next);
		} catch (error) {
			handlePersonnelError.update(error as Error, req, res);
		}
	}
);

router.delete(
	'/:id',
	DoNotAllowOnDefault(Personnel, { first_name: 'Global' }),
	deleteByIdMiddleware(Personnel, { next: true, save: 'doc' }),
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const doc = req.body['doc'];

			if (doc && doc._id) {
				// Find all images for this person
				const personImages = await PersonImage.find({ person_id: doc._id }).exec();

				// Delete all files from S3
				for (const image of personImages) {
					if (image.file_key) {
						await remove_file(image.file_key);
					}
				}

				// Delete all PersonImage records
				await PersonImage.deleteMany({ person_id: doc._id }).exec();
			}

			await handlePersonnelSuccess.delete(req, res, next);
		} catch (error) {
			handlePersonnelError.delete(error as Error, req, res);
		}
	}
);

interface ExtendedPersonnel extends Record<string, unknown> {
	lastTimeSeen?: Date;
	lastCameraSeen?: string;
	lastSection?: unknown;
	allowed_pass?: unknown;
}

async function personnelSendFunction(
	person: IPersonnel & Required<{ _id: mongoose.Types.ObjectId }>,
	req: Request
) {
	const per = (await person.toJSON()) as unknown as ExtendedPersonnel;

	if (req?.query?.lastSeen) {
		const logPersonnel = await requestForGetPersonnel(person._id.toString());
		let _camera;

		if (logPersonnel?.data?.hits?.hits?.length > 0) {
			try {
				_camera = await Camera.findById(logPersonnel.data.hits.hits[0]?._source?.camera_id).populate(
					'section_id'
				);
				per.lastTimeSeen = new Date(logPersonnel.data?.hits?.hits[0]?._source?.timestamp);
			} catch (error) {
				console.error('Error fetching camera or timestamp:', error);
			}
		}

		per.lastCameraSeen = _camera ? _camera.name : '';
		per.lastSection = _camera ? _camera.section_id : '';
	}

	if (per.allowed_pass) {
		per.allowed_pass = allowedPassRevert(per);
	}

	return per;
}

export default router;
