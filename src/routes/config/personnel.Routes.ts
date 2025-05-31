import { Router, Request } from 'express';
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
	fs.uploadAvatarMiddleware('avatar_str', 'doc._id', { fileName: 'avatar', resultPropertyName: 'doc' })
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
	fs.uploadAvatarMiddleware('avatar_str', 'doc._id', { fileName: 'avatar', resultPropertyName: 'doc' })
);

router.delete(
	'/:id',
	DoNotAllowOnDefault(Personnel, { first_name: 'Global' }),
	deleteByIdMiddleware(Personnel, { next: true, save: 'doc' }),
	fs.deleteDirectoryMiddleware(['doc', '_id'], { force: true, send: 'doc' })
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
