import { Router } from 'express';
import { dtoValidationMiddleware } from '../../validation/dto';
import { readMiddleware } from '../../db/mongo/read.database';
import { FilterQuery } from 'mongoose';
import Track from '../../db/mongo/models/track';
import { ReadTrackBody } from '../../validation/dto/track.dto';
import Time from '../../tools/time.tools';
import Camera from '../../db/mongo/models/camera';
import { cumulativeSendFunction, daySendFunction } from '../../tools/track.tools';
import { sendDataMiddleware } from '../../tools/middleware.tools';
import { ITrackLog } from '../../types/interfaces/track.interface';

//create router for add to server
const router: Router = Router();
// get track data
router.post(
	'/cumulative',
	dtoValidationMiddleware(ReadTrackBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	readMiddleware(Camera, undefined, { next: true, save: 'cameras' }),
	readMiddleware(Track, searchFunction, { populate: true, next: true, save: 'trackData', searchFromBody }),
	sendDataMiddleware(cumulativeSendFunction)
);
router.post(
	'',
	dtoValidationMiddleware(ReadTrackBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	readMiddleware(Camera, undefined, { next: true, save: 'cameras' }),
	readMiddleware(Track, searchFunction, { populate: true, send: daySendFunction, searchFromBody })
);

function searchFromBody(
	body: { personnel_id?: string; number_plate?: string; date_start?: string; date_end?: string } & {
		day_start?: number;
		day_end?: number;
	}
) {
	const uid = body.personnel_id ?? body.number_plate;

	const start = body.date_start
		? Math.floor(
				new Date(body.date_start + Time.getUtcOffset('Asia/Tehran').toString().replace('+', ' ')).getTime() /
					86400000
			)
		: 19794;

	const end = body.date_end
		? Math.floor(
				new Date(body.date_end + Time.getUtcOffset('Asia/Tehran').toString().replace('+', ' ')).getTime() /
					86400000
			)
		: 20000;

	body['day_start'] = start;
	body['day_end'] = end;
	return JSON.stringify({ uid, start, end });
}
function searchFunction(search: string): FilterQuery<ITrackLog> {
	const searchJson = JSON.parse(search);
	const query: FilterQuery<ITrackLog> = {
		uid: searchJson?.uid,
		day: {
			$gte: searchJson?.start,
			$lt: searchJson?.end
		}
	};
	if (searchJson?.time) {
		query['time'] = searchJson.time;
	}
	if (searchJson?.hour) {
		query['hour'] = searchJson.hour;
	}
	return query;
}

export default router;
