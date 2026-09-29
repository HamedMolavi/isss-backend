import { Router, Request, Response, NextFunction } from 'express';
import JobTitle from '../../db/mongo/models/jobTitle';
import { dtoValidationMiddleware } from '../../validation/dto';
import { CreateJobTitleBody, UpdateJobTitleBody } from '../../validation/dto/jobTitle.dto';
import { existCheck } from '../../validation/db';
import { createMiddleware } from '../../db/mongo/create.database';
import { readByIdMiddleware, readMiddleware } from '../../db/mongo/read.database';
import { updateByIdMiddleware } from '../../db/mongo/update.database';
import { deleteByIdMiddleware } from '../../db/mongo/delete.database';
import Personnel from '../../db/mongo/models/personnel';
import mongoose from 'mongoose';
import { DoNotAllowOnDefault } from '../../tools/request.tools';
import { accessCheck } from '../../authentication/accessCheck.auth';
import { jobTitleCreationRateLimit } from '../../middleware/resource-rate-limit.middleware';

//create router for add to server file
const router: Router = Router();

// Apply access check middleware to all job title routes
router.use(accessCheck('job'));

//add route for register new jobTitle
router.post(
	'',
	jobTitleCreationRateLimit,
	dtoValidationMiddleware(CreateJobTitleBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	existCheck(JobTitle, { $and: [{ name: 'name' }] }, 'JobTitle already exists!'),
	createMiddleware(['name'], JobTitle)
);

//route for get jobTitle list
router.get(
	'',
	readMiddleware(JobTitle, (search) => {
		return { name: { $regex: search, $options: 'i' } };
	})
);

//listing routes
router.get(
	'/:id/personnel',
	readMiddleware(
		Personnel,
		(search) => {
			return { job_id: new mongoose.Types.ObjectId(search) };
		},
		{ populate: true, searchFromParams: (params) => params.id }
	)
);

//route for get jobTitle by id from DB
router.get('/:id', readByIdMiddleware(JobTitle));

//add route for edit jobTitle
router.patch(
	'/:id',
	DoNotAllowOnDefault(JobTitle, { name: 'guest' }),
	dtoValidationMiddleware(UpdateJobTitleBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	updateByIdMiddleware(JobTitle)
);

//add route for delete jobTitle
router.delete('/:id', DoNotAllowOnDefault(JobTitle, { name: 'guest' }), deleteByIdMiddleware(JobTitle));

export default router;
