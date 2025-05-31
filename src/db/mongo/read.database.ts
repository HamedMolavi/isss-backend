import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from '../../types/classes/error.class';
import { DefaultSchemaOptions, Document, FilterQuery, Model as MongooseModel, Schema } from 'mongoose';
import deepmerge from 'deepmerge';
type modelType = MongooseModel<
	any,
	{},
	{},
	{},
	Schema<any, MongooseModel<any, any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, any>
>;

export async function read(model: any, options?: { query?: FilterQuery<any>; populate?: string }) {
	let docs: Document[] | any = !!options?.populate
		? await model.find(!!options?.query ? options?.query : {}).exec()
		: await model
				.find(!!options?.query ? options?.query : {})
				.populate(options?.populate)
				.exec();
	return docs;
}

export function readMiddleware(
	model: any,
	query?: (search: string) => FilterQuery<any> | Promise<FilterQuery<any>>,
	options?: {
		defaultQuery?: (bodyQueryPramas: any) => FilterQuery<any> | Promise<FilterQuery<any>>;
		aggregate?: boolean;
		forceAll?: boolean;
		next?: boolean;
		save?: string;
		send?: (doc: any, req: Request) => any | void | Promise<any | void>;
		populate?: boolean;
		forcePopulate?: string[];
		searchFromBody?: (body: { [key: string]: any }) => string;
		searchFromParams?: (params: { [key: string]: any }) => string;
		searchFromQuery?: (query: { [key: string]: any }) => string;
	}
): RequestHandler {
	return async function (req: Request, res: Response, next: NextFunction) {
		try {
			//get page from url
			let strPage = req.query.page as string;
			let page = !options?.forceAll && parseInt(strPage) > 0 ? parseInt(strPage) : 1;
			let search =
				(req.query.search as string) ||
				options?.searchFromBody?.(req.body) ||
				options?.searchFromParams?.(req.params) ||
				options?.searchFromQuery?.(req.query) ||
				'';
			//get perPage from url
			let strPerPage = req.query.perPage as string;
			let perPage =
				!!options?.forceAll || strPerPage?.toLowerCase() === 'all'
					? 1000000
					: parseInt(strPerPage) > 0
						? parseInt(strPerPage)
						: 1;
			let defaultQuery = await options?.defaultQuery?.({ ...req.body, ...req.query, ...req.params });
			const filterQuery =
				(!!query && !!search
					? !!defaultQuery
						? deepmerge(defaultQuery, await query(search))
						: await query(search)
					: defaultQuery) ?? {};
			let docs: Document[] =
				!!options?.aggregate && !!query && !!search
					? (
						await model
							.aggregate(filterQuery)
							.limit(perPage)
							.skip(perPage * (page - 1))
							.exec()
					)?.map((doc: any) => new model(doc))
					: await model
						.find(filterQuery)
						.limit(perPage)
						.skip(perPage * (page - 1))
						.exec();
			//return response not found to client if not found
			if (!docs.length && !options?.next) {
				req.flash('error', model.collection.collectionName + ' not found');
				return next(new ApiError(404, model.collection.collectionName + ' not found'));
			}
			const total =
				!!options?.aggregate && !!query && !!search
					? await model
							.aggregate(filterQuery?.concat({ $count: 'documentCount' }))
							.exec()
							.then((r: any) => r[0]['documentCount'])
					: await model.countDocuments(filterQuery).exec();
			// (!!query && !!search)
			//   ? await model.countDocuments(!!defaultQuery ? deepmerge(defaultQuery, await query(search)) : await query(search)).exec()
			//   : await model.countDocuments(defaultQuery ?? {}).exec();
			if (
				!!docs.length &&
				!!options?.populate &&
				(!!req.query.populate || !!options?.forcePopulate?.length)
			) {
				let populates: string[] = [];

				// Handle req.query.populate properly - it can be string or string[]
				if (req.query.populate) {
					if (typeof req.query.populate === 'string') {
						req.query.populate.split(',').forEach((el) => populates.push(el.trim()));
					} else if (Array.isArray(req.query.populate)) {
						(req.query.populate as string[]).forEach((el) => {
							if (typeof el === 'string') populates.push(el.trim());
						});
					}
				}

				if (!!options?.forcePopulate)
					options.forcePopulate.forEach((p) => {
						if (!populates.includes(p)) populates.push(p);
					});
				let idx = populates.length - 1;
				while (!!populates.length && idx >= 0) {
					const populate = populates[idx];
					let keys = getAllKeys(docs[0].toObject());
					let populatePath = keys.find(
						(key) => key === populate || key.split('.').some((el) => el === populate)
					);
					if (!!populatePath) {
						for (let i = 0; i < docs.length; i++) docs[i] = await docs[i].populate(populatePath);
						populates.splice(idx, 1);
						idx = populates.length - 1;
					} else idx--;
				}
			}
			let data = (
				await Promise.all(docs.map((doc) => (!!options?.send ? options.send(doc, req) : doc)))
			).filter((doc) => doc !== undefined);

			if (!!options?.next) {
				if (!!options.save) req.body[options.save] = data;
				else req.body['docs'] = data;
				return next();
			}
			data = await Promise.all(
				(await Promise.all(data.map(async (el) => (await el?.toJSON?.()) ?? el))).map(async (el) => {
					for (const [key, val] of Object.entries(el)) {
						el[key] = (await (val as any)?.toJSON?.()) ?? val;
					}
					return el;
				})
			);
			//return response to client
			return res.status(200).json({
				success: true,
				data,
				page: page,
				perPage: perPage,
				total,
				pages: Math.ceil(total / perPage)
			});
		} catch (err: any) {
			return next(new ApiError(500, 'internal server error , ' + err.message));
		}
	};
}

