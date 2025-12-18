import { Request, Response, NextFunction } from 'express';
import mongoose, { isObjectIdOrHexString } from 'mongoose';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';

import AccessLevel from '../db/mongo/models/accessLevel';
import { IAccessLevel } from '../types/interfaces/accessLevel.interface';
import { UserLogger } from '../logger/user.logger';

// CRUD => Create, Read, Update, Delete
const accessTranslation = {
	POST: 'Create',
	GET: 'Read',
	PATCH: 'Update',
	DELETE: 'Delete'
};

// PGPD => POST, GET, PATCH, DELETE
const accessCharPositions = {
	POST: -4, // minus for reversing
	GET: -3,
	PATCH: -2,
	DELETE: -1
};

export function userCanGetHisInfo(req: Request) {
	// Check if user is authenticated
	if (!req.user) {
		return false;
	}

	const probableParamId = req.path.split('/').find((el) => isObjectIdOrHexString(el));
	if (
		['GET', 'PATCH'].includes(req.method) &&
		!!probableParamId &&
		probableParamId === req.user._id.toString()
	) {
		//user can not change his "role" or "access_level"
		req.body.role = undefined;
		req.body.access_level = undefined;
		return true;
	}
	return false; // no access
}

export function accessCheck(
	access: keyof IAccessLevel,
	options?: {
		bitMapNumberFromRight?: number;
		extraFunction?: (req: Request, userAccess: number | undefined) => boolean | Promise<boolean>;
	}
) {
	return async function middleware(req: Request, res: Response, next: NextFunction) {
		const user = req.user;
		const method = req.method as 'GET' | 'POST' | 'DELETE' | 'PATCH';

		// Check if user is authenticated
		if (!user) {
			UserLogger.permissionCheckFailed(req, access, req.originalUrl, req.method, 'User not authenticated');
			req.flash('error', 'Access denied');
			return ApiRes(res, {
				status: HttpStatus.FORBIDDEN,
				msg: 'Access denied'
			});
		}

		// Check extraFunction first (e.g., user accessing their own info)
		if (!!options?.extraFunction && (await options.extraFunction(req, undefined))) {
			UserLogger.permissionCheckSuccess(
				req,
				access,
				req.originalUrl,
				`${accessTranslation[method]} (via extra function)`
			);
			return next();
		}

		// Check if user has access_level
		if (!user.access_level) {
			UserLogger.permissionCheckFailed(
				req,
				access,
				req.originalUrl,
				req.method,
				'User has no access level assigned'
			);
			req.flash('error', 'Access denied');
			return ApiRes(res, {
				status: HttpStatus.FORBIDDEN,
				msg: 'Access denied'
			});
		}

		const userAccessLevel = await AccessLevel.findById(new mongoose.Types.ObjectId(user.access_level));
		const userAccess = userAccessLevel?.[access] as number | undefined;

		if (userAccessLevel && userAccess && hasAccess(userAccess, options?.bitMapNumberFromRight ?? method)) {
			UserLogger.permissionCheckSuccess(req, access, req.originalUrl, accessTranslation[method]);
			return next();
		}

		UserLogger.permissionCheckFailed(
			req,
			access,
			req.originalUrl,
			accessTranslation[method],
			'Insufficient access level'
		);
		req.flash('error', 'Access denied');
		return ApiRes(res, {
			status: HttpStatus.FORBIDDEN,
			msg: 'Access denied'
		});
	};
}

export function hasAccess(
	userAccess: number,
	methodOrNumber: 'GET' | 'POST' | 'DELETE' | 'PATCH' | number
): boolean {
	const binUserAccess = '0000' + (userAccess >>> 0).toString(2);
	if (typeof methodOrNumber === 'number') return binUserAccess.at(-methodOrNumber) == '1';
	return binUserAccess.at(accessCharPositions[methodOrNumber]) == '1';
}

