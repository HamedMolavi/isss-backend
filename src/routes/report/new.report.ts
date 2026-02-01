import { Request, Response, NextFunction, Router } from 'express';
import {
	readByIdElastic,
	readByIdElasticMiddleware,
	readElasticMiddleware
} from '../../db/elastic/read.logs';
import Camera from '../../db/mongo/models/camera';
import Personnel from '../../db/mongo/models/personnel';
import Time from '../../tools/time.tools';
import { dtoValidationMiddleware } from '../../validation/dto';
import {
	ReportFaceBody,
	ReportHumanBody,
	ReportObjectBody,
	ReportPlateBody
} from '../../validation/dto/report.dto';
import CarBrand from '../../db/mongo/models/carBrand';
import CarColor from '../../db/mongo/models/carColor';
import { stringPersianToStringEnglish, stringPlateToJson } from '../../tools/plate.tools';
import { platesToStrings } from '../../tools/car.tools';
import { SearchRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ApiError } from '../../types/classes/error.class';
import { deleteByIdElasticMiddleware, deleteElasticMiddleware } from '../../db/elastic/delete.logs';
import { faceCols, plateCols, sendExcelMiddleware } from '../../tools/excel.tools';
import { isValidObjectId } from 'mongoose';
import Section from '../../db/mongo/models/section';
import Department from '../../db/mongo/models/department';
import PersonImage from '../../db/mongo/models/personImage';
import { plateToQueryJSON } from '../../tools/elastic.tools';
import { DataImportExportLogger } from '../../logger/data-input-output.logger';
import { accessCheck } from '../../authentication/accessCheck.auth';

/**
 * ===================================
 * REPORT ROUTES
 * ===================================
 *
 * This router handles report generation and data retrieval from Elasticsearch logs
 * for different event types (plate, face, human, object detection, sabotage, search).
 *
 * Features:
 * - GET/POST endpoints for filtering and searching logs
 * - Excel export functionality with access control
 * - Data backup and deletion operations
 * - Multi-index support (plate_log, face_log, human_log, etc.)
 * - Role-based camera access filtering
 * - Time range filtering with timezone support
 * - Log enrichment with camera, personnel, vehicle metadata
 * - Direction filtering for plate logs (front, back, or all)
 */

// Create router for report endpoints
const router: Router = Router();

/**
 * ===================================
 * CONFIGURATION
 * ===================================
 */

// Elasticsearch index for full frame images
const frame_index = process.env['FRAME_INDEX'] ?? 'frame_log';

/**
 * Searchable fields for each log type
 * Used in GET requests with search query parameter
 * Defines which fields support regex search for each index type
 */
const importantFields = {
	face: ['description', 'name', 'camera_name', 'personnel_code'],
	plate: [
		'description',
		'owner',
		'camera_name',
		// Convert Persian plate numbers to English for search
		function plate_number(input: string) {
			return stringPersianToStringEnglish(input);
		}
	]
};

/**
 * ===================================
 * INPUT VALIDATION
 * ===================================
 */

/**
 * POST /:index(plate|search|face|sabotage|human|objectdetection)
 * Validate request body based on log type
 * - plate/search: ReportPlateBody (plate number, brand, color, owner, etc.)
 * - face/sabotage: ReportFaceBody (personnel, camera, time range, etc.)
 * - human: ReportHumanBody (human count filtering)
 * - objectdetection: ReportObjectBody (detected objects)
 */
router.post(
	'/:index(plate|search|face|sabotage|human|objectdetection)',
	(req, res, next) => {
		// Validate index parameter
		if (!['plate', 'search', 'face', 'sabotage', 'human', 'objectdetection'].includes(req.params.index))
			return next(new ApiError(404, `Index ${req.params.index} not found!`));

		// Map each log type to its corresponding DTO validation class
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const dtoClass: { [key: string]: any } = {
			plate: ReportPlateBody,
			search: ReportPlateBody,
			face: ReportFaceBody,
			sabotage: ReportFaceBody,
			human: ReportHumanBody,
			objectdetection: ReportObjectBody
		};

		// Apply DTO validation based on index type
		dtoValidationMiddleware(dtoClass[req.params.index], {
			skipMissingProperties: false,
			detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
			info: 'please fill all fields'
		})(req, res, next);
	},
	// Validate that start time is before stop time
	Time.compareTimeMiddleware('start', 'stop')
);

