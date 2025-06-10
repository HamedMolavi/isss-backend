import { Router } from 'express';
import User from '../../db/mongo/models/user';
import { UserPasswordRequirements } from '../../types/interfaces/user.interface';
import { dtoValidationMiddleware } from '../../validation/dto';
import { CreateUserBody, UpdateUserBody, UpdatePasswordBody } from '../../validation/dto/user.dto';
import { existCheck } from '../../validation/db';
import { passwordValidator } from '../../validation/password';
import { passportGate } from '../../authentication/authorize.auth';
import { accessCheck, userCanGetHisInfo } from '../../authentication/accessCheck.auth';
import * as UserController from '../../controllers/user.controller';

const UserRouter: Router = Router();

const route_prefix = '';

// Create user - requires user access level
UserRouter.post(
	`${route_prefix}`,
	accessCheck('user'),
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

// Get all users - requires user access level
UserRouter.get(`${route_prefix}`, accessCheck('user'), UserController.getAll);

// Get user by ID - requires user access level with extra function for self-access
UserRouter.get(
	`${route_prefix}/:id`,
	accessCheck('user', { extraFunction: userCanGetHisInfo }),
	UserController.getById
);

UserRouter.patch(
	`${route_prefix}/password`,
	passportGate,
	dtoValidationMiddleware(UpdatePasswordBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'Please provide both current and new password'
	}),
	passwordValidator(UserPasswordRequirements, 'new_password'),
	UserController.updatePassword
);

// Update user - requires user access level with extra function for self-update
UserRouter.patch(
	`${route_prefix}/:id`,
	accessCheck('user', { extraFunction: userCanGetHisInfo }),
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

// Delete user - requires user access level
UserRouter.delete(`${route_prefix}/:id`, accessCheck('user'), UserController.deleteById);

// User activation/deactivation routes - requires user access level
UserRouter.patch(`${route_prefix}/:id/activate`, accessCheck('user'), UserController.activateUser);
UserRouter.patch(`${route_prefix}/:id/deactivate`, accessCheck('user'), UserController.deactivateUser);

export default UserRouter;
