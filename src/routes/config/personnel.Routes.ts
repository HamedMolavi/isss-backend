import { Router, Request, Response, NextFunction } from 'express';
import { requestForGetPersonnel } from '../../db/elastic/connect.database';
import Camera from '../../db/mongo/models/camera';
import { ImageFileSystem } from '../../tools/kafkaFile.tools';
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

const fs = new ImageFileSystem();
const router: Router = Router();

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
			console.log('Debug - doc from req.body:', doc);
			console.log('Debug - req.body keys:', Object.keys(req.body));

			if (doc) {
				// Log personnel creation
				PersonnelLogger.personnelCreated(req, {
					_id: doc._id.toString(),
					name: `${doc.first_name} ${doc.last_name}`,
					role: doc.person_type
				});

				// Try different serialization methods
				console.log('Debug - doc.toJSON():', doc.toJSON ? await doc.toJSON() : 'No toJSON method');
				console.log('Debug - JSON.parse(JSON.stringify(doc)):', JSON.parse(JSON.stringify(doc)));
				console.log('Debug - Object.keys(doc):', Object.keys(doc));

				// Convert Mongoose document to JSON - try multiple approaches
				let docData;
				if (doc.toJSON && typeof doc.toJSON === 'function') {
					docData = await doc.toJSON();
					console.log('Debug - Using toJSON(), result:', docData);
				} else {
					docData = JSON.parse(JSON.stringify(doc));
					console.log('Debug - Using JSON.parse(JSON.stringify()), result:', docData);
				}

				console.log('Debug - Final docData before ApiRes:', docData);

				return ApiRes(res, {
					status: HttpStatus.CREATED,
					msg: 'Personnel created successfully',
					data: docData
				});
			} else {
				console.log('Debug - No doc found in req.body');
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
	handlePersonnelSuccess.create,
	fs.uploadAvatarMiddleware('avatar_str', 'doc._id', { fileName: 'avatar', resultPropertyName: 'doc' }),
	handlePersonnelError.create
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
	handlePersonnelSuccess.update,
	fs.uploadAvatarMiddleware('avatar_str', 'doc._id', { fileName: 'avatar', resultPropertyName: 'doc' }),
	handlePersonnelError.update
);

router.delete(
	'/:id',
	DoNotAllowOnDefault(Personnel, { first_name: 'Global' }),
	deleteByIdMiddleware(Personnel, { next: true, save: 'doc' }),
	handlePersonnelSuccess.delete,
	fs.deleteDirectoryMiddleware(['doc', '_id'], { force: true, send: 'doc' }),
	handlePersonnelError.delete
);

async function personnelSendFunction(
	person: IPersonnel & Required<{ _id: mongoose.Types.ObjectId }>,
	req: Request
) {
	const per = person.toJSON();

	if (req?.query?.lastSeen) {
		const logPersonnel = await requestForGetPersonnel(person._id.toString());
		let _camera;

		if (logPersonnel?.data?.hits?.hits?.length > 0) {
			try {
				_camera = await Camera.findById(logPersonnel.data.hits.hits[0]?._source?.camera_id)
					.populate('section_id')
					.exec();
			} catch (error) {
				if (error instanceof Error && error.name === 'CastError') {
					console.log(
						`!!! Elastic data error: ${logPersonnel.data.hits.hits[0]?._source?.camera_id} as camera._id is wrong`
					);
				}
			}
			per.lastTimeSeen = new Date(logPersonnel.data?.hits?.hits[0]?._source?.timestamp);
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