/**
 * ===================================
 * DATA CACHING INITIALIZATION
 * ===================================
 */

/**
 * Initialize empty cache objects for MongoDB data
 * These act as request-scoped caches to avoid redundant database queries
 * when processing multiple logs with the same camera_id, personnel_id, etc.
 *
 * Cache structure:
 * - db_cameras: Stores camera documents by camera_id
 * - db_personnel: Stores personnel documents by personnel_id
 * - db_person_image: Stores person image documents by image_id
 * - db_brands: Stores car brand documents by brand_id
 * - db_colors: Stores car color documents by color_id
 * - db_sections: Stores section documents by camera_id
 * - db_departments: Stores department documents by camera_id
 */
router.use('', (req, res, next) => {
	Object.assign(req.body, {
		db_cameras: {},
		db_personnel: {},
		db_person_image: {},
		db_brands: {},
		db_colors: {},
		db_sections: {},
		db_departments: {}
	});
	next();
});

/**
 * ===================================
 * DELETE ENDPOINTS
 * ===================================
 */

/**
 * DELETE /:index(plate|search|face|sabotage|human|objectdetection)
 * Delete multiple logs matching query criteria
 * Requires appropriate access permissions
 */
router.delete(
	'/:index(plate|search|face|sabotage|human|objectdetection)',
	deleteElasticMiddleware(indexFunc)
);

/**
 * DELETE /:index/:id
 * Delete a single log by its Elasticsearch document ID
 * Enriches the deleted log with related data before sending response
 */
router.delete(
	'/:index(plate|search|face|sabotage|human|objectdetection)/:id',
	deleteByIdElasticMiddleware(indexFunc, { send: sendFunction })
);

/**
 * ===================================
 * SEARCH & RETRIEVAL ENDPOINTS
 * ===================================
 */

/**
 * GET /:index(/:type(excel))?
 * Retrieve all logs with optional search parameter
 * - Regular request: Returns JSON array of logs
 * - Excel request: Continues to Excel export middleware
 *
 * Query parameters:
 * - search: Text search across important fields (name, description, camera_name, etc.)
 * - timez: Timezone for timestamp formatting
 */
router.get(
	'/:index(plate|search|face|sabotage|human|objectdetection)(/:type(excel))?/?$',
	readElasticMiddleware(indexFunc, {
		send: sendFunction,
		save: 'esResult',
		searchFromReq: getSearchFunction,
		// Continue to next middleware if Excel export is requested
		next: (req) => !!req.params['type']
	})
);

/**
 * ===================================
 * EXCEL EXPORT ENDPOINTS
 * ===================================
 */

/**
 * GET /:index(plate|search|face)/excel
 * Export all logs to Excel format
 * Requires dataImportExport permission
 * Logs the export operation for audit trail
 */
router.get(
	'/:index(plate|search|face)/:type(excel)/?$',
	accessCheck('dataImportExport'),
	sendExcelMiddleware({ cols: colsFunc, rows: 'esResult' }),
	async (req, res, next) => {
		try {
			const recordCount = Array.isArray(req.body.esResult) ? req.body.esResult.length : 0;
			// Log successful Excel export
			await DataImportExportLogger.excelExported(req, req.params.index, recordCount, true);
		} catch (error) {
			// Log failed Excel export
			await DataImportExportLogger.excelExported(
				req,
				req.params.index,
				0,
				false,
				error instanceof Error ? error.message : 'Unknown error'
			);
		}
		next();
	}
);

/**
 * GET /:index/:id(/:type(excel))?
 * Retrieve a single log by Elasticsearch document ID
 * - Regular request: Returns enriched log JSON
 * - Excel request: Continues to Excel export middleware
 */
router.get(
	'/:index(plate|search|face|sabotage|human|objectdetection)/:id?/:type(excel)?',
	readByIdElasticMiddleware(indexFunc, {
		send: sendFunction,
		save: 'esResult',
		// Continue to next middleware if Excel export is requested
		next: (req) => !!req.params['type']
	})
);

