import { NextFunction, Request, RequestHandler, Response } from 'express';
import { Model } from 'mongoose';
import { ApiError } from '../../types/classes/error.class';

/**
 * Middleware function to check if a document exists in the database based on a given query.
 * This function is designed to be used as middleware in an Express.js application,
 * allowing for the validation of whether a document exists in the database before proceeding with further operations.
 * It supports dynamic query construction based on the request body, customizable error messages, and optional surpass logic.
 *
 * @param {Model<any>} model - The Mongoose model to query against.
 * @param {any} query - The query to check for document existence. Can be an array, a function, or an object.
 * @param {string} [info] - Optional custom error message to display if the document exists.
 * @param {Object} [options] - Optional configuration object.
 * @param {(docs: any[], req: Request) => boolean} [options.surpass] - A callback function to determine if the existence check should be bypassed.
 *
 * @returns {RequestHandler} - An Express.js middleware function.
 *
 * @example
 * // Usage in an Express.js route
 * app.post('/create', existCheck(UserModel, ['email', 'username'], 'User already exists!'));
 */
export function existCheck(
	model: Model<any>,
	query: any,
	info?: string,
	options?: {
		surpass?: (docs: any[], req: Request) => boolean;
		notExist?: boolean;
	}
): RequestHandler {
	return async function middleware(req: Request, _res: Response, next: NextFunction) {
		// query can be:
		//    Array => state 0
		//    function => state 1
		//    object { [{},{},...] } => state 2

		let newQuery: { [key: string]: any } = {};
		let id: string = req.params.id ?? req.body.id;
		//  query
		let state = Array.isArray(query) ? 0 : typeof query === 'function' ? 1 : 2;

		switch (state) {
			case 2: // query is object -> { [{},{},...] }
				for (const key in query) {
					newQuery[key] = [];
					for (const [index, element] of query[key].entries()) {
						newQuery[key][index] = {};
						for (const item in element) {
							if (!req.body[item]) continue;
							newQuery[key][index][item] = req.body[item];
						}
					}
					newQuery[key] = newQuery[key].filter((elem: any) => !!Object.keys(elem).length);
				}
				break;
			case 1:
				newQuery = query(req.body);
				break;
			case 0: // query is object -> [{},{},...]
				for (const [index, element] of query.entries()) {
					newQuery[index] = {};
					for (const item in element) {
						newQuery[index][item] = req.body[item];
					}
				}
				break;
		}
		if (!newQuery.length && state !== 2) {
			return next();
		}
		let docs = (await model.find(newQuery).exec())?.filter((doc) => !id || id !== doc._id.toString());
		let flag = !!docs?.length !== !!options?.notExist && (!options?.surpass || !options.surpass(docs, req));
		if (flag) {
			req.flash('error', info ?? 'Already exists!');
			return next(new ApiError(400, info ?? 'Already exists!'));
		}
		next();
	};
}
