import { Request, Router } from 'express';
import { dtoValidationMiddleware } from '../../validation/dto';
import { ReadSimilarVectorsBody } from '../../validation/dto/similarity.dto';
import { readByIdElasticMiddleware, readElasticMiddleware } from '../../db/elastic/read.logs';
import { injectDataMiddleware } from '../../tools/request.tools';
import { readMiddleware } from '../../db/mongo/read.database';
import Camera from '../../db/mongo/models/camera';
import { dataCollector, sendDataMiddleware, unifiedSendFunction } from '../../tools/middleware.tools';
import { cumulativeSendFunction, daySendFunction } from '../../tools/track.tools';
import Time from '../../tools/time.tools';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

/**
 * ===================================
 * SIMILARITY SEARCH ROUTES
 * ===================================
 *
 * This router handles similarity-based face recognition searches using cosine similarity
 * to find similar face vectors in Elasticsearch logs.
 *
 * Endpoints:
 * - POST /tree/:id? - Get similarity results in hierarchical tree format grouped by day
 * - POST /table/:id? - Get similarity results in flat table format
 * - POST /cumulative/:id? - Get cumulative similarity statistics over time range
 *
 * All endpoints support:
 * - Searching by existing log_id or providing a custom vector
 * - Date range filtering
 * - Similarity threshold configuration
 */

// Create router for similarity search endpoints
const router: Router = Router();

/**
 * ===================================
 * INPUT VALIDATION
 * ===================================
 */

/**
 * POST /:type(tree|table|cumulative)
 * Validate request body for similarity search
 * Ensures required fields (vector or log_id, threshold, date ranges) are present
 */
router.post(
	'/:type(tree|table|cumulative)',
	dtoValidationMiddleware(ReadSimilarVectorsBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	})
);

/**
 * ===================================
 * DATA INITIALIZATION
 * ===================================
 */

/**
 * Initialize empty database collection objects in request body
 * These will be populated later with related MongoDB data (cameras, personnel, etc.)
 * for enriching Elasticsearch log results
 */
router.use('', (req, res, next) => {
	Object.assign(req.body, {
		db_cameras: {},
		db_personnel: {},
		db_brands: {},
		db_colors: {},
		db_sections: {},
		db_departments: {},
		db_cars: {}
	});
	next();
});

/**
 * ===================================
 * TARGET VECTOR RESOLUTION
 * ===================================
 */

/**
 * GET /:type(tree|table|cumulative)/:id?
 * Resolve the target face vector for similarity comparison
 *
 * Two modes:
 * 1. If log_id is provided in body: Fetch vector from existing Elasticsearch log
 * 2. If vector is provided in body: Use the provided 512-dimensional vector directly
 *
 * Validates that vector is a 512-element number array (face embedding standard)
 */
router.use(
	'/:type(tree|table|cumulative)/:id?',
	readByIdElasticMiddleware(`${process.env['FACE_INDEX'] ?? 'face_log'}`, {
		next: true,
		save: 'targetVector',
		idFromReq: (req) => req.body?.['log_id'], // if log_id is provided in body, otherwise return undefined to read from req.params.id
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		send: (log: any, req) => {
			// Use vector from log if log exists, otherwise use vector from request body
			const targetVector = log?._id ? log?.['vector'] : req.body?.['vector'];

			// Validate vector format: must be array of 512 numbers (standard face embedding dimension)
			if (
				!Array.isArray(targetVector) ||
				targetVector.length !== 512 ||
				!targetVector.every((num: unknown) => typeof num === 'number')
			) {
				throw Error('Target face log has disordered vector!');
			}

			return targetVector;
		}
	})
);

/**
 * ===================================
 * TABLE VIEW ENDPOINT
 * ===================================
 */

/**
 * GET /table/:id?
 * Search for similar faces and return results in flat table format
 *
 * Uses cosine similarity scoring to find matching face vectors
 * Results include all matching logs within the similarity threshold
 *
 * Note: forceAll removed to prevent memory overflow with large result sets
 * Use pagination parameters (page, perPage) to retrieve large datasets
 */
router.use(
	'/table/:id?',
	readElasticMiddleware(`${process.env['FACE_INDEX'] ?? 'face_log'}`, {
		forceAll: false,
		searchFromReq: searchFunction,
		send: unifiedSendFunction
	})
);

/**
 * ===================================
 * TREE & CUMULATIVE VIEW ENDPOINTS
 * ===================================
 */

/**
 * GET /:type(tree|cumulative)/:id?
 * Search for similar faces and prepare data for hierarchical or cumulative views
 *
 * Pipeline:
 * 1. Search Elasticsearch for similar face vectors using cosine similarity
 * 2. Collect and group results by tracking patterns (same person over time)
 * 3. Fetch camera metadata from MongoDB to enrich results
 */