/**
 * GET /:index(plate|search|face)/:id?/excel
 * Export single log to Excel format
 * Requires dataImportExport permission
 */
router.get(
	'/:index(plate|search|face)/:id?/:type(excel)?',
	accessCheck('dataImportExport'),
	sendExcelMiddleware({ cols: colsFunc, rows: 'esResult' }),
	async (req, res, next) => {
		if (req.params.type === 'excel') {
			try {
				const recordCount = Array.isArray(req.body.esResult) ? req.body.esResult.length : 0;
				// Log successful Excel export
				await DataImportExportLogger.excelExported(req, req.params.index, recordCount, true);
			} catch (error) {
				// Log failed Excel export
				await DataImportExportLogger.excelExported(
					req,
					req.params.index,
					0,
					false,
					error instanceof Error ? error.message : 'Unknown error'
				);
			}
		}
		next();
	}
);

/**
 * GET /human/:id
 * Retrieve a single human log by ID with face details
 * Fetches the human log and related face logs from the same camera and time window
 * Returns enriched human log with all face detection details
 */
router.get('/human/:id', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const humanIndex = process.env['HUMAN_INDEX'] ?? 'human_log';
		const faceIndex = process.env['FACE_INDEX'] ?? 'face_log';
		const humanLogId = req.params.id;

		// Fetch the human log by ID
		const humanLog = await readByIdElastic(humanIndex, humanLogId);

		if (!humanLog || !humanLog._id) {
			return next(new ApiError(404, 'Human log not found'));
		}

		// Get camera access filter
		const accessList =
			req.user.role === 'admin'
				? []
				: req.user.camera_access?.length
					? req.user.camera_access
					: ["who's daddy"];

		// Check if user has access to this camera
		if (accessList.length > 0 && !accessList.includes(humanLog.camera_id?.toString())) {
			return next(new ApiError(403, 'Access denied to this camera'));
		}

		// Calculate time window (±10 seconds) to find related face logs
		const humanTimestamp = humanLog.timestamp;
		if (!humanTimestamp) {
			// If no timestamp, just return the human log without face details
			const enrichedLog = await sendFunction(humanLog, req);
			return res.status(200).json({
				success: true,
				data: enrichedLog,
				faces: []
			});
		}

		const timeWindow = 10; // seconds
		const timeStart = new Date(new Date(humanTimestamp).getTime() - timeWindow * 1000).toISOString();
		const timeEnd = new Date(new Date(humanTimestamp).getTime() + timeWindow * 1000).toISOString();

		// Query face logs from the same camera and time window
		const faceQuery = {
			index: faceIndex,
			size: 100, // Limit to 100 face detections
			query: {
				bool: {
					must: [
						{
							match: {
								camera_id: humanLog.camera_id?.toString() ?? ''
							}
						},
						{
							range: {
								timestamp: {
									gte: timeStart,
									lte: timeEnd
								}
							}
						},
						// Camera access control
						...(accessList.length > 0
							? [
									{
										bool: {
											should: accessList.map((value) => ({
												match: {
													camera_id: value.toString()
												}
											})),
											minimum_should_match: 1
										}
									}
								]
							: [])
					]
				}
			},
			sort: [{ timestamp: { order: 'desc' } }]
		} as SearchRequest;

		const faceLogsResponse = await process.esclient.search(faceQuery);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const faceLogs = faceLogsResponse.hits.hits.map((hit: any) => ({
			_id: hit._id,
			...(hit._source ?? {})
		}));

		// Set elasticsearch index context for face logs
		const originalIndices = req.body['elasticsearchIndices'];
		req.body['elasticsearchIndices'] = [faceIndex];

		// Enrich face logs with personnel and other details
		const enrichedFaces = await Promise.all(
			faceLogs.map(async (faceLog) => {
				return await sendFunction(faceLog, req);
			})
		);

		// Set elasticsearch index context for human log
		req.body['elasticsearchIndices'] = [humanIndex];

		// Enrich the human log
		const enrichedHumanLog = await sendFunction(humanLog, req);

		// Restore original indices if they existed
		if (originalIndices) {
			req.body['elasticsearchIndices'] = originalIndices;
		} else {
			delete req.body['elasticsearchIndices'];
		}

		// Return human log with face details
		return res.status(200).json({
			success: true,
			data: {
				...enrichedHumanLog,
				faces: enrichedFaces.filter((face) => face !== undefined) // Filter out any undefined faces
			}
		});
	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';
		return next(new ApiError(500, 'Internal server error: ' + errorMessage));
	}
});

