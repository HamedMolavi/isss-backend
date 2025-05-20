import { NextFunction, Request, Response } from 'express';
import { stringPlateToJson } from './plate.tools';
import { ITrackLog, TrackLogData } from '../types/interfaces/track.interface';
import { isValidObjectId, Types } from 'mongoose';
import { ApiError } from '../types/classes/error.class';
import Camera from '../db/mongo/models/camera';
import Section from '../db/mongo/models/section';
import Department from '../db/mongo/models/department';
import Personnel from '../db/mongo/models/personnel';
import CarColor from '../db/mongo/models/carColor';
import Car from '../db/mongo/models/car';

export function injectAllKindOfStuff(stuff: string[], field: string = '_id') {
	return (body: any) =>
		stuff.reduce(
			(acc, entity) => {
				acc[entity] = body[entity]?.reduce(
					(obj: any, item: any) => ({ ...obj, [item[field].toString()]: item }),
					{}
				);
				return acc;
			},
			{} as Record<string, any>
		);
}

export async function unifiedSendFunction(log: any & { _id: string }, req: Request) {
	const { body } = req;
	// Check if log.plate_number is null or undefined before accessing properties
	let car: any = undefined;
	if (Object.prototype.hasOwnProperty.call(req.body['db_cars'], log.plate_number)) {
		car = req.body?.['db_cars']?.['plate_number'];
	} else if (!!log.plate_number) {
		car = await Car.findOne({ number_plate: log['plate_number'] }).populate('owner').exec();
		Object.assign(req.body['db_personnel'], { [log.plate_number]: car });
	}
	let camera: any = undefined;
	let sectionDoc: any = undefined;
	let departmentDoc: any = undefined;
	if (Object.prototype.hasOwnProperty.call(req.body['db_cameras'], log.camera_id)) {
		camera = req.body?.['db_cameras']?.[log.camera_id];
		sectionDoc = req.body?.['db_sections']?.[log.camera_id];
		departmentDoc = req.body?.['db_departments']?.[log.camera_id];
	} else if (!!log.camera_id && isValidObjectId(log.camera_id)) {
		camera = await Camera.findById(log.camera_id).exec();
		Object.assign(req.body['db_cameras'], { [log.camera_id]: camera });
		if (!!camera) {
			sectionDoc = await Section.findById(camera.section_id).exec();
			Object.assign(req.body['db_sections'], { [log.camera_id]: sectionDoc });
			if (!!sectionDoc) {
				departmentDoc = !!sectionDoc?.department_id
					? await Department.findById(sectionDoc?.department_id).exec()
					: undefined;
				Object.assign(req.body['db_departments'], { [log.camera_id]: departmentDoc });
			}
		}
	}
	const section = sectionDoc?.name ?? '';
	const department = departmentDoc?.name ?? '';
	let personnel: any = undefined;
	if (Object.prototype.hasOwnProperty.call(req.body['db_personnel'], log.personnel_id)) {
		personnel = req.body?.['db_personnel']?.[log.personnel_id];
	} else if (!!log.personnel_id && log.personnel_id !== 'unknown' && isValidObjectId(log.personnel_id)) {
		personnel = await Personnel.findById(log.personnel_id).exec();
		Object.assign(req.body['db_personnel'], { [log.personnel_id]: personnel });
	}
	let color = undefined;
	if (Object.prototype.hasOwnProperty.call(req.body['db_colors'], log.color)) {
		color = req.body?.['db_colors']?.[log.color];
	} else if (!!log.color && isValidObjectId(log.color)) {
		color = await CarColor.findById(log.color).exec();
		Object.assign(req.body['db_colors'], { [log.color]: color });
	}
	let brand = undefined;
	if (Object.prototype.hasOwnProperty.call(req.body['db_brands'], log.brand)) {
		brand = req.body?.['db_brands']?.[log.brand];
	} else if (!!log.brand && isValidObjectId(log.brand)) {
		brand = await Personnel.findById(log.brand).exec();
		Object.assign(req.body['db_brands'], { [log.brand]: brand });
	}
	return {
		_id: log?._id,
		...log,
		camera_id: camera?._id?.toString() ?? '',
		camera: camera?.name ?? '',
		camera_type: camera?.type ?? '',
		fullName: personnel?.toName() ?? '',
		time: !!log?.timestamp
			? new Date(typeof log.timestamp === 'string' ? Number(log.timestamp) : log.timestamp).toLocaleString(
					'en-US',
					{ timeZone: req.query?.timez?.toString() ?? 'Asia/Tehran' }
				)
			: '',
		timestamp: !!log?.timestamp,
		plate_number: !!log.plate_number ? stringPlateToJson(log.plate_number) : '',
		owner: car?.owner?.toName() ?? '',
		color: color?.name ?? '',
		brand: brand?.name ?? '',
		department: department ?? '',
		section: section ?? '',
		allowed: log.allowed,
		crop: log.plate_number !== undefined ? log?.crop : log?.inner_crop,
		inner_crop: log.plate_number !== undefined ? log?.inner_crop : '',
		video: camera?.url ?? ''
	};
}