router.use(
	'/:type(tree|cumulative)/:id?',
	// Search Elasticsearch for similar face logs
	readElasticMiddleware(`${process.env['FACE_INDEX'] ?? 'face_log'}`, {
		searchFromReq: searchFunction,
		forceAll: true,
		save: 'similars',
		next: true
	}),
	// Group similar logs into tracking data (tracks same person across multiple sightings)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	injectDataMiddleware((body: any) => dataCollector(body['similars'] ?? []), { injData: 'trackData' }),
	// Fetch all camera data to enrich tracking results with camera information
	readMiddleware(Camera, undefined, { next: true, forceAll: true, save: 'cameras' })
);

/**
 * GET /tree/:id?
 * Return similarity results in hierarchical tree format grouped by day
 *
 * Each track is formatted with daily breakdown showing:
 * - Entry/exit times per day
 * - Camera locations visited
 * - Duration and frequency of appearances
 */
router.use(
	'/tree/:id?',
	sendDataMiddleware(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(body: any) =>
			// Transform each track into day-based hierarchical structure
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			body['trackData']?.map((track: any) =>
				daySendFunction(track, {
					body,
					query: { timez: body.timez as string | undefined }
				} as unknown as Request)
			),
		{ forceAll: true }
	)
);

/**
 * GET /cumulative/:id?
 * Return cumulative similarity statistics over the specified time range
 *
 * Aggregates all sightings into daily buckets showing:
 * - Total appearances per day
 * - Trend analysis over time
 * - Activity patterns
 */
router.use(
	'/cumulative/:id?',
	// Calculate day range for cumulative statistics
	injectDataMiddleware(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(body: any) => {
			// If explicit date range provided, use it
			if (body?.['date_start'] && body?.['date_end']) {
				const startDay = Math.floor(
					new Date(
						body.date_start + Time.getUtcOffset('Asia/Tehran').toString().replace('+', ' ')
					).getTime() / 86400000
				);
				const endDay = Math.floor(
					new Date(body.date_end + Time.getUtcOffset('Asia/Tehran').toString().replace('+', ' ')).getTime() /
						86400000
				);
				return {
					day_start: startDay,
					day_end: endDay
				};
			} else {
				// Otherwise, calculate range from tracking data
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const sortedData: any = body?.trackData?.sort((a: any, b: any) => (a.day ?? 0) - (b.day ?? 0));
				return {
					day_start: sortedData?.at(0)?.day ?? 0,
					day_end: (sortedData?.at(-1)?.day ?? 0) + 1
				};
			}
		},
		{ spread: true }
	),
	// Send cumulative statistics
	sendDataMiddleware(cumulativeSendFunction, { forceAll: true })
);

/**
 * ===================================
 * HELPER FUNCTIONS
 * ===================================
 */

/**
 * Build Elasticsearch query for similarity search using cosine similarity
 *
 * @param req - Express request containing search parameters
 * @returns Elasticsearch query object with script_score for cosine similarity
 *
 * Query features:
 * - Uses cosine similarity between target vector and all stored face vectors
 * - Supports date range filtering
 * - Applies similarity threshold (min_score)
 * - Handles null/empty vectors gracefully
 */
function searchFunction(req: Request) {
	const body = req.body;

	// Convert threshold from percentage (0-100) to decimal (0-1)
	const threshold = Number(body['threshold'] ?? 50) / 100;

	// Base query: match all documents
	let query: QueryDslQueryContainer = { match_all: {} };

	// Add date range filter if specified
	if (body?.['date_start'] || body?.['date_end']) {
		const startTime = new Date(
			body.date_start + ' 00:01' + Time.getUtcOffset(body.timezone ?? 'Asia/Tehran')
		).getTime();
		const endTime = new Date(
			body.date_end + ' 00:01' + Time.getUtcOffset(body.timezone ?? 'Asia/Tehran')
		).getTime();

		query = {
			bool: {
				must: [
					{
						range: {
							timestamp: {
								gte: startTime,
								lte: endTime
							}
						}
					}
				],
				should: []
			}
		};
	}

	return {
		// Only return results above similarity threshold
		min_score: threshold + 1,
		query: {
			script_score: {
				query,
				script: {
					// Painless script to calculate cosine similarity
					// cosineSimilarity returns value in [-1, 1], we add 1 to shift to [0, 2]
					source: `
          double result = 0;
          if (doc['vector'] != null && doc['vector'].length > 0) {
            result = cosineSimilarity(params.query_vector, 'vector') + 1.0;
          } else {
            result = 0; // Example of setting a default score
          }
          return result;
        `,
					params: {
						query_vector: body['targetVector'] ?? []
					}
				}
			}
		}
	};
}
export default router;