/**
 * ===================================
 * ADVANCED FILTERING ENDPOINTS
 * ===================================
 */

/**
 * POST /:index(/:type(excel))?
 * Advanced filtering with request body
 * Supports complex queries with multiple filter criteria:
 * - Time range filtering (date_start, date_end, time_start, time_end)
 * - Camera filtering with role-based access control
 * - Personnel/owner filtering
 * - Vehicle attributes (brand, color, plate number)
 * - Human count filtering
 * - Person type filtering
 * - Plate search modes (normal, noplate, etc.)
 */
router.post(
	'/:index(plate|search|face|sabotage|human|objectdetection)(/:type(excel))?/?$',
	readElasticMiddleware(indexFunc, {
		searchFromReq: postSearchFunction,
		send: sendFunction,
		save: 'esResult',
		// Continue to Excel export if requested
		next: (req) => !!req.params['type']
	})
);

/**
 * POST /:index(plate|search|face)/excel
 * Export filtered results to Excel
 * Requires dataImportExport permission
 */
router.post(
	'/:index(plate|search|face)/:type(excel)/?$',
	accessCheck('dataImportExport'),
	sendExcelMiddleware({ cols: colsFunc, rows: 'esResult' }),
	async (req, res, next) => {
		try {
			const recordCount = Array.isArray(req.body.esResult) ? req.body.esResult.length : 0;
			// Log successful Excel export
			await DataImportExportLogger.excelExported(req, req.params.index, recordCount, true);
		} catch (error) {
			// Log failed Excel export
			await DataImportExportLogger.excelExported(
				req,
				req.params.index,
				0,
				false,
				error instanceof Error ? error.message : 'Unknown error'
			);
		}
		next();
	}
);

/**
 * ===================================
 * BACKUP & DELETE ENDPOINT
 * ===================================
 */

/**
 * POST /:index(plate|face)/backup
 * Backup logs to Excel and then delete them from Elasticsearch
 * Requires dataImportExport permission
 *
 * Operation flow:
 * 1. Query logs matching filter criteria
 * 2. Export matching logs to Excel
 * 3. Delete the logs from Elasticsearch
 * 4. Log the backup operation for audit trail
 *
 * This is a destructive operation - use with caution
 */
router.post(
	'/:index(plate|face)/backup',
	accessCheck('dataImportExport'),
	// Delete matching logs but return documents instead of delete result
	deleteElasticMiddleware(indexFunc, {
		sendDocsInsteadOfDeleteResult: true,
		send: sendFunction,
		save: 'esResult',
		next: true
	}),
	// Export deleted logs to Excel
	sendExcelMiddleware({ cols: colsFunc, rows: 'esResult' }),
	async (req, res, next) => {
		try {
			const recordCount = Array.isArray(req.body.esResult) ? req.body.esResult.length : 0;
			// Log successful backup
			await DataImportExportLogger.backupExported(req, req.params.index, recordCount, true);
		} catch (error) {
			// Log failed backup
			await DataImportExportLogger.backupExported(
				req,
				req.params.index,
				0,
				false,
				error instanceof Error ? error.message : 'Unknown error'
			);
		}
		next();
	}
);

/**
 * ===================================
 * HELPER FUNCTIONS
 * ===================================
 */

/**
 * Build Elasticsearch query for GET requests with search parameter
 *
 * @param req - Express request containing search query and user permissions
 * @returns Elasticsearch query object with camera access filtering and text search
 *
 * Query features:
 * - Camera access control based on user role
 * - Regex text search across important fields
 * - Results sorted by timestamp (newest first)
 */
