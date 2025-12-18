import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../../types/classes/error.class';
import CarBrand from '../../db/mongo/models/carBrand';
import { dtoValidationMiddleware } from '../../validation/dto';
import { CreateCarBrandBody, UpdateCarBrandBody } from '../../validation/dto/carBrand.dto';
import { existCheck } from '../../validation/db';
import { createMiddleware } from '../../db/mongo/create.database';
import { readByIdMiddleware, readMiddleware } from '../../db/mongo/read.database';
import { deleteByIdMiddleware } from '../../db/mongo/delete.database';
import Car from '../../db/mongo/models/car';
import mongoose from 'mongoose';
import { carSendFunction } from '../../tools/car.tools';
import { updateByIdMiddleware } from '../../db/mongo/update.database';
import { DoNotAllowOnDefault, injectDataMiddleware } from '../../tools/request.tools';
import { accessCheck } from '../../authentication/accessCheck.auth';

//create router for add to server file
const router: Router = Router();

// Apply access check middleware to all car brand routes
router.use(accessCheck('brand'));

//add route for register new car_brand
router.post(
	'',
	dtoValidationMiddleware(CreateCarBrandBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	existCheck(CarBrand, { $and: [{ name: 'name' }] }, 'Brand already exists!'),
	createMiddleware(['name', 'car_type'], CarBrand)
);

//route for get car list
router.get(
	'',
	readMiddleware(CarBrand, (search) => {
		return { name: { $regex: search, $options: 'i' } };
	})
);

//route for get all cars with this brand from DB
router.get(
	'/:id/cars',
	readMiddleware(
		Car,
		(search) => {
			return { brand: new mongoose.Types.ObjectId(search) };
		},
		{ populate: true, searchFromParams: (params) => params.id, send: carSendFunction }
	)
);
//route for get car_brand by id from DB
router.get('/:id', readByIdMiddleware(CarBrand));

//add route for delete car_brand by id from DB
router.patch(
	'/:id',
	DoNotAllowOnDefault(CarBrand, { name: 'unknown' }),
	dtoValidationMiddleware(UpdateCarBrandBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	injectDataMiddleware((params: { [key: string]: string }) => params.id, { params: true, injData: 'id' }), // inject id from params into body
	existCheck(
		CarBrand,
		(body: { [key: string]: string }) => {
			return { _id: new mongoose.Types.ObjectId(body.id), system: true };
		},
		"You can't change a system car brand!"
	),
	updateByIdMiddleware(CarBrand)
);

//add route for delete car_brand by id from DB
router.delete('/:id', DoNotAllowOnDefault(CarBrand, { name: 'unknown' }), deleteByIdMiddleware(CarBrand));

export default router;
