import { Router } from 'express';
import User from '../../db/mongo/models/user';
import { UserPasswordRequirements } from '../../types/interfaces/user.interface';
import { dtoValidationMiddleware } from '../../validation/dto';
import { CreateUserBody, UpdateUserBody } from '../../validation/dto/user.dto';
import { existCheck } from '../../validation/db';
import { passwordValidator } from '../../validation/password';
import * as UserController from '../../controllers/user.controller';

const UserRouter: Router = Router();

const route_prefix = '';

UserRouter.post(
	`${route_prefix}`,
	dtoValidationMiddleware(CreateUserBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	existCheck(
		User,
		{ $or: [{ username: 'username' }, { phone_number: 'phone_number' }] },
		'User or Phone number already exists!'
	),
	passwordValidator(UserPasswordRequirements),
	UserController.create
);

UserRouter.get(`${route_prefix}`, UserController.getAll);

UserRouter.get(`${route_prefix}/:id`, UserController.getById);

UserRouter.patch(
	`${route_prefix}/remove-this-route`,
	passwordValidator(UserPasswordRequirements),
	UserController.updatePassword
);

UserRouter.patch(
	`${route_prefix}/:id`,
	dtoValidationMiddleware(UpdateUserBody, {
		skipMissingProperties: true,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	existCheck(
		User,
		{ $or: [{ username: 'username' }, { phone_number: 'phone_number' }] },
		'User or Phone number already exists!'
	),
	UserController.updateById
);

UserRouter.delete(`${route_prefix}/:id`, UserController.deleteById);

export default UserRouter;
