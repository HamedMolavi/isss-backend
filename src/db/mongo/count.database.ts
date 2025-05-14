import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from '../../types/classes/error.class';
import { DefaultSchemaOptions, Model, PipelineStage, Schema } from 'mongoose';
import { idToCollectionName } from '../../tools/utils.tools';
export type Pipeline = string | { [K: string]: string } | PipelineStage;

export function countMiddleware(
	model: Model<
		any,
		{},
		{},
		{},
		Schema<any, Model<any, any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, any>
	>,
	options?: {
		next?: boolean;
		save?: string;
		send?: CallableFunction;
		aggregate?: (body: any) => PipelineStage[] | Promise<PipelineStage[]>;
		pipelines?: (body: any) => Pipeline[] | Promise<Pipeline[]>;
		countField?: (body: any) => string | Promise<string>;
	}
): RequestHandler {
	return async function middleware(req: Request, res: Response, next: NextFunction) {
		try {
			const result = await count(model, {
				aggregate: await options?.aggregate?.(req.body),
				pipelines: await options?.pipelines?.(req.body),
				countField: await options?.countField?.(req.body)
			});
			if (!!options?.next) {
				if (!!options.save) req.body[options.save] = result;
				else req.body['count'] = result;
				return next();
			}
			return res.status(200).json({
				success: true,
				data: !!options?.send ? options.send(result) : result
			});
		} catch (err: any) {
			return next(new ApiError(500, 'Internal server error , ' + err.message));
		}
	};
}

/**
 * Counts documents in a MongoDB collection using Mongoose aggregation.
 *
 * This function allows counting documents either via a predefined aggregation pipeline (`aggregate`),
 * a dynamically constructed pipeline (`pipeLines`), or a direct `countDocuments` query.
 *
 * @param model - The Mongoose model to query.
 * @param options - Optional configuration for aggregation.
 * @param options.aggregate - A predefined array of aggregation pipeline stages.
 * @param options.pipeLines - An array defining lookup and match conditions dynamically.
 *   - Can include:
 *     - A string referring to a field (e.g., `'model_camera_id'`).
 *     - A dot-separated string for nested lookups (e.g., `'model_camera_id.model_id'`).
 *     - An object for `$match` conditions (e.g., `{ 'model_camera_id.model_id.category': 'face' }`).
 * @param options.countField - The field to retrieve the count from in the aggregation result.
 *   - Defaults to `'count'` if not specified.
 *
 * @returns A promise resolving to the count of documents matching the conditions.
 *
 * ### Behavior:
 * 1. **Using `aggregate` (if provided)**:
 *    - Executes the given aggregation pipeline.
 *    - Returns the count from the first document in the result, or `0` if no results.
 *
 * 2. **Using `pipeLines` (if provided)**:
 *    - Dynamically constructs an aggregation pipeline based on the provided `pipeLines` array.
 *    - Handles `$lookup`, `$unwind`, and `$match` conditions automatically.
 *    - Executes the pipeline and returns the count.
 *
 * 3. **Default behavior (no options specified)**:
 *    - Uses `countDocuments()` to count all documents in the collection.
 *
 * ### Example Usage:
 * ```typescript
 * const count = await count(Model, {
 *   pipeLines: [
 *     'model_camera_id',
 *     'model_camera_id.model_id',
 *     { 'model_camera_id.model_id.category': 'face' }
 *   ],
 *   countField: 'total_schedules'
 * });
 * console.log(count); // Output: Number of matching documents
 * ```
 */

export async function count(
	model: Model<
		any,
		{},
		{},
		{},
		Schema<any, Model<any, any, any, any, any>, {}, {}, {}, {}, DefaultSchemaOptions, any>
	>,
	options?: {
		aggregate?: PipelineStage[];
		pipelines?: Pipeline[];
		countField?: string;
	}
) {
	if (!!options?.aggregate?.length) {
		const result = await model.aggregate(options.aggregate).exec();
		return result.length > 0 ? result[0][options.countField ?? 'count'] : 0;
	} else if (!!options?.pipelines?.length) {
		////////////
		const aggregate = options.pipelines
			.map((pipeline) => {
				if (typeof pipeline === 'string')
					if (pipeline.includes('.')) {
						const others = pipeline.split('.');
						const last = others.splice(-1)[0];
						return [
							{
								$lookup: {
									from: idToCollectionName(last),
									localField: pipeline,
									foreignField: '_id',
									as: pipeline
								}
							},
							{ $unwind: `$${pipeline}` }
						];
					} else
						return [
							{
								$lookup: {
									from: idToCollectionName(pipeline),
									localField: pipeline,
									foreignField: '_id',
									as: pipeline
								}
							},
							{ $unwind: `$${pipeline}` }
						];
				else if (typeof pipeline === 'object' && !Array.isArray(pipeline) && pipeline !== null) {
					if (Object.keys(pipeline)[0].startsWith('$')) return pipeline as PipelineStage;
					else return { $match: pipeline };
				}
				return undefined;
			})
			.flat()
			.filter((el) => !!el) as PipelineStage[];
		aggregate.push({ $count: options.countField ?? 'count' });
		const result = await model.aggregate(aggregate).exec();
		return result.length > 0 ? result[0][options.countField ?? 'count'] : 0;
	}
	return await model.countDocuments().exec();
}
