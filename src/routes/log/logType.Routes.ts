import { Router } from 'express';
import { dtoValidationMiddleware } from '../../validation/dto';
import { existCheck } from '../../validation/db';
import { createMiddleware } from '../../db/mongo/create.database';
import { readByIdMiddleware, readMiddleware } from '../../db/mongo/read.database';
import { updateByIdMiddleware } from '../../db/mongo/update.database';

import { DoNotAllowOnDefault } from '../../tools/request.tools';
import { CreateLogTypeBody } from '../../validation/dto/logType.dto';
import { LogType } from '../../db/mongo/models/logType';
import { LOG_TYPE_KEYS } from '../../types/enums/logType.enum';

const LogTypeRouter: Router = Router();

const route_prefix = '';

// Add route for register new LogType
LogTypeRouter.post(
	`${route_prefix}`,
	dtoValidationMiddleware(CreateLogTypeBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	existCheck(LogType, { $and: [{ name: 'name' }] }, 'Log Type already exists!'),
	createMiddleware(['name', ...Object.keys(LOG_TYPE_KEYS)], LogType)
);

LogTypeRouter.get(`${route_prefix}`, readMiddleware(LogType));

LogTypeRouter.get(`${route_prefix}/:id`, readByIdMiddleware(LogType));

LogTypeRouter.patch(
	`${route_prefix}/:id`,
	DoNotAllowOnDefault(LogType, { name: 'default' }),
	updateByIdMiddleware(LogType, {
		ignore: ['name']
	})
);

export default LogTypeRouter;
