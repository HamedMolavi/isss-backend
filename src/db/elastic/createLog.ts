import { NextFunction, RequestHandler, Request, Response } from 'express';
import { ApiError } from '../../types/classes/error.class';
import { postElastic } from './connect.database';

export function createLogMiddleware(
	index_name: string,
	Obj: any,
	inputs: Array<string>,
	options?: {
		next?: boolean;
		save?: string;
	}
): RequestHandler {
	return async function (req: Request, res: Response, next: NextFunction) {
		try {
			const data = {};
			const inputObj: { [key: string]: any } = {};
			for (const input of inputs) {
				// inputObj[input] = req.body[input]
				inputObj[input] = req.body[input];
			}
			const plate = new Obj(inputObj);

			postElastic(index_name, plate.toObject());

			if (!!options?.next) {
				if (!!options.save) req.body[options.save] = data;
				else req.body['docs'] = data;
				return next();
			}

			//return response to client
			return res.status(201).json({
				success: true,
				data: plate
				//  page: page,
				//  perPage: perPage,
				//   total: data.length,
				//   pages: Math.ceil((data.length) / perPage),
			});
		} catch (err: any) {
			if (err.meta?.body?.error?.type === 'index_not_found_exception')
				return next(new ApiError(500, 'internal server error , ' + err.message));
			return next(new ApiError(500, 'internal server error , ' + err.message));
		}
	};
}
