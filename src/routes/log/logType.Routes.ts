import { Router } from 'express';
import { dtoValidationMiddleware } from '../../validation/dto';
import { existCheck } from '../../validation/db';
import { createMiddleware } from '../../db/mongo/create.database';
import { readByIdMiddleware, readMiddleware } from '../../db/mongo/read.database';
import { updateByIdMiddleware } from '../../db/mongo/update.database';
import { deleteByIdMiddleware } from '../../db/mongo/delete.database';
import { DoNotAllowOnDefault } from '../../tools/request.tools';
import { CreateLogTypeBody } from '../../validation/dto/logType.dto';
import { LogType } from '../../db/mongo/models/logType';
import { LOG_TYPE_KEYS } from '../../types/enums/logType.enum';

//create router for add to routes file
const router: Router = Router();

//add route for register new LogType
router.post(
	'',
	dtoValidationMiddleware(CreateLogTypeBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	existCheck(LogType, { $and: [{ name: 'name' }] }, 'Log Type already exists!'),
	createMiddleware(['name', ...Object.keys(LOG_TYPE_KEYS)], LogType)
);

router.get('', readMiddleware(LogType));

router.get('/:id', readByIdMiddleware(LogType));

router.patch(
	'/:id',
	DoNotAllowOnDefault(LogType, { name: 'default' }),
	updateByIdMiddleware(LogType, {
		ignore: ['name']
	})
);

// router.delete('/:id', DoNotAllowOnDefault(LogType, { name: 'default' }), deleteByIdMiddleware(LogType));

export default router;
