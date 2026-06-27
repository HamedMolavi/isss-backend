import { Router } from 'express';
import { stringPersianToStringEnglish } from '../../tools/plate.tools';
import Car from '../../db/mongo/models/car';
import { dtoValidationMiddleware } from '../../validation/dto';
import { CreateCarBody } from '../../validation/dto/car.dto';
import { existCheck } from '../../validation/db';
import { createMiddleware } from '../../db/mongo/create.database';
import { readByIdMiddleware, readMiddleware } from '../../db/mongo/read.database';
import { updateByIdMiddleware } from '../../db/mongo/update.database';
import { deleteByIdMiddleware } from '../../db/mongo/delete.database';
import { carSendFunction, stringifyPlate } from '../../tools/car.tools';
import { injectDataMiddleware } from '../../tools/request.tools';
import Time, { allowedPassConvert } from '../../tools/time.tools';
import { accessCheck } from '../../authentication/accessCheck.auth';

//create router for add to routes file
const router: Router = Router();

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Apply access check middleware to all car routes
router.use(accessCheck('car'));

//add route for register new car
router.post(
	'',
	dtoValidationMiddleware(CreateCarBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	// TODO: validate plateObj.second is defined in englishPlateDict
		existCheck(
			Car,
			(body: { number_plate?: { [key: string]: string } }) => {
				return { number_plate: stringifyPlate(body) };
			},
			'Car already exists!'
		),
	injectDataMiddleware(allowedPassConvert, { injData: 'allowed_pass' }),
		createMiddleware(
			[
				'owner',
				{ number_plate: (body: { number_plate?: { [key: string]: string } }) => stringifyPlate(body) },
				'brand',
			'color',
			'camera_whitelist',
			'schedule_whitelist',
			'section_whitelist',
			'department_whitelist',
			'tracked',
			'allowed_pass'
		],
		Car,
		{
			send: carSendFunction
		}
	)
);

//route for get car list
router.get(
	'',
	readMiddleware(
		Car,
		(search) => {
			const rawSearch = search.trim();
			const escapedSearch = escapeRegex(rawSearch);
			const normalizedSearch = stringPersianToStringEnglish(rawSearch);
			const plateSearchTerms = new Set<string>();
			if (rawSearch) plateSearchTerms.add(rawSearch);
			if (normalizedSearch) plateSearchTerms.add(normalizedSearch);

			return [
				{
					$lookup: {
						from: 'Personnel',
						localField: 'owner',
						foreignField: '_id',
						as: 'owner_info'
					}
				},
				{
					$unwind: {
						path: '$owner_info',
						preserveNullAndEmptyArrays: true
					}
				},
				{
					$match: {
						$or: [
							...Array.from(plateSearchTerms).map((term) => ({
								number_plate: { $regex: escapeRegex(term), $options: 'i' }
							})),
							{ 'owner_info.first_name': { $regex: escapedSearch, $options: 'i' } },
							{ 'owner_info.last_name': { $regex: escapedSearch, $options: 'i' } },
							{ 'owner_info.national_code': { $regex: escapedSearch, $options: 'i' } },
							{ 'owner_info.personnel_code': { $regex: escapedSearch, $options: 'i' } }
						]
					}
				},
				{
					$project: {
						owner_info: 0 // remove lookup field to return only Car fields
					}
				}
			];
		},
		{ populate: true, send: carSendFunction, aggregate: true }
	)
);

//route for get car by id from DB
router.get('/:id', readByIdMiddleware(Car, { send: carSendFunction, populate: true }));

//add route for edit car
router.patch(
	'/:id',
	updateByIdMiddleware(Car, {
		update: {
			number_plate: stringifyPlate,
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
		},
		send: carSendFunction
	})
);

//add route for delete car
router.delete('/:id', deleteByIdMiddleware(Car, { send: carSendFunction }));

export default router;
