import { Router } from 'express';
import { dtoValidationMiddleware } from '../../validation/dto';
import { existCheck } from '../../validation/db';
import { createMiddleware } from '../../db/mongo/create.database';
import { readByIdMiddleware, readMiddleware } from '../../db/mongo/read.database';
import { updateByIdMiddleware } from '../../db/mongo/update.database';
import { accessCheck } from '../../authentication/accessCheck.auth';

import { DoNotAllowOnDefault } from '../../tools/request.tools';
import { CreateLogTypeBody } from '../../validation/dto/logType.dto';
import { LogType } from '../../db/mongo/models/logType';
import { LOG_TYPE_KEYS } from '../../types/enums/logType.enum';
import { logTypeCreationRateLimit } from '../../middleware/resource-rate-limit.middleware';

const LogTypeRouter: Router = Router();

const route_prefix = '';

// Add route for register new LogType
LogTypeRouter.post(
	`${route_prefix}`,
	accessCheck('systemLog'),
	logTypeCreationRateLimit,
	dtoValidationMiddleware(CreateLogTypeBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	existCheck(LogType, { $and: [{ name: 'name' }] }, 'Log Type already exists!'),
	createMiddleware(['name', ...Object.keys(LOG_TYPE_KEYS)], LogType)
);

LogTypeRouter.get(`${route_prefix}`, accessCheck('systemLog'), readMiddleware(LogType));

LogTypeRouter.get(`${route_prefix}/:id`, accessCheck('systemLog'), readByIdMiddleware(LogType));

LogTypeRouter.patch(
	`${route_prefix}/:id`,
	accessCheck('systemLog'),
	DoNotAllowOnDefault(LogType, { name: 'default' }),
	updateByIdMiddleware(LogType, {
		ignore: ['name']
	})
);

export default LogTypeRouter;
