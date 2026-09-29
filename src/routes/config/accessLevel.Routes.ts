import { NextFunction, Request, Response, Router } from 'express';
import { dtoValidationMiddleware } from '../../validation/dto';
import AccessLevel from '../../db/mongo/models/accessLevel';
import { CreateAccessLevelBody } from '../../validation/dto/accessLevel.dto';
import { DoNotAllowOnDefault } from '../../tools/request.tools';
import * as AccessLevelController from '../../controllers/accessLevel.controller';
import { accessCheck } from '../../authentication/accessCheck.auth';
import { accessLevelCreationRateLimit } from '../../middleware/resource-rate-limit.middleware';
import { buildAccessLevelNameQuery, normalizeAccessLevelName } from '../../tools/accessLevel.tools';
import { ApiRes } from '../../utils/api.response';
import { HttpStatus } from '../../types/http_status';

//create router for add to routes file
const router: Router = Router();

// Apply access check middleware to all access level routes
// Only users with 'user' access (which controls user management) can manage access levels
// Additionally, only admin role can modify access levels
router.use(accessCheck('user'));

const normalizeAccessLevelPayload = (req: Request, _res: Response, next: NextFunction) => {
	if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
		req.body.name = normalizeAccessLevelName(req.body.name);
	}

	return next();
};

const rejectDuplicateAccessLevelName = async (req: Request, res: Response, next: NextFunction) => {
	if (!req.body.name) return next();

	const existingAccessLevel = await AccessLevel.findOne(
		buildAccessLevelNameQuery(req.body.name, { excludeId: req.params.id })
	)
		.collation({ locale: 'en', strength: 2 })
		.lean()
		.exec();

	if (existingAccessLevel) {
		return ApiRes(res, {
			status: HttpStatus.CONFLICT,
			msg: 'AccessLevel already exists!'
		});
	}

	return next();
};

//add route for register new AccessLevel
router.post(
	'',
	accessLevelCreationRateLimit,
	normalizeAccessLevelPayload,
	dtoValidationMiddleware(CreateAccessLevelBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	rejectDuplicateAccessLevelName,
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
	normalizeAccessLevelPayload,
	rejectDuplicateAccessLevelName,
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