export function readByIdMiddleware(
	model: any,
	options?: {
		next?: boolean;
		save?: string;
		send?: CallableFunction;
		populate?: boolean;
		idFromReq?: (req: Request) => string | undefined;
		forcePopulate?: string[];
	},
	_id?: string
): RequestHandler {
	return async function middleware(req: Request, res: Response, next: NextFunction) {
		try {
			//get id from params in url
			let id: string = options?.idFromReq?.(req) ?? _id ?? req.params.id ?? 'dummy-id';
			//query for get docs by id from DB
			let doc = await model.findById(id).exec();

			//return error if docs not found
			if (!doc) {
				req.flash('error', model.collection.collectionName + ' not found');
				return next(new ApiError(404, model.collection.collectionName + ' not found'));
			}

			if (!!options?.populate && (!!req.query.populate || !!options?.forcePopulate?.length)) {
				// Handle req.query.populate properly - it can be string or string[]
				let populates: string[] = [];
				if (req.query.populate) {
					if (typeof req.query.populate === 'string') {
						req.query.populate.split(',').forEach((el) => populates.push(el.trim()));
					} else if (Array.isArray(req.query.populate)) {
						(req.query.populate as string[]).forEach((el) => {
							if (typeof el === 'string') populates.push(el.trim());
						});
					}
				}

				if (!!options?.forcePopulate)
					options.forcePopulate.forEach((p) => {
						if (!populates.includes(p)) populates.push(p);
					});
				let idx = populates.length - 1;
				while (!!populates.length && idx >= 0) {
					const populate = populates[idx];
					let keys = getAllKeys(doc.toObject());
					let populatePath = keys.find(
						(key) => key === populate || key.split('.').some((el) => el === populate)
					);
					if (!!populatePath) {
						doc = await doc.populate(populatePath);
						populates.splice(idx, 1);
						idx = populates.length - 1;
					} else idx--;
				}
			}

			if (!!options?.next) {
				if (!!options.save) req.body[options.save] = doc;
				else req.body['doc'] = doc;
				return next();
			}
			//send response to client
			return res.status(200).json({
				success: true,
				data: !!options?.send ? await options.send(doc, req) : await doc.toJSON()
			});
		} catch (err: any) {
			if (err.kind === 'ObjectId') return next(new ApiError(400, `id must be valid: ${req.params.id}`));
			else return next(new ApiError(500, 'internal server error , ' + err.message));
		}
	};
}

export async function readById(
	model: modelType,
	id: string | Schema.Types.ObjectId,
	options?: { populate?: any; forcePopulate?: string[] }
) {
	let doc = await model.findById(id).exec();

	if (!!options?.populate) {
		let populates =
			options.populate instanceof String
				? options.populate.split(',').map((el) => el.trim())
				: ((options.populate as string[])?.map((el) => el.trim()) ?? []);
		if (!!options?.forcePopulate)
			options.forcePopulate.forEach((p) => {
				if (!populates.includes(p)) populates.push(p);
			});
		let idx = populates.length - 1;
		while (!!populates.length && idx >= 0) {
			const populate = populates[idx];
			let keys = getAllKeys(doc.toObject());
			let populatePath = keys.find((key) => key === populate || key.split('.').some((el) => el === populate));
			if (!!populatePath) {
				doc = await doc.populate(populatePath);
				populates.splice(idx, 1);
				idx = populates.length - 1;
			} else idx--;
		}
	}
	return doc;
}

function getAllKeys(obj: { [key: string]: any }) {
	let keys: string[] = [];
	Object.keys(obj).forEach((el) => keys.push(el));
	for (const key in obj) {
		if (obj[key] instanceof Object && !(obj[key] instanceof Array))
			getAllKeys(obj[key]).forEach((el) => keys.push(`${key}.${el}`));
	}
	return keys;
}
