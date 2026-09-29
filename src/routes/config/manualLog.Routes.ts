import { Router } from 'express';
import { dtoValidationMiddleware } from '../../validation/dto';
import { CreatePlateLogBody } from '../../validation/dto/plateLog.dto';
import { createLogMiddleware } from '../../db/elastic/createLog';
import { Plate } from '../../db/elastic/model/plate';
import { createMiddleware } from '../../db/mongo/create.database';
import { stringifyPlate } from '../../tools/car.tools';
import Car from '../../db/mongo/models/car';
import { existCheck } from '../../validation/db';
import { injectDataMiddleware } from '../../tools/request.tools';
import { manualLogCreationRateLimit } from '../../middleware/resource-rate-limit.middleware';

//create router for add to server file
const router: Router = Router();

router
	.post(
		'/plate',
		manualLogCreationRateLimit,
		dtoValidationMiddleware(CreatePlateLogBody, {
			skipMissingProperties: false,
			detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
			info: 'please fill all fields'
		}),
		injectDataMiddleware(stringifyPlate, { injData: 'number_plate' }),
		existCheck(Car, { $and: [{ number_plate: 'number_plate' }] }, "This plate doesn't exist on database!", {
			surpass(docs, req) {
				req.body['createCarFirst'] = !!req.body['is_correct']; // create new Car(doc) and next()
				return !!req.body['is_correct'];
			},
			notExist: true // make existCheck reverse
		}),
		// create mongo plate if not exist; TODO: please re factor this code!!! (H.M)
		// Car already exists, nothing else to do.
		(req, _res, next) => next(req.body['createCarFirst'] === undefined ? undefined : 'route'),
		createLogMiddleware('plate_log', Plate, ['color', 'brand', 'camera_id', 'plate_number', 'owner'])
	)
	.post(
		'/plate',
		createMiddleware(
			[
				'owner',
				'brand',
				'color',
				{
					number_plate: (body: any) => stringifyPlate({ number_plate: body.plate_number })
				}
			],
			Car,
			{ next: true }
		),
		createLogMiddleware('plate_log', Plate, ['color', 'brand', 'camera_id', 'plate_number', 'owner'])
	);

export default router;