function getSearchFunction(req: Request) {
	// Determine which cameras user has access to
	// Admin users have access to all cameras (empty array = no filter)
	// Non-admin users are restricted to their camera_access list
	// If no cameras assigned, use impossible value to return no results
	const accessList =
		req.user.role === 'admin'
			? []
			: req.user.camera_access?.length
				? req.user.camera_access
				: ["who's daddy"];

	return {
		track_total_hits: true,
		query: {
			bool: {
				must: [
					{
						bool: {
							// Camera access control: user can only see logs from their assigned cameras
							should: accessList?.map((value) => ({
								match: {
									camera_id: value.toString()
								}
							})),
							minimum_should_match: 1
						}
					},
					{
						bool: {
							// Text search across important fields (if search query provided)
							// Uses regex for partial matching with case-insensitive search
							should:
								typeof req.query?.search === 'string' &&
								!!req.query.search &&
								typeof req.params.index === 'string' &&
								Object.prototype.hasOwnProperty.call(importantFields, req.params.index)
									? importantFields[req.params.index as keyof typeof importantFields].map(
											(el: string | ((input: string) => string)) => ({
												regexp: {
													// Use field name if string, or function name if function
													[typeof el === 'string' ? el : el.name]: {
														value:
															'.*' +
															// Apply function transformation if needed (e.g., Persian to English)
															(typeof el === 'function' ? el(req.query.search as string) : req.query.search) +
															'.*',
														case_insensitive: true
													}
												}
											})
										)
									: [],
							minimum_should_match: 1
						}
					},
					{
						bool: {
							// Filter: show if angle is empty, doesn't exist, or is not 'side'
							should: [
								{ term: { 'angle.keyword': '' } },
								{ bool: { must_not: [{ exists: { field: 'angle' } }] } },
								{ bool: { must_not: [{ term: { 'angle.keyword': 'side' } }] } }
							],
							minimum_should_match: 1
						}
					}
				]
			}
		},
		// Sort results by timestamp, newest first
		sort: [{ timestamp: { order: 'desc' } }]
	} as SearchRequest;
}

/**
 * Build Elasticsearch query for POST requests with advanced filtering
 *
 * @param req - Express request containing filter criteria in body
 * @returns Elasticsearch query object with complex filtering logic
 *
 * Supported filters:
 * - Time range: date_start, date_end, time_start, time_end with timezone support
 * - time_filter flag: single range vs daily recurring time windows
 * - Camera access: role-based filtering with user camera permissions
 * - Personnel: Filter by personnel_id or owner
 * - Vehicle: brand, color filtering
 * - Vehicle type: car_type filtering (filters brands by car_type)
 * - Human detection: human_count filtering
 * - Person type: Filter by person_type field
 * - Plate search: Supports normal, noplate, and custom plate search modes
 * - Allowed status: Filter by allowed field value
 */
