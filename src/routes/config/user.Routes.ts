import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../../types/classes/error.class';
import User from '../../db/mongo/models/user';
import { IUser, UserPasswordRequirements } from '../../types/interfaces/user.interface';
import { dtoValidationMiddleware } from '../../validation/dto';
import { CreateUserBody, UpdateUserBody } from '../../validation/dto/user.dto';
import { existCheck } from '../../validation/db';
import { passwordValidator } from '../../validation/password';
import { createMiddleware } from '../../db/mongo/create.database';
import { readByIdMiddleware, readMiddleware } from '../../db/mongo/read.database';
import { updateByIdMiddleware } from '../../db/mongo/update.database';
import { deleteByIdMiddleware } from '../../db/mongo/delete.database';
import { Types } from 'mongoose';

//create router for add to server
const router: Router = Router();

//add route for register new user
router.post(
	'',
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
	//verify password strength
	passwordValidator(UserPasswordRequirements),
	createMiddleware(['username', 'password', 'phone_number', 'camera_access', 'access_level', 'role'], User)
);

//route for get users list
router.get(
	'',
	readMiddleware(
		User,
		(search) => {
			return { username: { $regex: search, $options: 'i' } };
		},
		{ populate: true }
	)
);
//route for get user by id from DB
router.get('/:id', readByIdMiddleware(User, { populate: true }));
// TODO: delete this
router.patch(
	'/remove-this-route',
	passwordValidator(UserPasswordRequirements),
	async (req: Request, res: Response) => {
		try {
			const user = req.user;
			if (!user) throw new Error('Login first!');
			if (!req?.body?.current_password) throw Error('current password is required');
			if (!req?.body?.new_password) throw new Error('new password is required!');
			const userInfo = await User.findById(user?._id).exec();
			const isMatch = userInfo?.checkPassword(req?.body?.current_password);
			if (!isMatch) throw new Error('password is not correct');
			const newUser = await User.updateOne(
				{ id: user._id },
				{ $set: { password: req.body.new_password } },
				{ new: true, overwrite: true }
			).exec();
			res.status(201).send({ success: true, data: user });
		} catch (error: any) {
			res.status(400).send({ success: false, message: error.message });
		}
	}
);
//add route for edit user
router.patch(
	'/:id',
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
	updateByIdMiddleware(User, {
		update: {
			camera_access: {
				name: 'camera_access',
				fn: async (payload) => payload['camera_access'].map((str: string) => new Types.ObjectId(str))
			}
		}
	})
);
//add route for delete user
router.delete('/:id', deleteByIdMiddleware(User));

/*
router.patch("/reset-password/:id",accessCheck(Access.Configuration,"user"), async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get id from url
    let id: string = req.params.id as string;
    if (!id) {
      req.flash("error", "Please enter id");
      return next(new ApiError(400, "Please enter id"));
    }

    //get json from body request
    let { current_password, new_password } = req.body;

    let _user = await User.findById(id).exec();

    if (_user && current_password && new_password) {
      let resultVerifyPassword = getStrength(new_password);
      let isMatch = await _user.checkPassword(current_password, (err: any, isMatch: any) => {
        if (err) {
          return next(new ApiError(500, "internal server error , " + err.message));
        }
        return isMatch;
      });
      if (!isMatch) {
        return next(new ApiError(401, "Password is incorrect"));
      }
      if (resultVerifyPassword < 99) {
        req.flash("error", "Password is not strong enough");
        return next(new ApiError(400, "Password is not strong enough"));
      }

      _user.password = await setPassword(new_password, _user?.username);

    }

    let user = await User.findByIdAndUpdate(id, _user, {
      new: true,
    }).exec();

    //send not found if user not found
    if (!user) {
      req.flash("error", "User not found");
      return next(new ApiError(404, "User not found"));
    }

    //send response
    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error , " + err.message));
  }
});
*/

export default router;
