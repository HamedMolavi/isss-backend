import { Router } from 'express';
import { dtoValidationMiddleware } from '../../validation/dto';
import { existCheck } from '../../validation/db';
import AccessLevel from '../../db/mongo/models/accessLevel';
import { CreateAccessLevelBody } from '../../validation/dto/accessLevel.dto';
import { DoNotAllowOnDefault } from '../../tools/request.tools';
import * as AccessLevelController from '../../controllers/accessLevel.controller';

//create router for add to routes file
const router: Router = Router();

//add route for register new AccessLevel
router.post(
	'',
	dtoValidationMiddleware(CreateAccessLevelBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	existCheck(AccessLevel, { $and: [{ name: 'name' }] }, 'AccessLevel already exists!'),
	AccessLevelController.create
);

//route for get access levels list
router.get('', AccessLevelController.getAll);

//route for get access level by id from DB
router.get('/:id', AccessLevelController.getById);

//add route for edit access level
router.patch(
	'/:id',
	DoNotAllowOnDefault(AccessLevel, { name: 'admin' }),
	DoNotAllowOnDefault(AccessLevel, { name: 'default' }),
	AccessLevelController.updateById
);

//add route for delete access level
router.delete(
	'/:id',
	DoNotAllowOnDefault(AccessLevel, { name: 'admin' }),
	DoNotAllowOnDefault(AccessLevel, { name: 'default' }),
	AccessLevelController.deleteById
);

export default router;