async function postSearchFunction(req: Request) {
	// Extract request body parameters
	const body = req.body;
	const timezone = body.timez ?? body.timezone;

	// Build time range constraints based on time_filter flag
	// time_filter=true: Single range from date_start to date_end
	// time_filter=false: Daily recurring time windows (e.g., 9am-5pm every day in range)
	const time_constraints = [];
	if (body.date_start) {
		if (body.time_filter) {
			// Single time range: entire period from start to end
			const time_range: { gte: string; lte: string } = Time.getSingleTimeRange(
				body.date_start,
				body.date_end,
				body.time_start,
				body.time_end,
				timezone
			);

			time_constraints.push({
				range: { timestamp: { gte: time_range.gte, lte: time_range.lte } }
			});
		} else {
			// Multiple daily time ranges: recurring time windows for each day
			const times_epoch: Array<{ gte: string; lte: string }> = Time.getEpochList(
				body.date_start,
				body.date_end,
				body.time_start,
				body.time_end,
				timezone
			);

			if (times_epoch && times_epoch.length) {
				time_constraints.push({
					bool: {
						should: times_epoch.map((time) => ({
							range: { timestamp: { gte: time.gte, lte: time.lte } }
						})),
						minimum_should_match: 1
					}
				});
			}
		}
	}

	// Calculate camera access based on user role and permissions
	// Admin: Can search all cameras (or filter by provided cameras list)
	// Non-admin: Restricted to intersection of their access list and requested cameras
	const userCameras = req.user.camera_access?.length
		? req.user.camera_access?.map((el) => el.toString())
		: ["who's daddy"]; // Impossible value to return no results if no access

	// Filter requested cameras to only those user has access to
	const allowedSearchedCameras = body.cameras
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		?.filter((cam: any) => userCameras.includes(cam))
		.concat(["who's daddy"]);

	// Final camera list depends on user role and whether cameras were specified
	const cameras =
		(req.user.role === 'admin'
			? body.cameras // Admin can use requested cameras directly
			: body.cameras?.length
				? allowedSearchedCameras // Non-admin gets filtered list
				: userCameras) ?? []; // Default to user's access list

	// Handle car_type filtering: if car_type is provided, get brand IDs that match those car_types
	let brands = body.brands ? [...body.brands] : [];
	let hasCarTypeFilter = false;
	if (body.car_type && Array.isArray(body.car_type) && body.car_type.length > 0) {
		hasCarTypeFilter = true;
		try {
			// Query MongoDB to get all brand IDs that match the specified car_types
			const brandsByCarType = await CarBrand.find({
				car_type: { $in: body.car_type }
			})
				.select('_id')
				.lean()
				.exec();

			// Extract brand IDs and convert to strings
			const brandIdsByCarType = brandsByCarType.map((brand) => brand._id.toString());

			// Merge with existing brands (if any) - use Set to avoid duplicates
			const allBrandIds = new Set([...brands, ...brandIdsByCarType]);
			brands = Array.from(allBrandIds);
		} catch (error) {
			console.error('Error fetching brands by car_type:', error);
			// If error occurs, continue with existing brands filter only
		}
	}

	// If car_type filter was applied but resulted in no brands, return empty result set
	// by using an impossible brand ID that will never match
	if (hasCarTypeFilter && brands.length === 0) {
		brands = ["who's daddy"]; // Impossible value to return no results
	}

	// Map filter fields to values from request body
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const fields: { [key: string]: Array<any> } = {
		camera_id: cameras,
		personnel_id: body.personnels,
		brand: brands.length > 0 ? brands : [],
		owner: body.owner,
		color: body.colors,
		human_count: body.human_count,
		// Handle allowed field (can be boolean, array, or undefined)
		allowed:
			body.allowed === undefined || body.allowed === null
				? []
				: Array.isArray(body.allowed)
					? body.allowed
					: [body.allowed]
	};

	// Build base query with field filters and time constraints
	// For each field with values: create OR clause (should) between values
	// Between different fields: create AND clause (must)
	const query = {
		bool: {
			must: [
				// Filter by each field (AND between fields, OR within field values)
				...Object.entries(fields)
					.filter(([, values]) => !!values && values.length > 0)
					.map(([field, values]) => ({
						bool: {
							// OR clause: match any value within this field
							should: [
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								...values.map((value: any) => ({
									match: {
										[`${field}`]: value
									}
								}))
							],
							minimum_should_match: 1
						}
					})),

				// Add time range constraints
				...time_constraints,

				// Add person_type filter if specified
				...(!!body.person_type && typeof body.person_type === 'string'
					? [{ match: { person_type: body.person_type } }, { exists: { field: 'person_type' } }]
					: [])
			],
			must_not: [],
			should: []
		}
	};

	// Special handling for plate search
	// noplate mode: Search for logs without valid plate numbers
	if (body.plate_search_type === 'noplate')
		body.plates = [{ first: '**', second: '*', third: '***', fourth: 'ایران', fifth: '**' }];

	// Add plate number filtering if plates provided
	if (body.plates?.length) {
		// Convert plate objects to string format
		const plates = platesToStrings(body.plates);
		const plate_search_type = body.plate_search_type ?? 'normal';

		// Add plate search clauses (OR between different plates)
		query?.bool?.must?.push({
			bool: {
				// Each plate pattern becomes a query clause
				should: plates
					.map((plateString) =>
						// plateToQueryJSON handles wildcards and search modes
						plateToQueryJSON(plateString, plate_search_type, {
							originalQueryToAlter: query
						})
					)
					.flat(),
				minimum_should_match: 1
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any);
	}

	// Add angle filtering for plate logs
	// angle: [] or 'all' - no filter, show all angles
	// angle: ['front', 'back', 'side'] - filter by specific angles (OR logic)
	const angles = Array.isArray(body.angle) ? body.angle : body.angle ? [body.angle] : [];
	if (angles.length > 0 && !angles.includes('all')) {
		query?.bool?.must?.push({
			bool: {
				should: angles.map((ang: string) => ({ match: { angle: ang } })),
				minimum_should_match: 1
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any);
	}

	// Return complete Elasticsearch query
	const query_elastic = {
		track_total_hits: true,
		sort: [{ timestamp: { order: 'desc' } }],
		query
	} as SearchRequest;
	return query_elastic;
}

/**
 * Transform Elasticsearch log document into enriched response object
 *
 * @param log - Raw Elasticsearch log document
 * @param req - Express request (for timezone and caching)
 * @returns Enriched log object with related data from MongoDB
 *
 * Enrichment process:
 * 1. Fetch camera data and populate section/department information
 * 2. Fetch personnel data for face logs or owner data for plate logs
 * 3. Fetch person image hash_id for face logs
 * 4. Fetch vehicle brand and color for plate logs
 * 5. Fetch full frame image if frame_id exists
 * 6. Format timestamps with timezone
 * 7. Transform plate numbers to structured JSON
 *
 * Uses request-scoped caching to avoid redundant database queries
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendFunction(log: any, req: Request): Promise<any> {
	try {
		// Determine which crop image to use based on log type
		// plate/objectdetection logs: use crop field
		// face/other logs: use inner_crop field
		const tmpFlag = ['plate_log', 'objectdetection_log'].includes(req.body['elasticsearchIndices']?.at(-1));
		const crop = tmpFlag ? log?.crop : (log?.inner_crop ?? '');
		const inner_crop = tmpFlag ? log?.inner_crop : '';

		// Fetch camera data with caching
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let camera: any = undefined;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let sectionDoc: any = undefined;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let departmentDoc: any = undefined;

		// Check cache first, then query database if needed
		if (Object.prototype.hasOwnProperty.call(req.body['db_cameras'], log.camera_id)) {
			camera = req.body?.['db_cameras']?.[log.camera_id];
			sectionDoc = req.body?.['db_sections']?.[log.camera_id];
			departmentDoc = req.body?.['db_departments']?.[log.camera_id];
		} else if (!!log.camera_id && isValidObjectId(log.camera_id)) {
			// Query camera and cache result
			camera = await Camera.findById(log.camera_id).exec();
			Object.assign(req.body['db_cameras'], { [log.camera_id]: camera });

			if (camera) {
				// Query section and cache result
				sectionDoc = await Section.findById(camera.section_id).exec();
				Object.assign(req.body['db_sections'], { [log.camera_id]: sectionDoc });

				if (sectionDoc) {
					// Query department and cache result
					departmentDoc = sectionDoc?.department_id
						? await Department.findById(sectionDoc?.department_id).exec()
						: undefined;
					Object.assign(req.body['db_departments'], {
						[log.camera_id]: departmentDoc
					});
				}
			}
		}

		const section = sectionDoc?.name ?? '';
		const department = departmentDoc?.name ?? '';

		// Fetch personnel/owner data with caching
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let personnel: any = undefined;
		// For plate logs: owner field contains personnel_id
		// For face logs: personnel_id field contains the ID
		const log_personnel_id =
			log.type === 'plate' ? log?.owner : log.type === 'face' ? log?.personnel_id : 'unknown';

		// Check cache first, then query database if needed
		if (Object.prototype.hasOwnProperty.call(req.body['db_personnel'], log_personnel_id)) {
			personnel = req.body?.['db_personnel']?.[log_personnel_id];
		} else if (!!log_personnel_id && log_personnel_id !== 'unknown' && isValidObjectId(log_personnel_id)) {
			personnel = await Personnel.findById(log_personnel_id).exec();
			Object.assign(req.body['db_personnel'], {
				[log_personnel_id]: personnel
			});
		}

		// Fetch person image hash_id for face logs (used for deduplication)
		let hash_id = undefined;
		if (log?.hash_id) hash_id = log.hash_id;
		else if (Object.prototype.hasOwnProperty.call(req.body['db_person_image'], log.image_id)) {
			const image = req.body?.['db_person_image']?.[log.image_id];
			hash_id = image?.hash_id;
		} else if (!!log.image_id && isValidObjectId(log.image_id)) {
			const image = await PersonImage.findById(log.image_id).exec();
			Object.assign(req.body['db_person_image'], { [log.image_id]: image });
			hash_id = image?.hash_id;
		}

		// Fetch vehicle color data with caching
		let color = undefined;
		if (Object.prototype.hasOwnProperty.call(req.body['db_colors'], log.color)) {
			color = req.body?.['db_colors']?.[log.color];
		} else if (!!log.color && isValidObjectId(log.color)) {
			color = await CarColor.findById(log.color).exec();
			Object.assign(req.body['db_colors'], { [log.color]: color });
		}

		// Fetch vehicle brand data with caching
		let brand = undefined;
		if (Object.prototype.hasOwnProperty.call(req.body['db_brands'], log.brand)) {
			brand = req.body?.['db_brands']?.[log.brand];
		} else if (!!log.brand && isValidObjectId(log.brand)) {
			brand = await CarBrand.findById(log.brand).exec();
			Object.assign(req.body['db_brands'], { [log.brand]: brand });
		}

		// Fetch full frame image if frame_id exists
		const frame_log = log?.frame_id ? await readByIdElastic(frame_index, log.frame_id) : {};
		// Remove redundant fields from frame_log
		delete frame_log['_id'];
		delete frame_log['personnel_id'];

		// Return enriched log object
		return {
			_id: log?._id,
			type: log?.type,
			camera_type: camera?.camera_type ?? '',
			camera_id: camera?._id?.toString() ?? '',
			camera: camera?.name ?? '',
			camera_name: camera?.name ?? '',
			fullName: personnel?.toName() ?? log.name ?? '',
			personnel_id: personnel?.id ?? 'unknown',
			...frame_log, // Spread frame data (full scene image, etc.)
			department,
			section,
			// Format timestamp with timezone
			time: log?.timestamp
				? new Date(log.timestamp).toLocaleString('en-US', {
						timeZone: req.query?.timez?.toString() ?? 'Asia/Tehran'
					})
				: '',
			// Transform plate number string to structured JSON
			plate_number: stringPlateToJson(log.plate_number),
			owner: log?.owner ?? '',
			color: color?.name ?? '',
			fa_color: color?.fa_name ?? '',
			brand: brand?.name ?? '',
			car_type: brand?.car_type ?? '',
			allowed: log.allowed,
			crop: crop,
			video: camera?.url ?? '',
			inner_crop: inner_crop,
			alert: log?.alert,
			sms: log?.sms,
			description: log.description ?? '',
			human_count: log.human_count ?? 0,
			timestamp: log?.timestamp ?? '',
			confidence: log?.confidence ?? '',
			image_id: log?.image_id ?? '',
			hash_id: hash_id ?? '',
			face_confidence: log?.face_confidence ?? '',
			vector: log?.vector ?? '',
			direction: log?.direction ?? '',
			angle: log?.angle ?? ''
		};
	} catch (err) {
		console.error(err);
		return undefined;
	}
}

/**
 * ===================================
 * UTILITY FUNCTIONS
 * ===================================
 */

/**
 * Map request index parameter to Elasticsearch index name
 *
 * @param req - Express request containing index parameter
 * @returns Elasticsearch index name from environment variables
 */
function indexFunc(req: Request) {
	return {
		plate: process.env['PLATE_INDEX'] ?? 'plate_log',
		search: process.env['PLATE_INDEX'] ?? 'plate_log',
		face: process.env['FACE_INDEX'] ?? 'face_log',
		sabotage: process.env['SABOTAGE_INDEX'] ?? 'sabotage_log',
		objectdetection: process.env['OBJECT_INDEX'] ?? 'objectdetection_log',
		human: process.env['HUMAN_INDEX'] ?? 'human_log'
	}[req.params.index] as string;
}

/**
 * Map request index parameter to Excel column configuration
 *
 * @param req - Express request containing index parameter
 * @returns Column configuration array for Excel export
 */
function colsFunc(req: Request) {
	return {
		plate: plateCols,
		search: plateCols,
		face: faceCols
	}[req.params.index as 'plate' | 'search' | 'face'];
}

export default router;