interface ExtendedTrackLogData extends TrackLogData {
	crop?: (string | undefined)[];
}
interface localTrackLog extends ITrackLog {
	data: Array<ExtendedTrackLogData>;
}
export function dataCollector(
	logs: (undefined | { camera_id?: string; timestamp?: number; personnel_id?: string; inner_crop?: string })[]
) {
	return logs.reverse().reduce((result: localTrackLog[], log) => {
		if (!log || typeof log['timestamp'] !== 'number' || typeof log['camera_id'] !== 'string') return result;
		let nowDay = Math.floor(log['timestamp'] / 86400000);
		let lastDay = Math.floor(result.at(-1)?.['day'] ?? 0);
		if (lastDay !== nowDay) {
			// push new record
			result.push({
				_id: new Types.ObjectId(),
				day: nowDay,
				uid: log?.['personnel_id'] ?? '',
				data: [
					{
						camera_id: log['camera_id'],
						crop: [log['inner_crop']],
						start: log['timestamp'],
						end: log['timestamp']
					}
				]
			});
		} else {
			//update last record
			if (result.at(-1)?.['data'].at(-1)?.['camera_id'] === log['camera_id']) {
				let lastDataRecord = result.at(-1)?.['data']?.pop() ?? {
					camera_id: log['camera_id'],
					start: log['timestamp'] ?? 0,
					end: 0
				};
				lastDataRecord['end'] = log['timestamp'];
				lastDataRecord['crop']?.push(log['inner_crop']);
				result.at(-1)?.['data']?.push(lastDataRecord);
			} else {
				result.at(-1)?.['data'].push({
					camera_id: log['camera_id'],
					start: log['timestamp'],
					crop: [log['inner_crop']],
					end: log['timestamp']
				});
			}
		}
		return result;
	}, [] as localTrackLog[]);
}

export function sendDataMiddleware(fn: CallableFunction, options?: { params?: boolean; forceAll?: boolean }) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			let data: any = await fn(!!options?.params ? req.params : req.body);
			if (!data) {
				req.flash('error', 'Data not found!');
				return next(new ApiError(404, 'Data not found!'));
			}
			//get page from url
			let strPage = req.query.page as string;
			let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
			//get perPage from url
			let strPerPage = req.query.perPage as string;
			let perPage =
				strPerPage?.toLowerCase() === 'all' ? 10000 : parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
			let start = ((page > 1 ? page : 1) - 1) * perPage;
			let total = Object.prototype.hasOwnProperty.call(data, 'length') ? data.length : undefined;
			if ((data.length ?? 0) > perPage && !options?.forceAll) data = data.slice(start, start + perPage);
			return res.status(200).json({
				success: true,
				data,
				page: page,
				perPage: perPage,
				total,
				pages: Math.ceil((total ?? 0) / perPage)
			});
		} catch (error: any) {
			req.flash('error', 'Internal Error!' + error.message);
			return next(new ApiError(500, 'Internal Error!' + error.message));
		}
	};
}