export function roleCheck(
	role: string,
	options?: { extraFunction?: (req: Request, res: Response) => boolean }
) {
	return async function middleware(req: Request, res: Response, next: NextFunction) {
		const user = req.user;

		// Check if user is authenticated
		if (!user) {
			UserLogger.permissionCheckFailed(req, 'role', req.originalUrl, req.method, 'User not authenticated');
			req.flash('error', 'Access denied');
			return ApiRes(res, {
				status: HttpStatus.FORBIDDEN,
				msg: 'Access denied'
			});
		}

		// Check if user has role property
		if (!user.role) {
			UserLogger.permissionCheckFailed(req, 'role', req.originalUrl, req.method, 'User has no role assigned');
			req.flash('error', 'Access denied');
			return ApiRes(res, {
				status: HttpStatus.FORBIDDEN,
				msg: 'Access denied'
			});
		}

		if (user.role === role) {
			UserLogger.permissionCheckSuccess(req, 'role', req.originalUrl, `Role: ${role}`);
			return next();
		}

		if (!!options?.extraFunction && options.extraFunction(req, res)) {
			UserLogger.permissionCheckSuccess(req, 'role', req.originalUrl, `Role: ${role} (via extra function)`);
			return next();
		}

		UserLogger.permissionCheckFailed(
			req,
			'role',
			req.originalUrl,
			req.method,
			`Required role: ${role}, User role: ${user.role}`
		);
		req.flash('error', 'Access denied');
		return ApiRes(res, {
			status: HttpStatus.FORBIDDEN,
			msg: 'Access denied'
		});
	};
}

export function paramIdExistsInCameraWhiteList(options?: {
	_id?: string;
	idFromReq?: (req: Request) => string | undefined;
}) {
	return async function middleware(req: Request, res: Response, next: NextFunction) {
		const id = options?._id ?? options?.idFromReq?.(req) ?? req.params.id;
		if (!id) return next();

		const user = req.user;

		// Check if user is authenticated
		if (!user) {
			UserLogger.permissionCheckFailed(
				req,
				'cameraWhiteList',
				req.originalUrl,
				req.method,
				'User not authenticated'
			);
			req.flash('error', 'Access denied');
			return ApiRes(res, {
				status: HttpStatus.FORBIDDEN,
				msg: 'Access denied'
			});
		}

		// Check if user has role property
		if (!user.role) {
			UserLogger.permissionCheckFailed(
				req,
				'cameraWhiteList',
				req.originalUrl,
				req.method,
				'User has no role assigned'
			);
			req.flash('error', 'Access denied');
			return ApiRes(res, {
				status: HttpStatus.FORBIDDEN,
				msg: 'Access denied'
			});
		}

		if (user.role === 'admin' || !!user.camera_access?.map((el) => el.toString())?.includes(id)) {
			UserLogger.permissionCheckSuccess(req, 'cameraWhiteList', req.originalUrl, `Camera ID: ${id}`);
			return next();
		}

		UserLogger.permissionCheckFailed(
			req,
			'cameraWhiteList',
			req.originalUrl,
			req.method,
			`Camera ID ${id} not in whitelist`
		);
		req.flash('error', 'Access denied');
		return ApiRes(res, {
			status: HttpStatus.FORBIDDEN,
			msg: 'Access denied'
		});
	};
}
// export function cameraAccessCheck(camerasFieldName: string, options?: {
//   next?: boolean,
//   save?: string,
//   send?: CallableFunction,
// }) {
//   return async function middleware(req: Request, res: Response, next: NextFunction) {
//     const user = req.user;
//     type camera = (Document<unknown, any, ICamera> & Omit<ICamera & Required<{ _id: Types.ObjectId; }>, never>);
//     let accessedCameras: camera[] = user.role === "admin"
//       ? req.body[camerasFieldName]
//       : req.body[camerasFieldName].filter((doc: camera) => user.camera_access?.includes(doc._id));

//     if (!!options?.next) {
//       if (!!options.save) req.body[options.save] = accessedCameras;
//       else req.body["docs"] = accessedCameras;
//       return next();
//     };
//     //return response to client
//     let strPage = req.query.page as string;
//     let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
//     let strPerPage = req.query.perPage as string;
//     let perPage = strPerPage?.toLowerCase() === "all"
//       ? 10000
//       : parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
//     return res.status(200).json({
//       success: true,
//       data: !!options?.send
//         ? accessedCameras.reduce((pre, cur) => {
//           const fn = options.send as CallableFunction;
//           const el = fn(cur);
//           if (!!el) pre.push(el);
//           return pre;
//         }, [] as Document<any, any, any>[])
//         : accessedCameras,
//       page: page,
//       perPage: perPage,
//       total: await Camera.countDocuments().exec(),
//       pages: Math.ceil(accessedCameras.length / perPage),
//     });
//   };
// };
