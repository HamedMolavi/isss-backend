import { Request, Router } from 'express';
import { getAnalyticsCacheService } from '../../services/analyticsCache.service';
import { Logger } from '../../logger';
import { ApiError } from '../../types/classes/error.class';
import Camera from '../../db/mongo/models/camera';
import Personnel from '../../db/mongo/models/personnel';
import CarBrand from '../../db/mongo/models/carBrand';
import CarColor from '../../db/mongo/models/carColor';
import { isValidObjectId } from 'mongoose';
import { stringPlateToJson } from '../../tools/plate.tools';
import { Clock } from '../../types/interfaces/time.interface';
import Time from '../../tools/time.tools';
import { platesToStrings } from '../../tools/car.tools';
import { plateToQueryJSON } from '../../tools/elastic.tools';

/**
 * ===================================
 * ANALYTICS ROUTES
 * ===================================
 *
 * This router handles analytics and statistics endpoints for:
 * - Most repeated license plates in time range (with full details)
 * - Most repeated known faces/personnel in time range (with full details)
 * - Most repeated unknown faces clustered by similarity (with full details)
 * - Most active cameras in time range (with detection type breakdown)
 * - Vehicle brand/color statistics (with full counts)
 *
 * All endpoints support:
 * - Time range filtering (date_start, date_end, time_start, time_end)
 * - Camera filtering with role-based access control
 * - Timezone support
 * - Customizable result limits
 * - Complete data in single response (no need for separate count endpoints)
 *
 * Each main endpoint returns comprehensive data including:
 * - Individual records with full details
 * - Aggregated counts
 * - First/last seen timestamps
 * - Related metadata (camera names, personnel info, vehicle details, etc.)
 * - Sample images/crops where applicable
 */

const router: Router = Router();
const logger = new Logger({ serviceName: 'AnalyticsReport' });

/**
 * ===================================
 * HELPER FUNCTIONS
 * ===================================
 */

/**
 * Load camera map for enriching responses
 */
async function loadCameraMap(cameraIds: string[]): Promise<Map<string, typeof Camera.prototype>> {
	const validIds = cameraIds.filter((id) => isValidObjectId(id));
	const cameras = await Camera.find({ _id: { $in: validIds } }).exec();
	return new Map(cameras.map((cam) => [cam._id.toString(), cam]));
}

type ElasticsearchSearchError = {
	message?: string;
	meta?: {
		body?: {
			error?: {
				type?: string;
				reason?: string;
				caused_by?: { type?: string; reason?: string };
				root_cause?: Array<{ type?: string; reason?: string }>;
			};
		};
	};
};

const isIndexNotFoundError = (error: unknown): boolean => {
	const esError = error as ElasticsearchSearchError;
	return esError.meta?.body?.error?.type === 'index_not_found_exception';
};

const isCustomTimeZoneUnsupportedError = (error: unknown): boolean => {
	const esError = error as ElasticsearchSearchError;
	const errorInfo = esError.meta?.body?.error;
	if (!errorInfo) return false;

	const reasons: string[] = [];
	const collectReason = (value: unknown) => {
		if (typeof value === 'string' && value.trim() !== '') {
			reasons.push(value);
		} else if (Array.isArray(value)) {
			value.forEach((item) => collectReason(item));
		} else if (value && typeof value === 'object' && 'reason' in (value as { reason?: unknown })) {
			const maybeReason = (value as { reason?: unknown }).reason;
			if (typeof maybeReason === 'string' && maybeReason.trim() !== '') {
				reasons.push(maybeReason);
			}
		}
	};

	collectReason(errorInfo.reason);
	collectReason(errorInfo.caused_by?.reason);
	collectReason(errorInfo.root_cause);
	collectReason(esError.message);

	return reasons.some((reason) => reason.includes('does not support custom time zones'));
};

/**
 * POST /most-repeated-unknown-faces
 *
 * IMPORTANT: This route ONLY reads from cache
 * - Cache is updated by background job every 15 minutes
 * - This route NEVER updates the cache
 * - Always returns cached data or empty result
 * - Non-blocking, instant response
 */
router.post('/most-repeated-unknown-faces', async (req: Request, res, next) => {
	try {
		const { date_start, date_end, time_start, time_end, cameras, camera_ids, timez } = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';

		// Use simplified cache params to match background job
		// Background job uses a static key for rolling 24-hour window
		const cacheParams = {
			window: 'rolling_24h',
			timez: 'Asia/Tehran',
			cameras: undefined,
			user_id: 'system'
		};

		logger.info('Fetching cached analytics data', {
			endpoint: 'most-repeated-unknown-faces',
			user: req.user._id
		});

		// ONLY READ FROM CACHE - Never compute or update
		try {
			const cacheService = await getAnalyticsCacheService();
			let cachedData = await cacheService.getCachedData('most-repeated-unknown-faces', cacheParams);

			// Non-blocking: If no cached data, return immediately with status
			// Background job will populate cache - don't block the request

			if (cachedData) {
				logger.info('Cache hit - returning cached data', {
					endpoint: 'most-repeated-unknown-faces'
				});

				// Get the cached data array
				let data = (cachedData as { data: any[]; total: number }).data || [];

				// Apply date/time filter if provided
				if (date_start || date_end) {
					const startMs = date_start ? new Date(date_start).getTime() : 0;
					const endMs = date_end ? new Date(date_end).getTime() : Date.now();

					data = data.filter((item: any) => {
						// Use raw timestamps if available, otherwise parse formatted strings
						let itemFirstSeen = item.first_seen_timestamp;
						let itemLastSeen = item.last_seen_timestamp;

						// Fallback: parse formatted date strings for old cache entries
						if (!itemFirstSeen && item.first_seen) {
							itemFirstSeen = new Date(item.first_seen).getTime();
						}
						if (!itemLastSeen && item.last_seen) {
							itemLastSeen = new Date(item.last_seen).getTime();
						}

						// Default to full range if timestamps are invalid
						itemFirstSeen = itemFirstSeen || 0;
						itemLastSeen = itemLastSeen || Date.now();

						// Include if cluster's time range overlaps with requested range
						return itemLastSeen >= startMs && itemFirstSeen <= endMs;
					});
				}

				// Apply camera filter if provided
				const cameraFilter = camera_ids || cameras;
				if (cameraFilter && Array.isArray(cameraFilter) && cameraFilter.length > 0) {
					const filterSet = new Set(cameraFilter.map(String));
					data = data.filter((item: any) => {
						const itemCameraIds = item.camera_ids || [];
						return itemCameraIds.some((cid: string) => filterSet.has(String(cid)));
					});
				}

				// Resolve camera names from database
				const allCameraIds = new Set<string>();
				data.forEach((item: any) => {
					(item.camera_ids || []).forEach((cid: string) => {
						if (cid) allCameraIds.add(String(cid));
					});
				});

				const cameraMap = await loadCameraMap(Array.from(allCameraIds));

				// Enrich data with resolved camera names
				data = data.map((item: any) => {
					const cameraIds = item.camera_ids || [];
					const camerasData = cameraIds.map((cid: string) => {
						const cam = isValidObjectId(cid) ? cameraMap.get(cid) : undefined;
						return { camera_id: cid, camera_name: cam?.name ?? 'Unknown' };
					});
					return {
						...item,
						cameras: camerasData
					};
				});

				return res.status(200).json({
					success: true,
					data,
					total: data.length,
					cached: true,
					message: 'Data from cache (updated every 15 minutes by background job)'
				});
			} else {
				logger.info('Cache miss - returning empty result', {
					endpoint: 'most-repeated-unknown-faces',
					message: 'Background job will populate cache soon'
				});

				return res.status(200).json({
					success: true,
					data: [],
					total: 0,
					cached: false,
					message: 'Cache is being populated by background job. Please try again in a few moments.'
				});
			}
		} catch (cacheError) {
			logger.error('Cache service error', { error: cacheError });

			return res.status(200).json({
				success: true,
				data: [],
				total: 0,
				cached: false,
				message: 'Cache service temporarily unavailable'
			});
		}
	} catch (err) {
		logger.error('Route error', { error: err });
		return res.status(500).json({
			success: false,
			message: 'Internal server error',
			error: err instanceof Error ? err.message : String(err)
		});
	}
});

/**
 * POST /similar-plates-15min/chart
 * Get chart data for unique plates over time
 * Returns time-series data grouped by interval (hour, day, week)
 */
router.post('/similar-plates-15min/chart', async (req: Request, res, next) => {
	try {
		const {
			date_start,
			date_end,
			time_start,
			time_end,
			cameras,
			timez,
			plates,
			plate_search_type,
			bucket_interval_minutes,
			interval: rawInterval = 'hour' // 'hour', 'day', 'week'
		} = req.body;

		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const bucketIntervalMinutes = Number(bucket_interval_minutes) > 0 ? Number(bucket_interval_minutes) : 15;
		const bucketIntervalStr = `${bucketIntervalMinutes}m`;
		const plateAggSize = 10000;

		// Determine interval for histogram
		let intervalStr: string;
		switch (rawInterval) {
			case 'day':
				intervalStr = '1d';
				break;
			case 'week':
				intervalStr = '1w';
				break;
			case 'hour':
			default:
				intervalStr = '1h';
				break;
		}

		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);
		const camera_filter = buildCameraFilter(req, cameras);

		// Build base query with must clauses
		const mustClauses = [...time_constraints, ...camera_filter];
		const mustNotClauses = [
			{ wildcard: { 'plate_number.keyword': '*\\**' } },
			{ wildcard: { 'plate_number.keyword': '*_*' } },
			{ regexp: { 'plate_number.keyword': '.*[_*].*' } }
		];

		// Handle plate search
		let plateSearchClauses: unknown[] = [];
		if (plate_search_type === 'noplate') {
			plateSearchClauses = [
				{
					bool: {
						should: [
							{ term: { 'plate_number.keyword': '********' } },
							{ term: { 'plate_number.keyword': '' } },
							{ bool: { must_not: [{ exists: { field: 'plate_number' } }] } }
						],
						minimum_should_match: 1
					}
				}
			];
			mustNotClauses.length = 0;
		} else if (plates?.length) {
			const plateStrings = platesToStrings(plates);
			const searchType = plate_search_type ?? 'normal';
			const tempQuery = {
				bool: {
					must: mustClauses,
					must_not: [],
					should: []
				}
			};
			plateSearchClauses = [
				{
					bool: {
						should: plateStrings
							.map((plateString) =>
								plateToQueryJSON(plateString, searchType, {
									originalQueryToAlter: tempQuery
								})
							)
							.flat(),
						minimum_should_match: 1
					}
				}
			];
		}

		if (plateSearchClauses.length > 0) {
			mustClauses.push(...plateSearchClauses);
		}

		const query = {
			index: process.env['PLATE_INDEX'] ?? 'plate_log',
			size: 0,
			query: {
				bool: {
					must: mustClauses,
					must_not: mustNotClauses
				}
			},
			aggs: {
				by_time: {
					date_histogram: {
						field: 'timestamp',
						fixed_interval: intervalStr,
						time_zone: timezone,
						min_doc_count: 1
					},
					aggs: {
						plates: {
							terms: {
								field: 'plate_number.keyword',
								size: plateAggSize,
								order: { _count: 'desc' }
							},
							aggs: {
								by_15m: {
									date_histogram: {
										field: 'timestamp',
										fixed_interval: bucketIntervalStr,
										min_doc_count: 2,
										order: { _count: 'desc' }
									}
								}
							}
						}
					}
				}
			}
		};

		let esRes;
		try {
			esRes = await process.esclient.search(query);
		} catch (err: unknown) {
			if (isCustomTimeZoneUnsupportedError(err)) {
				const byTimeHistogram = query.aggs?.by_time?.date_histogram as Record<string, unknown> | undefined;
				if (byTimeHistogram?.time_zone) {
					// Legacy indices store timestamp as a long; remove time_zone so ES accepts the histogram.
					delete byTimeHistogram.time_zone;
				}
				try {
					esRes = await process.esclient.search(query);
				} catch (retryErr: unknown) {
					if (isIndexNotFoundError(retryErr)) {
						return res.status(200).json({
							success: true,
							data: [],
							interval: rawInterval,
							message: `Index ${query.index} not found. No data available.`
						});
					}
					throw retryErr;
				}
			} else if (isIndexNotFoundError(err)) {
				return res.status(200).json({
					success: true,
					data: [],
					interval: rawInterval,
					message: `Index ${query.index} not found. No data available.`
				});
			} else {
				throw err;
			}
		}

		type HistogramBucket = {
			key: number;
			doc_count: number;
		};
		type PlateBucket = {
			key: string;
			doc_count: number;
			by_15m?: { buckets?: HistogramBucket[] };
		};
		type TimeBucket = {
			key: number;
			doc_count: number;
			plates?: { buckets?: PlateBucket[] };
		};

		const aggregations = esRes.aggregations as {
			by_time?: { buckets?: TimeBucket[] };
		};

		if (!aggregations?.by_time?.buckets) {
			return res.status(200).json({
				success: true,
				data: [],
				interval: rawInterval
			});
		}

		// Process each time bucket
		const chartData = (aggregations.by_time.buckets ?? []).map((timeBucket) => {
			const uniquePlates = new Set<string>();
			const plateBuckets = timeBucket.plates?.buckets ?? [];
			let totalDetections = 0;

			plateBuckets.forEach((plateBucket) => {
				const plateKey = plateBucket.key as string;

				// Filter out unrecognized/invalid plates
				if (
					!plateKey ||
					plateKey.trim() === '' ||
					plateKey === '********' ||
					plateKey.includes('*') ||
					plateKey.includes('_')
				) {
					return;
				}

				// Only count plates that have at least 1 bucket (with min_doc_count: 2, this means at least 2 detections)
				const histogramBuckets = plateBucket.by_15m?.buckets ?? [];
				if (histogramBuckets.length >= 1) {
					uniquePlates.add(plateKey);
					// Count detections only for plates that meet the criteria
					totalDetections += plateBucket.doc_count;
				}
			});

			return {
				time: new Date(timeBucket.key).toLocaleString('en-US', { timeZone: timezone }),
				time_epoch: timeBucket.key,
				unique_plates_count: uniquePlates.size,
				total_detections: totalDetections
			};
		});

		return res.status(200).json({
			success: true,
			data: chartData,
			interval: rawInterval,
			total: chartData.length
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /suspicious-plates
 *
 * Advanced suspicious behavior detection using configurable time windows and filtering criteria.
 * Identifies plates with repeated appearances that span extended time periods, indicating
 * potential loitering, surveillance, or other suspicious activity patterns.
 *
 * Detection Logic (ALL conditions must be met):
 * 1. Plate must have ≥2 detections
 * 2. Detections must span multiple 15-minute buckets (not confined to single bucket)
 * 3. Time span between first and last detection must exceed minimum threshold
 * 4. All detections must fall within the configured time window from first detection
 *
 * Use Case:
 * - Detect vehicles loitering in facility areas for extended periods
 * - Identify potential surveillance or reconnaissance activity
 * - Flag unusual repeated appearances that don't match normal entry/exit patterns
 * - Distinguish between normal visits (quick entry/exit) and suspicious behavior
 *
 * Request Body Parameters:
 * @param {string} date_start - Start date for search range
 * @param {string} date_end - End date for search range
 * @param {string} time_start - Start time filter (optional)
 * @param {string} time_end - End time filter (optional)
 * @param {string[]} cameras - Array of camera IDs to filter (optional)
 * @param {number} limit - Results per page (default: 20)
 * @param {number} page - Page number for pagination (default: 1)
 * @param {number} window_hours - Time window in hours from first detection to consider (default: 24)
 * @param {number} min_time_span_hours - Minimum hours between first and last detection (default: 1)
 * @param {number} occurrence_limit - Maximum occurrences to return per plate (default: 100, max: 100)
 * @param {string} timez - Timezone for date/time processing (default: 'Asia/Tehran')
 * @param {Array} plates - Array of plate numbers to search for (optional)
 * @param {string} plate_search_type - Search mode: 'normal', 'fuzzy', 'noplate' (optional)
 *
 * Response:
 * Returns suspicious plates with their occurrences (newest first), camera details, time spans,
 * and detection counts. Each plate includes first_seen, last_seen timestamps and image crops.
 *
 * Example:
 * window_hours: 48, min_time_span_hours: 2
 * → Finds plates detected multiple times over 2+ hours within a 48-hour window
 */
router.post('/suspicious-plates', async (req: Request, res, next) => {
	try {
		const {
			date_start,
			date_end,
			time_start,
			time_end,
			cameras,
			limit: rawLimit = 20,
			page: rawPage,
			timez,
			occurrence_limit,
			plates,
			plate_search_type,
			window_hours: rawWindowHours,
			min_time_span_hours: rawMinTimeSpanHours,
			sort_by
		} = req.body;

		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const limit = Number(rawLimit) > 0 ? Number(rawLimit) : 20;
		const page = Number(rawPage) > 0 ? Number(rawPage) : 1;
		const bucketIntervalMs = 15 * 60 * 1000;

		// Configurable suspicious plate detection parameters
		// Window hours: Time window to check for occurrences (default: 24 hours)
		// Min time span hours: Minimum time span between first and last occurrence to be considered suspicious (default: 1 hour)
		const windowHours =
			rawWindowHours != null && !isNaN(Number(rawWindowHours)) && Number(rawWindowHours) > 0
				? Number(rawWindowHours)
				: 24;
		const minTimeSpanHours =
			rawMinTimeSpanHours != null && !isNaN(Number(rawMinTimeSpanHours)) && Number(rawMinTimeSpanHours) >= 0
				? Number(rawMinTimeSpanHours)
				: 1;
		// Fetch a large number to get accurate total count (max 10000 for performance)
		// We need all data to calculate the true total after filtering
		const plateAggSize = 10000;
		// Elasticsearch max_inner_result_window limit is 100 by default
		// Use user's value if provided (capped at 100), otherwise use 100 to get maximum
		const maxOccurrencesSize = 100; // Elasticsearch limit
		const occurrencesSize =
			Number(occurrence_limit) > 0
				? Math.min(Number(occurrence_limit), maxOccurrencesSize)
				: maxOccurrencesSize;

		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);
		const camera_filter = buildCameraFilter(req, cameras);

		// Build base query with must clauses
		const mustClauses = [...time_constraints, ...camera_filter];
		const mustNotClauses = [
			{ wildcard: { 'plate_number.keyword': '*\\**' } },
			{ wildcard: { 'plate_number.keyword': '*_*' } },
			{ regexp: { 'plate_number.keyword': '.*[_*].*' } }
		];

		// Handle plate search (similar to similar-plates-15min)
		// noplate mode: Search for logs without valid plate numbers
		let plateSearchClauses: unknown[] = [];
		if (plate_search_type === 'noplate') {
			// For noplate, we want to include plates with masks, so we don't add them to must_not
			// Instead, we add a specific query for masked plates
			plateSearchClauses = [
				{
					bool: {
						should: [
							{ term: { 'plate_number.keyword': '********' } },
							{ term: { 'plate_number.keyword': '' } },
							{ bool: { must_not: [{ exists: { field: 'plate_number' } }] } }
						],
						minimum_should_match: 1
					}
				}
			];
			// Remove the mask exclusions for noplate mode
			mustNotClauses.length = 0;
		} else if (plates?.length) {
			// Convert plate objects to string format
			const plateStrings = platesToStrings(plates);
			const searchType = plate_search_type ?? 'normal';

			// Add plate search clauses (OR between different plates)
			// Build a temporary query object for plateToQueryJSON
			const tempQuery = {
				bool: {
					must: mustClauses,
					must_not: [],
					should: []
				}
			};
			plateSearchClauses = [
				{
					bool: {
						// Each plate pattern becomes a query clause
						should: plateStrings
							.map((plateString) =>
								// plateToQueryJSON handles wildcards and search modes
								plateToQueryJSON(plateString, searchType, {
									originalQueryToAlter: tempQuery
								})
							)
							.flat(),
						minimum_should_match: 1
					}
				}
			];
		}

		// Add plate search clauses to must clauses if any
		if (plateSearchClauses.length > 0) {
			mustClauses.push(...plateSearchClauses);
		}

		const query = {
			index: process.env['PLATE_INDEX'] ?? 'plate_log',
			size: 0,
			query: {
				bool: {
					must: mustClauses,
					must_not: mustNotClauses
				}
			},
			aggs: {
				plates: {
					terms: {
						field: 'plate_number.keyword',
						size: plateAggSize,
						order: { _count: 'desc' },
						min_doc_count: 2
					},
					aggs: {
						first_seen: { min: { field: 'timestamp' } },
						last_seen: { max: { field: 'timestamp' } },
						cameras: {
							terms: {
								field: 'camera_id.keyword',
								size: 20
							}
						},
						occurrences: {
							top_hits: {
								size: occurrencesSize,
								_source: ['timestamp', 'camera_id', 'crop', 'inner_crop', 'plate_number'],
								sort: [{ timestamp: { order: 'asc' } }]
							}
						},
						sample: {
							top_hits: {
								size: 1,
								_source: ['plate_number', 'crop', 'inner_crop']
							}
						}
					}
				}
			}
		};

		let esRes;
		try {
			esRes = await process.esclient.search(query);
		} catch (err: unknown) {
			const error = err as { meta?: { body?: { error?: { type?: string } } }; message?: string };
			if (error.meta?.body?.error?.type === 'index_not_found_exception') {
				return res.status(200).json({
					success: true,
					data: [],
					total: 0,
					message: `Index ${query.index} not found. No data available.`
				});
			}
			throw err;
		}

		type OccurrenceHit = {
			_id?: string;
			_source?: {
				timestamp?: string;
				camera_id?: string;
				crop?: string;
				inner_crop?: string;
				plate_number?: string;
			};
		};
		type PlateAggBucket = {
			key: string;
			doc_count: number;
			first_seen?: { value?: number };
			last_seen?: { value?: number };
			cameras?: { buckets?: Array<{ key: string }> };
			occurrences?: { hits?: { hits?: OccurrenceHit[] } };
			sample?: { hits?: { hits?: Array<{ _source?: { crop?: string; inner_crop?: string } }> } };
		};

		const aggregations = esRes.aggregations as {
			plates?: { buckets?: PlateAggBucket[] };
		};

		if (!aggregations?.plates?.buckets) {
			return res.status(200).json({
				success: true,
				data: [],
				total: 0
			});
		}

		// Enrich cameras
		const allCameraIds = new Set<string>();
		(aggregations.plates.buckets ?? []).forEach((plateBucket) => {
			(plateBucket.cameras?.buckets ?? []).forEach((cam) => {
				const camId = String(cam.key);
				if (isValidObjectId(camId)) {
					allCameraIds.add(camId);
				}
			});
			(plateBucket.occurrences?.hits?.hits ?? []).forEach((hit) => {
				const camId = hit._source?.camera_id;
				if (camId && isValidObjectId(camId)) {
					allCameraIds.add(camId);
				}
			});
		});

		const cameraMap = await Camera.find({ _id: { $in: Array.from(allCameraIds) } })
			.exec()
			.then((docs) => new Map(docs.map((doc) => [doc._id.toString(), doc])));

		const suspicious: Array<{
			plate_number: unknown;
			plate_number_string: string;
			count: number;
			first_seen: string;
			last_seen: string;
			last_seen_timestamp: number;
			camera_ids: string[];
			cameras: Array<{ camera_id: string; camera_name: string }>;
			occurrences: Array<{
				log_id: string | null;
				timestamp: string | null;
				camera_id: string | null;
				camera_name: string;
				crop: string | null;
				inner_crop: string | null;
			}>;
			sample_crop: string | null;
			sample_inner_crop: string | null;
		}> = [];

		const toBucketKey = (ts: string | undefined | null): number | null => {
			if (!ts) return null;
			const n = new Date(ts).getTime();
			return Number.isFinite(n) ? Math.floor(n / bucketIntervalMs) : null;
		};

		(aggregations.plates.buckets ?? []).forEach((plateBucket) => {
			const plateKey = plateBucket.key;
			const hits = plateBucket.occurrences?.hits?.hits ?? [];
			if (!hits.length) return;

			const allOccurrences = hits.map((hit) => ({
				log_id: hit._id ?? null,
				timestamp: hit._source?.timestamp ?? null,
				camera_id: hit._source?.camera_id ?? null,
				camera_name: hit._source?.camera_id
					? (cameraMap.get(String(hit._source?.camera_id))?.name ?? 'Unknown')
					: 'Unknown',
				crop: hit._source?.crop ?? null,
				inner_crop: hit._source?.inner_crop ?? null
			}));

			// Convert timestamps and sort by time (oldest first) so window checks start from first detection
			const occurrencesWithTimestamps = allOccurrences
				.map((o) => {
					if (!o.timestamp) return null;
					const ts = typeof o.timestamp === 'string' ? new Date(o.timestamp).getTime() : Number(o.timestamp);
					if (!Number.isFinite(ts) || ts <= 0) return null;
					return { ...o, timestampMs: ts };
				})
				.filter((o): o is (typeof allOccurrences)[0] & { timestampMs: number } => o !== null)
				.sort((a, b) => a.timestampMs - b.timestampMs);

			if (occurrencesWithTimestamps.length < 2) return;

			// Filter occurrences to only include those within the configured time window
			// Start from the first occurrence and include all occurrences within the window
			const firstTimestamp = occurrencesWithTimestamps[0].timestampMs;
			const windowMs = windowHours * 60 * 60 * 1000;
			const windowEnd = firstTimestamp + windowMs;

			// Get all occurrences within the time window
			const occurrencesInWindow = occurrencesWithTimestamps.filter((o) => o.timestampMs <= windowEnd);

			if (occurrencesInWindow.length < 2) return;

			// Calculate time span within the time window
			const lastTimestampInWindow = occurrencesInWindow[occurrencesInWindow.length - 1].timestampMs;
			const timeSpanMs = lastTimestampInWindow - firstTimestamp;
			const timeSpanHours = timeSpanMs / (1000 * 60 * 60);

			// Exclude plates with very short time spans (less than configured minimum) as these are likely normal entry/exit patterns
			// A normal visit (entry followed by exit) typically happens within minutes
			// Consider plates suspicious if they have multiple occurrences spanning at least the configured minimum within the time window
			// This catches vehicles that appear multiple times over an extended period (suspicious loitering/activity)
			if (timeSpanHours < minTimeSpanHours) return;

			// Check if occurrences span multiple 15-minute buckets
			const bucketKeys = new Set<number>();
			occurrencesInWindow.forEach((o) => {
				const key = toBucketKey(o.timestamp);
				if (key !== null) bucketKeys.add(key);
			});

			// Safe plates have all detections in a single 15m bucket; exclude those
			if (bucketKeys.size < 2) return;

			// Use only occurrences within the time window
			const occurrences = occurrencesInWindow.map((o) => ({
				log_id: o.log_id,
				timestamp: o.timestamp,
				camera_id: o.camera_id,
				camera_name: o.camera_name,
				crop: o.crop,
				inner_crop: o.inner_crop
			}));

			const sample = plateBucket.sample?.hits?.hits?.[0]?._source;
			// Use timestamps from filtered occurrences within 24-hour window
			const firstSeen = new Date(firstTimestamp);
			const lastSeen = new Date(occurrencesInWindow[occurrencesInWindow.length - 1].timestampMs);

			const cameraIds = (plateBucket.cameras?.buckets ?? []).map((c) => String(c.key));
			const uniqueCameraIds = Array.from(new Set(cameraIds));
			const camerasData = uniqueCameraIds.map((cid) => {
				const cam = isValidObjectId(cid) ? cameraMap.get(cid) : undefined;
				return { camera_id: cid, camera_name: cam?.name ?? 'Unknown' };
			});

			suspicious.push({
				plate_number: stringPlateToJson(plateKey),
				plate_number_string: plateKey,
				count: occurrences.length, // Use actual occurrences count instead of doc_count
				first_seen: firstSeen.toLocaleString('en-US', { timeZone: timezone }),
				last_seen: lastSeen.toLocaleString('en-US', { timeZone: timezone }),
				last_seen_timestamp: lastSeen.getTime(),
				camera_ids: uniqueCameraIds,
				cameras: camerasData,
				occurrences,
				sample_crop: sample?.crop ?? null,
				sample_inner_crop: sample?.inner_crop ?? null
			});
		});

		// Sort suspicious plates based on sort_by parameter
		// Default: sort by latest occurrence (last_seen_timestamp descending)
		// Options: 'last_seen' (default), 'count', 'first_seen'
		let sorted;
		switch (sort_by) {
			case 'count':
				// Sort by number of occurrences (count descending)
				sorted = suspicious.sort((a, b) => b.count - a.count);
				break;
			case 'first_seen':
				// Sort by first occurrence timestamp (oldest first)
				sorted = suspicious.sort((a, b) => {
					const aFirst = new Date(a.first_seen).getTime();
					const bFirst = new Date(b.first_seen).getTime();
					return aFirst - bFirst;
				});
				break;
			case 'last_seen':
			default:
				// Sort by latest occurrence timestamp (newest first) - default behavior
				sorted = suspicious.sort((a, b) => b.last_seen_timestamp - a.last_seen_timestamp);
				break;
		}

		const total = sorted.length;
		const start = (page - 1) * limit;
		const pagedData = sorted.slice(start, start + limit).map((item) => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { last_seen_timestamp, ...rest } = item;
			return rest;
		});

		return res.status(200).json({
			success: true,
			data: pagedData,
			total,
			page,
			limit,
			total_pages: Math.ceil(total / limit),
			filters_applied: {
				time_range: {
					date_start: date_start || 'مشخص نشده',
					date_end: date_end || 'مشخص نشده',
					time_start: time_start || '00:00',
					time_end: time_end || '23:59',
					timezone: timezone,
					description: 'بازه زمانی جستجو برای یافتن پلاک‌های مشکوک'
				},
				cameras: {
					selected: cameras ?? [],
					count: cameras?.length ?? 0,
					description: cameras?.length
						? `جستجو فقط در ${cameras.length} دوربین انتخاب شده`
						: 'جستجو در همه دوربین‌های قابل دسترس'
				},
				suspicious_detection: {
					window_hours: windowHours,
					min_time_span_hours: minTimeSpanHours,
					description: `پلاک‌هایی که در بازه ${windowHours} ساعته چندین بار مشاهده شده و فاصله زمانی حداقل ${minTimeSpanHours} ساعت داشته باشند، مشکوک محسوب می‌شوند`
				},
				occurrence_limit: {
					value: occurrencesSize,
					description: `حداکثر تعداد تصاویر مشاهده برای هر پلاک (حداکثر مجاز: 100)`
				},
				sorting: {
					sort_by: sort_by ?? 'last_seen',
					options: {
						last_seen: 'آخرین مشاهده (جدیدترین)',
						count: 'تعداد مشاهده (بیشترین)',
						first_seen: 'اولین مشاهده (قدیمی‌ترین)'
					},
					current: sort_by ?? 'last_seen',
					description: 'مرتب‌سازی نتایج بر اساس مورد انتخابی'
				},
				plate_filter: {
					plates: plates ?? [],
					plate_search_type: plate_search_type || 'normal',
					description: plates?.length ? `جستجو برای ${plates.length} پلاک خاص` : 'جستجو در همه پلاک‌ها'
				}
			},
			explanation: {
				what_is_suspicious:
					'پلاکی مشکوک است که در بازه‌های زمانی 15 دقیقه‌ای مختلف، چندین بار مشاهده شده باشد',
				how_it_works: `1️⃣ سیستم همه پلاک‌های موجود در بازه زمانی را می‌یابد | 2️⃣ برای هر پلاک، بررسی می‌کند که آیا در بازه ${windowHours} ساعته چندین بار مشاهده شده؟ | 3️⃣ پلاک‌هایی با فاصله زمانی کمتر از ${minTimeSpanHours} ساعت حذف می‌شوند (ورود و خروج عادی) | 4️⃣ پلاک‌هایی که فقط در یک بازه 15 دقیقه‌ای ظاهر شده‌اند حذف می‌شوند | 5️⃣ پلاک‌های باقیمانده به عنوان مشکوک برگردانده می‌شوند`,
				count_meaning: 'عدد "تعداد مشاهده" دقیقاً با تعداد تصاویری که دریافت می‌کنید برابر است',
				occurrence_limit_note:
					occurrencesSize < 100
						? `طبق درخواست شما، حداکثر ${occurrencesSize} تصویر برای هر پلاک نمایش داده می‌شود`
						: 'حداکثر 100 تصویر برای هر پلاک نمایش داده می‌شود (محدودیت Elasticsearch)'
			}
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /suspicious-plates/unique-count
 * Get count of unique suspicious plates (24 hours window)
 */
router.post('/suspicious-plates/unique-count', async (req: Request, res, next) => {
	try {
		const {
			date_start,
			date_end,
			time_start,
			time_end,
			cameras,
			timez,
			occurrence_limit,
			plates,
			plate_search_type,
			window_hours: rawWindowHours,
			min_time_span_hours: rawMinTimeSpanHours
		} = req.body;

		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const bucketIntervalMs = 15 * 60 * 1000;

		// Configurable suspicious plate detection parameters
		const windowHours = Number(rawWindowHours) > 0 ? Number(rawWindowHours) : 24;
		const minTimeSpanHours = Number(rawMinTimeSpanHours) > 0 ? Number(rawMinTimeSpanHours) : 1;
		const plateAggSize = 10000;
		const maxOccurrencesSize = 100;
		const occurrencesSize =
			Number(occurrence_limit) > 0
				? Math.min(Number(occurrence_limit), maxOccurrencesSize)
				: maxOccurrencesSize;

		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);
		const camera_filter = buildCameraFilter(req, cameras);

		// Build base query with must clauses
		const mustClauses = [...time_constraints, ...camera_filter];
		const mustNotClauses = [
			{ wildcard: { 'plate_number.keyword': '*\\**' } },
			{ wildcard: { 'plate_number.keyword': '*_*' } },
			{ regexp: { 'plate_number.keyword': '.*[_*].*' } }
		];

		// Handle plate search
		let plateSearchClauses: unknown[] = [];
		if (plate_search_type === 'noplate') {
			plateSearchClauses = [
				{
					bool: {
						should: [
							{ term: { 'plate_number.keyword': '********' } },
							{ term: { 'plate_number.keyword': '' } },
							{ bool: { must_not: [{ exists: { field: 'plate_number' } }] } }
						],
						minimum_should_match: 1
					}
				}
			];
			mustNotClauses.length = 0;
		} else if (plates?.length) {
			const plateStrings = platesToStrings(plates);
			const searchType = plate_search_type ?? 'normal';
			const tempQuery = {
				bool: {
					must: mustClauses,
					must_not: [],
					should: []
				}
			};
			plateSearchClauses = [
				{
					bool: {
						should: plateStrings
							.map((plateString) =>
								plateToQueryJSON(plateString, searchType, {
									originalQueryToAlter: tempQuery
								})
							)
							.flat(),
						minimum_should_match: 1
					}
				}
			];
		}

		if (plateSearchClauses.length > 0) {
			mustClauses.push(...plateSearchClauses);
		}

		const query = {
			index: process.env['PLATE_INDEX'] ?? 'plate_log',
			size: 0,
			query: {
				bool: {
					must: mustClauses,
					must_not: mustNotClauses
				}
			},
			aggs: {
				plates: {
					terms: {
						field: 'plate_number.keyword',
						size: plateAggSize,
						order: { _count: 'desc' },
						min_doc_count: 2
					},
					aggs: {
						first_seen: { min: { field: 'timestamp' } },
						last_seen: { max: { field: 'timestamp' } },
						cameras: {
							terms: {
								field: 'camera_id.keyword',
								size: 20
							}
						},
						occurrences: {
							top_hits: {
								size: occurrencesSize,
								_source: ['timestamp', 'camera_id', 'crop', 'inner_crop', 'plate_number'],
								sort: [{ timestamp: { order: 'asc' } }]
							}
						}
					}
				}
			}
		};

		let esRes;
		try {
			esRes = await process.esclient.search(query);
		} catch (err: unknown) {
			const error = err as { meta?: { body?: { error?: { type?: string } } }; message?: string };
			if (error.meta?.body?.error?.type === 'index_not_found_exception') {
				return res.status(200).json({
					success: true,
					unique_plates_count: 0,
					message: `Index ${query.index} not found. No data available.`
				});
			}
			throw err;
		}

		type OccurrenceHit = {
			_id?: string;
			_source?: {
				timestamp?: string;
				camera_id?: string;
				crop?: string;
				inner_crop?: string;
				plate_number?: string;
			};
		};
		type PlateAggBucket = {
			key: string;
			doc_count: number;
			first_seen?: { value?: number };
			last_seen?: { value?: number };
			cameras?: { buckets?: Array<{ key: string }> };
			occurrences?: { hits?: { hits?: OccurrenceHit[] } };
		};

		const aggregations = esRes.aggregations as {
			plates?: { buckets?: PlateAggBucket[] };
		};

		if (!aggregations?.plates?.buckets) {
			return res.status(200).json({
				success: true,
				unique_plates_count: 0
			});
		}

		const toBucketKey = (ts: string | undefined | null): number | null => {
			if (!ts) return null;
			const n = new Date(ts).getTime();
			return Number.isFinite(n) ? Math.floor(n / bucketIntervalMs) : null;
		};

		// Calculate unique suspicious plates count
		const uniquePlates = new Set<string>();
		(aggregations.plates.buckets ?? []).forEach((plateBucket) => {
			const plateKey = plateBucket.key;
			const hits = plateBucket.occurrences?.hits?.hits ?? [];
			if (!hits.length) return;

			const allOccurrences = hits.map((hit) => ({
				log_id: hit._id ?? null,
				timestamp: hit._source?.timestamp ?? null,
				camera_id: hit._source?.camera_id ?? null,
				crop: hit._source?.crop ?? null,
				inner_crop: hit._source?.inner_crop ?? null
			}));

			// Convert timestamps and sort by time
			const occurrencesWithTimestamps = allOccurrences
				.map((o) => {
					if (!o.timestamp) return null;
					const ts = typeof o.timestamp === 'string' ? new Date(o.timestamp).getTime() : Number(o.timestamp);
					if (!Number.isFinite(ts) || ts <= 0) return null;
					return { ...o, timestampMs: ts };
				})
				.filter((o): o is (typeof allOccurrences)[0] & { timestampMs: number } => o !== null)
				.sort((a, b) => a.timestampMs - b.timestampMs);

			if (occurrencesWithTimestamps.length < 2) return;

			// Filter occurrences to only include those within the configured time window
			const firstTimestamp = occurrencesWithTimestamps[0].timestampMs;
			const windowMs = windowHours * 60 * 60 * 1000;
			const windowEnd = firstTimestamp + windowMs;

			// Get all occurrences within the time window
			const occurrencesInWindow = occurrencesWithTimestamps.filter((o) => o.timestampMs <= windowEnd);

			if (occurrencesInWindow.length < 2) return;

			// Calculate time span within the time window
			const lastTimestampInWindow = occurrencesInWindow[occurrencesInWindow.length - 1].timestampMs;
			const timeSpanMs = lastTimestampInWindow - firstTimestamp;
			const timeSpanHours = timeSpanMs / (1000 * 60 * 60);

			// Exclude plates with very short time spans (less than configured minimum)
			if (timeSpanHours < minTimeSpanHours) return;

			// Check if occurrences span multiple 15-minute buckets
			const bucketKeys = new Set<number>();
			occurrencesInWindow.forEach((o) => {
				const key = toBucketKey(o.timestamp);
				if (key !== null) bucketKeys.add(key);
			});

			// Safe plates have all detections in a single 15m bucket; exclude those
			if (bucketKeys.size < 2) return;

			// Add to unique plates set
			uniquePlates.add(plateKey);
		});

		return res.status(200).json({
			success: true,
			unique_plates_count: uniquePlates.size
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /suspicious-plates/chart
 * Get chart data for unique suspicious plates over time
 * Returns time-series data grouped by interval (hour, day, week)
 */
router.post('/suspicious-plates/chart', async (req: Request, res, next) => {
	try {
		const {
			date_start,
			date_end,
			time_start,
			time_end,
			cameras,
			timez,
			plates,
			plate_search_type,
			window_hours: rawWindowHours,
			min_time_span_hours: rawMinTimeSpanHours,
			interval: rawInterval = 'hour' // 'hour', 'day', 'week'
		} = req.body;

		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const bucketIntervalMs = 15 * 60 * 1000;
		const windowHours = Number(rawWindowHours) > 0 ? Number(rawWindowHours) : 24;
		const minTimeSpanHours = Number(rawMinTimeSpanHours) > 0 ? Number(rawMinTimeSpanHours) : 1;
		const plateAggSize = 10000;
		const maxOccurrencesSize = 100;
		const occurrencesSize = maxOccurrencesSize;

		// Determine interval for histogram
		let intervalStr: string;
		switch (rawInterval) {
			case 'day':
				intervalStr = '1d';
				break;
			case 'week':
				intervalStr = '1w';
				break;
			case 'hour':
			default:
				intervalStr = '1h';
				break;
		}

		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);
		const camera_filter = buildCameraFilter(req, cameras);

		// Build base query with must clauses
		const mustClauses = [...time_constraints, ...camera_filter];
		const mustNotClauses = [
			{ wildcard: { 'plate_number.keyword': '*\\**' } },
			{ wildcard: { 'plate_number.keyword': '*_*' } },
			{ regexp: { 'plate_number.keyword': '.*[_*].*' } }
		];

		// Handle plate search
		let plateSearchClauses: unknown[] = [];
		if (plate_search_type === 'noplate') {
			plateSearchClauses = [
				{
					bool: {
						should: [
							{ term: { 'plate_number.keyword': '********' } },
							{ term: { 'plate_number.keyword': '' } },
							{ bool: { must_not: [{ exists: { field: 'plate_number' } }] } }
						],
						minimum_should_match: 1
					}
				}
			];
			mustNotClauses.length = 0;
		} else if (plates?.length) {
			const plateStrings = platesToStrings(plates);
			const searchType = plate_search_type ?? 'normal';
			const tempQuery = {
				bool: {
					must: mustClauses,
					must_not: [],
					should: []
				}
			};
			plateSearchClauses = [
				{
					bool: {
						should: plateStrings
							.map((plateString) =>
								plateToQueryJSON(plateString, searchType, {
									originalQueryToAlter: tempQuery
								})
							)
							.flat(),
						minimum_should_match: 1
					}
				}
			];
		}

		if (plateSearchClauses.length > 0) {
			mustClauses.push(...plateSearchClauses);
		}

		const query = {
			index: process.env['PLATE_INDEX'] ?? 'plate_log',
			size: 0,
			query: {
				bool: {
					must: mustClauses,
					must_not: mustNotClauses
				}
			},
			aggs: {
				by_time: {
					date_histogram: {
						field: 'timestamp',
						fixed_interval: intervalStr,
						time_zone: timezone,
						min_doc_count: 1
					},
					aggs: {
						plates: {
							terms: {
								field: 'plate_number.keyword',
								size: plateAggSize,
								order: { _count: 'desc' },
								min_doc_count: 2
							},
							aggs: {
								first_seen: { min: { field: 'timestamp' } },
								last_seen: { max: { field: 'timestamp' } },
								occurrences: {
									top_hits: {
										size: occurrencesSize,
										_source: ['timestamp'],
										sort: [{ timestamp: { order: 'asc' } }]
									}
								}
							}
						}
					}
				}
			}
		};

		let esRes;
		try {
			esRes = await process.esclient.search(query);
		} catch (err: unknown) {
			if (isCustomTimeZoneUnsupportedError(err)) {
				const byTimeHistogram = query.aggs?.by_time?.date_histogram as Record<string, unknown> | undefined;
				if (byTimeHistogram?.time_zone) {
					// Legacy indices store timestamp as a long; remove time_zone so ES accepts the histogram.
					delete byTimeHistogram.time_zone;
				}
				try {
					esRes = await process.esclient.search(query);
				} catch (retryErr: unknown) {
					if (isIndexNotFoundError(retryErr)) {
						return res.status(200).json({
							success: true,
							data: [],
							interval: rawInterval,
							message: `Index ${query.index} not found. No data available.`
						});
					}
					throw retryErr;
				}
			} else if (isIndexNotFoundError(err)) {
				return res.status(200).json({
					success: true,
					data: [],
					interval: rawInterval,
					message: `Index ${query.index} not found. No data available.`
				});
			} else {
				throw err;
			}
		}

		type OccurrenceHit = {
			_source?: { timestamp?: string };
		};
		type PlateBucket = {
			key: string;
			doc_count: number;
			first_seen?: { value?: number };
			last_seen?: { value?: number };
			occurrences?: { hits?: { hits?: OccurrenceHit[] } };
		};
		type TimeBucket = {
			key: number;
			doc_count: number;
			plates?: { buckets?: PlateBucket[] };
		};

		const aggregations = esRes.aggregations as {
			by_time?: { buckets?: TimeBucket[] };
		};

		if (!aggregations?.by_time?.buckets) {
			return res.status(200).json({
				success: true,
				data: [],
				interval: rawInterval
			});
		}

		const toBucketKey = (ts: string | undefined | null): number | null => {
			if (!ts) return null;
			const n = new Date(ts).getTime();
			return Number.isFinite(n) ? Math.floor(n / bucketIntervalMs) : null;
		};

		// First, collect all occurrences for each plate across all time buckets
		// This matches the logic from the non-chart /suspicious-plates endpoint
		const plateOccurrencesMap = new Map<string, Array<{ timestampMs: number }>>();

		// Collect occurrences from all time buckets for each plate
		(aggregations.by_time.buckets ?? []).forEach((timeBucket) => {
			const plateBuckets = timeBucket.plates?.buckets ?? [];

			plateBuckets.forEach((plateBucket) => {
				const plateKey = plateBucket.key;
				const hits = plateBucket.occurrences?.hits?.hits ?? [];
				if (!hits.length) return;

				const allOccurrences = hits.map((hit) => ({
					timestamp: hit._source?.timestamp ?? null
				}));

				// Convert timestamps
				const occurrencesWithTimestamps = allOccurrences
					.map((o) => {
						if (!o.timestamp) return null;
						const ts =
							typeof o.timestamp === 'string' ? new Date(o.timestamp).getTime() : Number(o.timestamp);
						if (!Number.isFinite(ts) || ts <= 0) return null;
						return { timestampMs: ts };
					})
					.filter((o): o is { timestampMs: number } => o !== null);

				// Add occurrences to the plate's collection (may span multiple time buckets)
				if (!plateOccurrencesMap.has(plateKey)) {
					plateOccurrencesMap.set(plateKey, []);
				}
				plateOccurrencesMap.get(plateKey)!.push(...occurrencesWithTimestamps);
			});
		});

		// Now evaluate suspiciousness for each plate using all occurrences
		const allSuspiciousPlates = new Map<
			string,
			{
				plateKey: string;
				firstTimestamp: number;
			}
		>();

		plateOccurrencesMap.forEach((occurrences, plateKey) => {
			// Sort all occurrences by time
			const sortedOccurrences = occurrences.sort((a, b) => a.timestampMs - b.timestampMs);

			if (sortedOccurrences.length < 2) return;

			// Filter occurrences to only include those within the configured time window
			const firstTimestamp = sortedOccurrences[0].timestampMs;
			const windowMs = windowHours * 60 * 60 * 1000;
			const windowEnd = firstTimestamp + windowMs;

			// Get all occurrences within the time window
			const occurrencesInWindow = sortedOccurrences.filter((o) => o.timestampMs <= windowEnd);

			if (occurrencesInWindow.length < 2) return;

			// Calculate time span within the time window
			const lastTimestampInWindow = occurrencesInWindow[occurrencesInWindow.length - 1].timestampMs;
			const timeSpanMs = lastTimestampInWindow - firstTimestamp;
			const timeSpanHours = timeSpanMs / (1000 * 60 * 60);

			// Exclude plates with very short time spans (less than configured minimum)
			if (timeSpanHours < minTimeSpanHours) return;

			// Check if occurrences span multiple 15-minute buckets
			const bucketKeys = new Set<number>();
			occurrencesInWindow.forEach((o) => {
				const key = toBucketKey(new Date(o.timestampMs).toISOString());
				if (key !== null) bucketKeys.add(key);
			});

			// Safe plates have all detections in a single 15m bucket; exclude those
			if (bucketKeys.size < 2) return;

			// This plate is suspicious - store it with its first timestamp
			allSuspiciousPlates.set(plateKey, {
				plateKey,
				firstTimestamp
			});
		});

		// Now assign each suspicious plate to the appropriate time bucket based on first occurrence
		// Create a map of time bucket key -> set of plate keys
		const timeBucketPlateMap = new Map<number, Set<string>>();

		// Calculate bucket duration in milliseconds based on interval
		let bucketDurationMs: number;
		switch (rawInterval) {
			case 'day':
				bucketDurationMs = 24 * 60 * 60 * 1000;
				break;
			case 'week':
				bucketDurationMs = 7 * 24 * 60 * 60 * 1000;
				break;
			case 'hour':
			default:
				bucketDurationMs = 60 * 60 * 1000;
				break;
		}

		allSuspiciousPlates.forEach((plateData) => {
			// Find which time bucket this plate's first occurrence falls into
			const firstOccurrenceTime = plateData.firstTimestamp;
			const timeBucket = (aggregations.by_time?.buckets ?? []).find((tb) => {
				const bucketStart = tb.key;
				const bucketEnd = bucketStart + bucketDurationMs;
				return firstOccurrenceTime >= bucketStart && firstOccurrenceTime < bucketEnd;
			});

			if (timeBucket) {
				const timeBucketKey = timeBucket.key;
				if (!timeBucketPlateMap.has(timeBucketKey)) {
					timeBucketPlateMap.set(timeBucketKey, new Set());
				}
				timeBucketPlateMap.get(timeBucketKey)!.add(plateData.plateKey);
			}
		});

		// Build chart data by iterating through time buckets
		const chartData = (aggregations.by_time.buckets ?? []).map((timeBucket) => {
			const uniquePlates = timeBucketPlateMap.get(timeBucket.key) ?? new Set<string>();
			const uniquePlatesCount = uniquePlates.size;

			// Calculate total detections for suspicious plates in this time bucket
			let totalDetections = 0;
			const plateBuckets = timeBucket.plates?.buckets ?? [];
			plateBuckets.forEach((plateBucket) => {
				if (uniquePlates.has(plateBucket.key)) {
					totalDetections += plateBucket.doc_count;
				}
			});

			return {
				time: new Date(timeBucket.key).toLocaleString('en-US', { timeZone: timezone }),
				time_epoch: timeBucket.key,
				unique_plates_count: uniquePlatesCount,
				total_detections: totalDetections
			};
		});

		return res.status(200).json({
			success: true,
			data: chartData,
			interval: rawInterval,
			total: chartData.length
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /suspicious-plates/summary
 * Lightweight summary of suspicious plates (without occurrences array)
 */
router.post('/suspicious-plates/summary', async (req: Request, res, next) => {
	try {
		const {
			date_start,
			date_end,
			time_start,
			time_end,
			cameras,
			limit: rawLimit = 20,
			page: rawPage,
			timez,
			plates,
			plate_search_type,
			window_hours: rawWindowHours,
			min_time_span_hours: rawMinTimeSpanHours
		} = req.body;

		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const limit = Number(rawLimit) > 0 ? Number(rawLimit) : 20;
		const page = Number(rawPage) > 0 ? Number(rawPage) : 1;
		const bucketIntervalMs = 15 * 60 * 1000;

		// Configurable suspicious plate detection parameters
		// Window hours: Time window to check for occurrences (default: 24 hours)
		// Min time span hours: Minimum time span between first and last occurrence to be considered suspicious (default: 1 hour)
		const windowHours = Number(rawWindowHours) > 0 ? Number(rawWindowHours) : 24;
		const minTimeSpanHours = Number(rawMinTimeSpanHours) > 0 ? Number(rawMinTimeSpanHours) : 1;
		// Fetch a large number to get accurate total count (max 10000 for performance)
		// We need all data to calculate the true total after filtering
		const plateAggSize = 10000;

		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);
		const camera_filter = buildCameraFilter(req, cameras);

		// Build base query with must clauses
		const mustClauses = [...time_constraints, ...camera_filter];
		const mustNotClauses = [
			{ wildcard: { 'plate_number.keyword': '*\\**' } },
			{ wildcard: { 'plate_number.keyword': '*_*' } },
			{ regexp: { 'plate_number.keyword': '.*[_*].*' } }
		];

		// Handle plate search (similar to similar-plates-15min)
		// noplate mode: Search for logs without valid plate numbers
		let plateSearchClauses: unknown[] = [];
		if (plate_search_type === 'noplate') {
			// For noplate, we want to include plates with masks, so we don't add them to must_not
			// Instead, we add a specific query for masked plates
			plateSearchClauses = [
				{
					bool: {
						should: [
							{ term: { 'plate_number.keyword': '********' } },
							{ term: { 'plate_number.keyword': '' } },
							{ bool: { must_not: [{ exists: { field: 'plate_number' } }] } }
						],
						minimum_should_match: 1
					}
				}
			];
			// Remove the mask exclusions for noplate mode
			mustNotClauses.length = 0;
		} else if (plates?.length) {
			// Convert plate objects to string format
			const plateStrings = platesToStrings(plates);
			const searchType = plate_search_type ?? 'normal';

			// Add plate search clauses (OR between different plates)
			// Build a temporary query object for plateToQueryJSON
			const tempQuery = {
				bool: {
					must: mustClauses,
					must_not: [],
					should: []
				}
			};
			plateSearchClauses = [
				{
					bool: {
						// Each plate pattern becomes a query clause
						should: plateStrings
							.map((plateString) =>
								// plateToQueryJSON handles wildcards and search modes
								plateToQueryJSON(plateString, searchType, {
									originalQueryToAlter: tempQuery
								})
							)
							.flat(),
						minimum_should_match: 1
					}
				}
			];
		}

		// Add plate search clauses to must clauses if any
		if (plateSearchClauses.length > 0) {
			mustClauses.push(...plateSearchClauses);
		}

		const query = {
			index: process.env['PLATE_INDEX'] ?? 'plate_log',
			size: 0,
			query: {
				bool: {
					must: mustClauses,
					must_not: mustNotClauses
				}
			},
			aggs: {
				plates: {
					terms: {
						field: 'plate_number.keyword',
						size: plateAggSize,
						order: { _count: 'desc' },
						min_doc_count: 2
					},
					aggs: {
						first_seen: { min: { field: 'timestamp' } },
						last_seen: { max: { field: 'timestamp' } },
						cameras: {
							terms: {
								field: 'camera_id.keyword',
								size: 20
							}
						},
						occurrences: {
							top_hits: {
								size: 100,
								_source: ['timestamp'],
								sort: [{ timestamp: { order: 'asc' } }]
							}
						},
						sample: {
							top_hits: {
								size: 1,
								_source: ['plate_number', 'crop', 'inner_crop']
							}
						}
					}
				}
			}
		};

		let esRes;
		try {
			esRes = await process.esclient.search(query);
		} catch (err: unknown) {
			const error = err as { meta?: { body?: { error?: { type?: string } } }; message?: string };
			if (error.meta?.body?.error?.type === 'index_not_found_exception') {
				return res.status(200).json({
					success: true,
					data: [],
					total: 0,
					message: `Index ${query.index} not found. No data available.`
				});
			}
			throw err;
		}

		type OccurrenceHitSummary = {
			_source?: { timestamp?: string };
		};
		type PlateAggBucketSummary = {
			key: string;
			doc_count: number;
			first_seen?: { value?: number };
			last_seen?: { value?: number };
			cameras?: { buckets?: Array<{ key: string }> };
			occurrences?: { hits?: { hits?: OccurrenceHitSummary[] } };
			sample?: { hits?: { hits?: Array<{ _source?: { crop?: string; inner_crop?: string } }> } };
		};

		const aggregations = esRes.aggregations as {
			plates?: { buckets?: PlateAggBucketSummary[] };
		};

		if (!aggregations?.plates?.buckets) {
			return res.status(200).json({
				success: true,
				data: [],
				total: 0
			});
		}

		const allCameraIds = new Set<string>();
		(aggregations.plates.buckets ?? []).forEach((plateBucket) => {
			(plateBucket.cameras?.buckets ?? []).forEach((cam) => {
				const camId = String(cam.key);
				if (isValidObjectId(camId)) {
					allCameraIds.add(camId);
				}
			});
		});

		const cameraMap = await Camera.find({ _id: { $in: Array.from(allCameraIds) } })
			.exec()
			.then((docs) => new Map(docs.map((doc) => [doc._id.toString(), doc])));

		const suspicious: Array<{
			plate_number: unknown;
			plate_number_string: string;
			count: number;
			first_seen: string;
			last_seen: string;
			camera_ids: string[];
			cameras: Array<{ camera_id: string; camera_name: string }>;
			sample_crop: string | null;
			sample_inner_crop: string | null;
		}> = [];

		const toBucketKey = (ts: string | undefined | null): number | null => {
			if (!ts) return null;
			const n = new Date(ts).getTime();
			return Number.isFinite(n) ? Math.floor(n / bucketIntervalMs) : null;
		};

		(aggregations.plates.buckets ?? []).forEach((plateBucket) => {
			const plateKey = plateBucket.key;
			const hits = plateBucket.occurrences?.hits?.hits ?? [];
			if (!hits.length) return;

			// Convert timestamps and sort by time
			const occurrencesWithTimestamps = hits
				.map((hit) => {
					if (!hit._source?.timestamp) return null;
					const ts =
						typeof hit._source.timestamp === 'string'
							? new Date(hit._source.timestamp).getTime()
							: Number(hit._source.timestamp);
					if (!Number.isFinite(ts) || ts <= 0) return null;
					return { timestamp: hit._source.timestamp, timestampMs: ts };
				})
				.filter((o): o is { timestamp: string; timestampMs: number } => o !== null)
				.sort((a, b) => a.timestampMs - b.timestampMs);

			if (occurrencesWithTimestamps.length < 2) return;

			// Filter occurrences to only include those within the configured time window
			// Start from the first occurrence and include all occurrences within the window
			const firstTimestamp = occurrencesWithTimestamps[0].timestampMs;
			const windowMs = windowHours * 60 * 60 * 1000;
			const windowEnd = firstTimestamp + windowMs;

			// Get all occurrences within the time window
			const occurrencesInWindow = occurrencesWithTimestamps.filter((o) => o.timestampMs <= windowEnd);

			if (occurrencesInWindow.length < 2) return;

			// Calculate time span within the time window
			const lastTimestampInWindow = occurrencesInWindow[occurrencesInWindow.length - 1].timestampMs;
			const timeSpanMs = lastTimestampInWindow - firstTimestamp;
			const timeSpanHours = timeSpanMs / (1000 * 60 * 60);

			// Exclude plates with very short time spans (less than configured minimum) as these are likely normal entry/exit patterns
			// A normal visit (entry followed by exit) typically happens within minutes
			// Consider plates suspicious if they have multiple occurrences spanning at least the configured minimum within the time window
			// This catches vehicles that appear multiple times over an extended period (suspicious loitering/activity)
			if (timeSpanHours < minTimeSpanHours) return;

			// Check if occurrences span multiple 15-minute buckets
			const bucketKeys = new Set<number>();
			occurrencesInWindow.forEach((o) => {
				const key = toBucketKey(o.timestamp);
				if (key !== null) bucketKeys.add(key);
			});

			// Safe plates have all detections in a single 15m bucket; exclude those
			if (bucketKeys.size < 2) return;

			const sample = plateBucket.sample?.hits?.hits?.[0]?._source;
			// Use timestamps from filtered occurrences within 24-hour window
			const firstSeen = new Date(firstTimestamp);
			const lastSeen = new Date(occurrencesInWindow[occurrencesInWindow.length - 1].timestampMs);

			const cameraIds = (plateBucket.cameras?.buckets ?? []).map((c) => String(c.key));
			const uniqueCameraIds = Array.from(new Set(cameraIds));
			const camerasData = uniqueCameraIds.map((cid) => {
				const cam = isValidObjectId(cid) ? cameraMap.get(cid) : undefined;
				return { camera_id: cid, camera_name: cam?.name ?? 'Unknown' };
			});

			suspicious.push({
				plate_number: stringPlateToJson(plateKey),
				plate_number_string: plateKey,
				count: plateBucket.doc_count,
				first_seen: firstSeen.toLocaleString('en-US', { timeZone: timezone }),
				last_seen: lastSeen.toLocaleString('en-US', { timeZone: timezone }),
				camera_ids: uniqueCameraIds,
				cameras: camerasData,
				sample_crop: sample?.crop ?? null,
				sample_inner_crop: sample?.inner_crop ?? null
			});
		});

		const sorted = suspicious.sort((a, b) => b.count - a.count);
		const total = sorted.length;
		const start = (page - 1) * limit;
		const pagedData = sorted.slice(start, start + limit);

		return res.status(200).json({
			success: true,
			data: pagedData,
			total,
			page,
			limit,
			total_pages: Math.ceil(total / limit)
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /suspicious-plates/details
 * Get detailed occurrences for a specific suspicious plate
 */
router.post('/suspicious-plates/details', async (req: Request, res, next) => {
	try {
		const { plate_number, date_start, date_end, time_start, time_end, cameras, timez, occurrence_limit } =
			req.body;

		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		if (!plate_number) {
			return res.status(400).json({
				success: false,
				message: 'plate_number is required'
			});
		}
		const size = Number(occurrence_limit) > 0 ? Number(occurrence_limit) : 200;

		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);
		const camera_filter = buildCameraFilter(req, cameras);

		const query = {
			index: process.env['PLATE_INDEX'] ?? 'plate_log',
			size,
			query: {
				bool: {
					must: [...time_constraints, ...camera_filter, { term: { 'plate_number.keyword': plate_number } }]
				}
			},
			sort: [{ timestamp: { order: 'asc' } }],
			_source: ['timestamp', 'camera_id', 'crop', 'inner_crop', 'plate_number']
		};

		let esRes;
		try {
			esRes = await process.esclient.search(query);
		} catch (err: unknown) {
			const error = err as { meta?: { body?: { error?: { type?: string } } }; message?: string };
			if (error.meta?.body?.error?.type === 'index_not_found_exception') {
				return res.status(200).json({
					success: true,
					data: [],
					total: 0,
					message: `Index ${query.index} not found. No data available.`
				});
			}
			throw err;
		}

		type DetailHit = {
			_id?: string;
			_source?: {
				timestamp?: string;
				camera_id?: string;
				crop?: string;
				inner_crop?: string;
				plate_number?: string;
			};
		};
		const hits = (esRes.hits?.hits ?? []) as DetailHit[];

		if (hits.length === 0) {
			return res.status(200).json({
				success: true,
				data: [],
				total: 0
			});
		}

		const bucketIntervalMs = 15 * 60 * 1000;
		const toBucketKey = (ts: string | undefined | null): number | null => {
			if (!ts) return null;
			const n = new Date(ts).getTime();
			return Number.isFinite(n) ? Math.floor(n / bucketIntervalMs) : null;
		};

		const bucketKeys = new Set<number>();
		hits.forEach((hit) => {
			const key = toBucketKey(hit._source?.timestamp);
			if (key !== null) bucketKeys.add(key);
		});

		// If all detections are in a single 15m bucket, it's not suspicious
		if (bucketKeys.size < 2) {
			return res.status(200).json({
				success: true,
				data: [],
				total: 0,
				message: 'This plate is not suspicious (all detections within a single 15-minute window)'
			});
		}

		const cameraIdsSet = new Set<string>();
		hits.forEach((hit) => {
			const camId = hit._source?.camera_id;
			if (camId && isValidObjectId(camId)) {
				cameraIdsSet.add(camId);
			}
		});

		const cameraMap = await Camera.find({ _id: { $in: Array.from(cameraIdsSet) } })
			.exec()
			.then((docs) => new Map(docs.map((doc) => [doc._id.toString(), doc])));

		const occurrences = hits.map((hit) => ({
			log_id: hit._id ?? null,
			timestamp: hit._source?.timestamp ?? null,
			camera_id: hit._source?.camera_id ?? null,
			camera_name: hit._source?.camera_id
				? (cameraMap.get(String(hit._source?.camera_id))?.name ?? 'Unknown')
				: 'Unknown',
			crop: hit._source?.crop ?? null,
			inner_crop: hit._source?.inner_crop ?? null
		}));

		const timestamps = occurrences
			.map((o) => (o.timestamp ? new Date(o.timestamp).getTime() : undefined))
			.filter((t): t is number => typeof t === 'number');
		const firstSeen = timestamps.length ? new Date(Math.min(...timestamps)) : new Date();
		const lastSeen = timestamps.length ? new Date(Math.max(...timestamps)) : new Date();
		const uniqueCameraIds = Array.from(
			new Set(occurrences.map((o) => o.camera_id).filter((id): id is string => !!id))
		);
		const camerasData = uniqueCameraIds.map((cid) => {
			const cam = isValidObjectId(cid) ? cameraMap.get(cid) : undefined;
			return { camera_id: cid, camera_name: cam?.name ?? 'Unknown' };
		});

		return res.status(200).json({
			success: true,
			data: {
				plate_number: stringPlateToJson(String(plate_number)),
				plate_number_string: String(plate_number),
				first_seen: firstSeen.toLocaleString('en-US', { timeZone: timezone }),
				last_seen: lastSeen.toLocaleString('en-US', { timeZone: timezone }),
				count: occurrences.length,
				camera_ids: uniqueCameraIds,
				cameras: camerasData,
				occurrences
			},
			total: occurrences.length
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /most-repeated-known-faces
 * Get the most frequently detected known/recognized faces within a time range
 *
 * Returns:
 * - personnel_id: Personnel ID
 * - name: Full name
 * - count: Number of detections
 * - first_seen: First detection timestamp
 * - last_seen: Last detection timestamp
 * - cameras: List of cameras where detected
 * - allowed: Access permission status
 */
router.post('/most-repeated-known-faces', async (req: Request, res, next) => {
	try {
		const { date_start, date_end, time_start, time_end, cameras, limit = 10, timez } = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';

		// Build time range constraints
		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);

		// Build camera access filter
		const camera_filter = buildCameraFilter(req, cameras);

		// Query for known faces only
		const query = {
			index: process.env['FACE_INDEX'] ?? 'face_log',
			size: 0,
			query: {
				bool: {
					must: [
						...time_constraints,
						...camera_filter,
						{ exists: { field: 'personnel_id' } },
						{
							bool: {
								must_not: [{ term: { 'personnel_id.keyword': 'unknown' } }]
							}
						}
					]
				}
			},
			aggs: {
				repeated_faces: {
					terms: {
						field: 'personnel_id.keyword',
						size: limit,
						order: { _count: 'desc' }
					},
					aggs: {
						first_seen: { min: { field: 'timestamp' } },
						last_seen: { max: { field: 'timestamp' } },
						cameras: {
							terms: {
								field: 'camera_id.keyword',
								size: 10
							}
						},
						sample: {
							top_hits: {
								size: 1,
								_source: ['personnel_id', 'name', 'allowed', 'personnel_code', 'face']
							}
						},
						crops: {
							top_hits: {
								size: 10,
								_source: ['inner_crop', 'timestamp', 'camera_id'],
								sort: [{ timestamp: { order: 'desc' } }]
							}
						}
					}
				}
			}
		};

		let esRes;
		try {
			esRes = await process.esclient.search(query);
		} catch (err: unknown) {
			const error = err as { meta?: { body?: { error?: { type?: string } } }; message?: string };
			if (error.meta?.body?.error?.type === 'index_not_found_exception') {
				return res.status(200).json({
					success: true,
					data: [],
					total: 0,
					message: `Index ${query.index} not found. No data available.`
				});
			}
			throw err;
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const aggregations = esRes.aggregations as any;

		if (!aggregations?.repeated_faces?.buckets) {
			return res.status(200).json({
				success: true,
				data: [],
				total: 0
			});
		}

		// Enrich results with personnel and camera data
		// Collect all unique IDs first to batch fetch
		const allPersonnelIds = new Set<string>();
		const allCameraIds = new Set<string>();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(aggregations.repeated_faces?.buckets ?? []).forEach((bucket: any) => {
			const personnelId = bucket.key;
			if (personnelId && isValidObjectId(personnelId)) {
				allPersonnelIds.add(personnelId);
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(bucket.cameras?.buckets ?? []).forEach((c: any) => {
				if (isValidObjectId(c.key)) {
					allCameraIds.add(c.key);
				}
			});
		});

		// Batch fetch all personnel and cameras
		const [personnelMap, cameraMap] = await Promise.all([
			Personnel.find({ _id: { $in: Array.from(allPersonnelIds) } })
				.exec()
				.then((docs) => new Map(docs.map((doc) => [doc._id.toString(), doc]))),
			Camera.find({ _id: { $in: Array.from(allCameraIds) } })
				.exec()
				.then((docs) => new Map(docs.map((doc) => [doc._id.toString(), doc])))
		]);

		// Process results without nested database calls
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const data = (aggregations.repeated_faces?.buckets ?? []).map((bucket: any) => {
			const sample = bucket.sample?.hits?.hits?.[0]?._source;
			const personnelId = bucket.key;

			// Get personnel from cache
			const personnel =
				personnelId && isValidObjectId(personnelId) ? personnelMap.get(personnelId) : undefined;

			// Get camera names from cache
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const cameraIds = (bucket.cameras?.buckets ?? []).map((c: any) => c.key);
			const camerasData = cameraIds.map((cid: string) => {
				const cam = isValidObjectId(cid) ? cameraMap.get(cid) : undefined;
				return { camera_id: cid, camera_name: cam?.name ?? 'Unknown' };
			});

			// Extract crop images (without date formatting to improve speed)
			const crops =
				bucket.crops?.hits?.hits?.map(
					(hit: {
						_id?: string;
						_source?: { inner_crop?: string; timestamp?: string; camera_id?: string };
					}) => ({
						log_id: hit._id ?? null,
						inner_crop: hit._source?.inner_crop ?? null,
						timestamp: hit._source?.timestamp ?? null,
						camera_id: hit._source?.camera_id ?? null
					})
				) ?? [];

			return {
				personnel_id: personnelId,
				personnel_code: personnel?.personnel_code ?? sample?.personnel_code ?? '',
				name: personnel?.toName() ?? sample?.name ?? 'Unknown',
				count: bucket.doc_count,
				first_seen: new Date(bucket.first_seen.value).toLocaleString('en-US', { timeZone: timezone }),
				last_seen: new Date(bucket.last_seen.value).toLocaleString('en-US', { timeZone: timezone }),
				cameras: camerasData,
				allowed: sample?.allowed ?? null,
				is_recognized: true,
				face_image: sample?.face ?? null,
				crops: crops
			};
		});

		return res.status(200).json({
			success: true,
			data,
			total: data.length
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
<<<<<<< /home/mohammad-kavosi/Desktop/project/ariapa/isss-backend/src/routes/report/analytics.report.ts
=======
 * OLD IMPLEMENTATION REMOVED (duplicate route handler removed)
 * The route previously computed clusters inline, which caused:
 * - Blocking requests (30-120 seconds)
 * - Exponential time complexity as data grows
 * - High memory usage
 *
 * NEW IMPLEMENTATION:
 * - Route only reads from Redis cache (instant response)
 * - Background job computes clusters every 15 minutes
 * - Incremental updates (only processes new faces)
 * - See: src/config/analyticsCacheJobs.config.ts
 */

/*
// START OF REMOVED CODE
const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);

		const cameraFilter = cameras || camera_ids;
		const camera_filter = buildCameraFilter(req, cameraFilter);

		const indexName = process.env['FACE_INDEX'] ?? 'face_log';
		const pageSize = 3000;
		const scrollTimeout = '3m';

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let allHits: any[] = [];
		let scrollId: string | undefined;

		try {
			const searchParams = {
				index: indexName,
				size: pageSize,
				scroll: scrollTimeout,
				body: {
					query: {
						bool: {
							must: [...time_constraints, ...camera_filter, { exists: { field: 'vector' } }],
							should: [
								{ term: { 'personnel_id.keyword': 'unknown' } },
								{ bool: { must_not: [{ exists: { field: 'personnel_id' } }] } }
							],
							minimum_should_match: 1
						}
					},
					sort: [{ timestamp: { order: 'desc' } }],
					_source: [
						'personnel_id',
						'name',
						'allowed',
						'personnel_code',
						'inner_crop',
						'timestamp',
						'camera_id',
						'track_id',
						'vector'
					]
				},
				preference: '_local'
			};
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let searchResult = await process.esclient.search(searchParams as any);

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			allHits = (searchResult.hits?.hits as any[]) || [];
			scrollId = searchResult._scroll_id as string | undefined;

			while (scrollId && searchResult.hits?.hits && searchResult.hits.hits.length > 0) {
				searchResult = await process.esclient.scroll({
					scroll_id: scrollId,
					scroll: scrollTimeout
				});

				if (searchResult.hits?.hits && searchResult.hits.hits.length > 0) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					allHits = allHits.concat(searchResult.hits.hits as any[]);
					scrollId = searchResult._scroll_id as string | undefined;
				} else {
					break;
				}
			}
		} catch (err: unknown) {
			const error = err as { meta?: { body?: { error?: { type?: string } } }; message?: string };
			if (error.meta?.body?.error?.type === 'index_not_found_exception') {
				return res.status(200).json({
					success: true,
					data: [],
					total: 0,
					message: `Index ${indexName} not found. No data available.`
				});
			}
			throw err;
		} finally {
			if (scrollId) {
				await process.esclient.clearScroll({ scroll_id: scrollId }).catch((error) => {
					console.warn(`Failed to clear scroll for index ${indexName}`, error);
				});
			}
		}

		const hits = allHits;

		if (hits.length === 0) {
			return res.status(200).json({
				success: true,
				data: [],
				total: 0
			});
		}

		const faceVectors = hits
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.filter((hit: any) => {
				const vec = hit._source?.vector;
				return (
					vec &&
					Array.isArray(vec) &&
					vec.length > 0 &&
					vec.every((v: number) => typeof v === 'number' && !isNaN(v))
				);
			})
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.map((hit: any) => ({
				vector: hit._source.vector,
				data: {
					...hit._source,
					_id: hit._id
				}
			}));

		let clusters: any[][];

		const sampleSize = Math.min(10000, Math.max(5000, Math.floor(faceVectors.length * 0.1)));

		if (faceVectors.length <= sampleSize) {
			clusters = dbscanClustering(faceVectors, 0.4, 1);
		} else {
			const sampleVectors = faceVectors.slice(0, sampleSize);
			const sampleClusters = dbscanClustering(sampleVectors, 0.4, 1);

			const clusterCentroids = sampleClusters
				.map((cluster) => {
					const vectors = cluster
						.map((item: any) => {
							const matchingVector = sampleVectors.find((v) => v.data._id === item._id);
							return matchingVector?.vector;
						})
						.filter((v): v is number[] => v !== undefined);

					if (vectors.length === 0) return null;

					const centroid = new Array(vectors[0].length).fill(0);
					for (const vec of vectors) {
						for (let i = 0; i < vec.length; i++) {
							centroid[i] += vec[i];
						}
					}
					for (let i = 0; i < centroid.length; i++) {
						centroid[i] /= vectors.length;
					}
					return { centroid, cluster };
				})
				.filter((c): c is { centroid: number[]; cluster: any[] } => c !== null);

			const remainingVectors = faceVectors.slice(sampleSize);
			const batchSize = 1000;
			const unmatchedVectors: Array<{ vector: number[]; data: any }> = [];

			for (let i = 0; i < remainingVectors.length; i += batchSize) {
				const batch = remainingVectors.slice(i, i + batchSize);

				for (const faceVector of batch) {
					let bestClusterIdx = -1;
					let bestSimilarity = -1;

					for (let j = 0; j < clusterCentroids.length; j++) {
						const similarity = cosineSimilarity(faceVector.vector, clusterCentroids[j].centroid);
						if (similarity > bestSimilarity) {
							bestSimilarity = similarity;
							bestClusterIdx = j;
						}
					}

					if (bestClusterIdx !== -1 && bestSimilarity >= 0.6) {
						clusterCentroids[bestClusterIdx].cluster.push(faceVector.data);
					} else {
						unmatchedVectors.push(faceVector);
					}
				}
			}

			clusters = clusterCentroids.map((c) => c.cluster);

			if (unmatchedVectors.length > 0) {
				if (unmatchedVectors.length <= 5000) {
					const unmatchedClusters = dbscanClustering(unmatchedVectors, 0.4, 1);
					clusters.push(...unmatchedClusters);
				} else {
					const unmatchedSample = unmatchedVectors.slice(0, 2000);
					const unmatchedSampleClusters = dbscanClustering(unmatchedSample, 0.4, 1);

					const unmatchedCentroids = unmatchedSampleClusters
						.map((cluster) => {
							const vectors = cluster
								.map((item: any) => {
									const matchingVector = unmatchedSample.find((v) => v.data._id === item._id);
									return matchingVector?.vector;
								})
								.filter((v): v is number[] => v !== undefined);

							if (vectors.length === 0) return null;

							const centroid = new Array(vectors[0].length).fill(0);
							for (const vec of vectors) {
								for (let i = 0; i < vec.length; i++) {
									centroid[i] += vec[i];
								}
							}
							for (let i = 0; i < centroid.length; i++) {
								centroid[i] /= vectors.length;
							}
							return { centroid, cluster };
						})
						.filter((c): c is { centroid: number[]; cluster: any[] } => c !== null);

					const remainingUnmatched = unmatchedVectors.slice(2000);
					for (const faceVector of remainingUnmatched) {
						let bestIdx = -1;
						let bestSim = -1;

						for (let j = 0; j < unmatchedCentroids.length; j++) {
							const sim = cosineSimilarity(faceVector.vector, unmatchedCentroids[j].centroid);
							if (sim > bestSim) {
								bestSim = sim;
								bestIdx = j;
							}
						}

						if (bestIdx !== -1 && bestSim >= 0.6) {
							unmatchedCentroids[bestIdx].cluster.push(faceVector.data);
						} else {
							clusters.push([faceVector.data]);
						}
					}

					clusters.push(...unmatchedCentroids.map((c) => c.cluster));
				}
			}
		}

		const sortedClusters = clusters.sort((a, b) => {
			if (b.length !== a.length) return b.length - a.length;
			const aMinTime = Math.min(
				...a.map((log: { timestamp?: string }) => new Date(log.timestamp ?? 0).getTime())
			);
			const bMinTime = Math.min(
				...b.map((log: { timestamp?: string }) => new Date(log.timestamp ?? 0).getTime())
			);
			return aMinTime - bMinTime;
		});

		let filteredClusters = sortedClusters.filter((cluster) => Array.isArray(cluster) && cluster.length > 0);
		if (camera_ids && Array.isArray(camera_ids) && camera_ids.length > 0) {
			filteredClusters = filteredClusters.filter((clusterLogs) => {
				return (
					Array.isArray(clusterLogs) &&
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					clusterLogs.some((log: any) => log?.camera_id && camera_ids.includes(log.camera_id))
				);
			});
		}

		const allCameraIds = new Set<string>();
		filteredClusters.forEach((clusterLogs) => {
			const logsArray = Array.isArray(clusterLogs) ? clusterLogs : [];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			logsArray.forEach((log: any) => {
				if (log?.camera_id && isValidObjectId(log.camera_id)) {
					allCameraIds.add(log.camera_id);
				}
			});
		});

		const cameraMap = await Camera.find({ _id: { $in: Array.from(allCameraIds) } })
			.exec()
			.then((docs) => new Map(docs.map((doc) => [doc._id.toString(), doc])));

		const data = filteredClusters
			.filter((clusterLogs) => Array.isArray(clusterLogs) && clusterLogs.length > 0)
			.map((clusterLogs, clusterIdx: number) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const cameraSet = new Set(clusterLogs.map((log: any) => log?.camera_id).filter(Boolean));
				const cameraIds = Array.from(cameraSet);

				const camerasData = cameraIds.map((cid: string) => {
					const cam = isValidObjectId(cid) ? cameraMap.get(cid) : undefined;
					return { camera_id: cid, camera_name: cam?.name ?? 'Unknown' };
				});

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const timestamps = clusterLogs.map((log: any) => new Date(log.timestamp).getTime());
				const firstSeen = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : new Date();
				const lastSeen = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();

				const representativeFace = clusterLogs[0];

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const crops = clusterLogs.slice(0, 10).map((log: any) => ({
					log_id: log._id ?? null,
					inner_crop: log.inner_crop ?? null,
					timestamp: log.timestamp ?? null,
					camera_id: log.camera_id ?? null
				}));

				return {
					personnel_id: 'unknown',
					personnel_code: '',
					name: `Unknown Person #${clusterIdx + 1}`,
					count: clusterLogs.length,
					first_seen: firstSeen.toLocaleString('en-US', { timeZone: timezone }),
					last_seen: lastSeen.toLocaleString('en-US', { timeZone: timezone }),
					camera_ids: cameraIds,
					cameras: camerasData,
					allowed: representativeFace?.allowed ?? null,
					is_recognized: false,
					inner_crop: representativeFace?.inner_crop ?? null,
					cluster_id: clusterIdx + 1,
					crops: crops
				};
			});

		const result = { data, total: data.length };

		if (cacheService) {
			try {
				await cacheService.setCachedData('most-repeated-unknown-faces', cacheParams, result, 400);
			} catch (cacheError) {
				console.warn('Failed to cache result:', cacheError);
			}
		}

		return res.status(200).json({
			success: true,
			...result,
			cached: false
		});
*/
// END OF REMOVED CODE - All above computation logic moved to background job

/**
>>>>>>> /home/mohammad-kavosi/.windsurf/worktrees/isss-backend/isss-backend-6dc1b61f/src/routes/report/analytics.report.ts
 * POST /most-active-cameras
 * Get cameras with the most detections within a time range
 *
 * Returns:
 * - camera_id: Camera ID
 * - camera_name: Camera name
 * - camera_type: Camera type
 * - total_count: Total number of detections
 * - detection_type: Primary detection type (plate or face - cameras can only have one AI model)
 * - detection_count: Count for the primary detection type
 * - plate_statistics: Plate statistics (only if detection_type is 'plate')
 *   - normal_plates: Count of normal plates (without * or _)
 *   - damaged_plates: Count of damaged plates (with * or _)
 *   - no_plates: Count of no plate detections (empty or '********')
 *   - total_plates: Total plate detections
 * - face_statistics: Face statistics (only if detection_type is 'face')
 *   - known_faces: Count of recognized faces (with valid personnel_id)
 *   - unknown_faces: Count of unrecognized faces (personnel_id = 'unknown' or missing)
 *   - total_faces: Total face detections
 * - first_detection: First detection timestamp
 * - last_detection: Last detection timestamp
 */
router.post('/most-active-cameras', async (req: Request, res, next) => {
	try {
		const {
			date_start,
			date_end,
			time_start,
			time_end,
			cameras,
			limit = 10,
			timez,
			index_type = 'all'
		} = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';

		// Build time range constraints
		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);

		// Build camera access filter
		const camera_filter = buildCameraFilter(req, cameras);

		// Determine which indices to query
		const indices = getIndicesForType(index_type);

		// Query each index and aggregate results
		const results = await Promise.all(
			indices.map(async ({ index, type }) => {
				const query = {
					index,
					size: 0,
					query: {
						bool: {
							must: [...time_constraints, ...camera_filter]
						}
					},
					aggs: {
						active_cameras: {
							terms: {
								field: 'camera_id.keyword',
								size: limit * 2, // Get more to merge across indices
								order: { _count: 'desc' }
							},
							aggs: {
								first_detection: { min: { field: 'timestamp' } },
								last_detection: { max: { field: 'timestamp' } }
							}
						}
					}
				};

				let esRes;
				try {
					esRes = await process.esclient.search(query);
				} catch (err: unknown) {
					const error = err as { meta?: { body?: { error?: { type?: string } } } };
					if (error.meta?.body?.error?.type === 'index_not_found_exception') {
						// Return empty result for this index
						return { type, cameras: [] };
					}
					throw err;
				}
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const aggregations = esRes.aggregations as any;

				return {
					type,
					buckets: aggregations?.active_cameras?.buckets ?? []
				};
			})
		);

		// Merge results from different indices
		// Since each camera can only have one AI model, we keep only the detection type with highest count
		interface CameraData {
			camera_id: string;
			total_count: number;
			detection_type: string;
			detection_count: number;
			first_detection: number;
			last_detection: number;
		}
		const cameraMap = new Map<string, CameraData>();

		for (const { type, buckets } of results) {
			const bucketArray = Array.isArray(buckets) ? buckets : [];
			for (const bucket of bucketArray) {
				const cameraId = bucket?.key;
				const docCount = bucket?.doc_count ?? 0;
				const firstDetection = bucket?.first_detection?.value ?? Date.now();
				const lastDetection = bucket?.last_detection?.value ?? Date.now();

				// Skip if cameraId is missing or invalid
				if (!cameraId) continue;

				if (!cameraMap.has(cameraId)) {
					cameraMap.set(cameraId, {
						camera_id: cameraId,
						total_count: docCount,
						detection_type: type,
						detection_count: docCount,
						first_detection: firstDetection,
						last_detection: lastDetection
					});
				} else {
					const camera = cameraMap.get(cameraId)!;
					// If this detection type has more counts, replace the detection type
					// Since cameras can only have one AI model, we keep the dominant one
					if (docCount > camera.detection_count) {
						camera.detection_type = type;
						camera.detection_count = docCount;
					}
					camera.total_count += docCount;
					camera.first_detection = Math.min(camera.first_detection, firstDetection);
					camera.last_detection = Math.max(camera.last_detection, lastDetection);
				}
			}
		}

		// Sort by total count and take top N
		const data = Array.from(cameraMap.values())
			.sort((a, b) => b.total_count - a.total_count)
			.slice(0, limit);

		// Get plate and face statistics in parallel for better performance
		// Only query for cameras we actually need (from the data array)
		const neededCameraIds = data.map((item) => item.camera_id).filter((id) => id);
		const plateIndex = process.env['PLATE_INDEX'] ?? 'plate_log';
		const faceIndex = process.env['FACE_INDEX'] ?? 'face_log';
		const plateStatsMap = new Map<string, { normal: number; damaged: number; no_plate: number }>();
		const faceStatsMap = new Map<string, { known: number; unknown: number }>();

		// Build camera filter for statistics queries (only query cameras we need)
		const statsCameraFilter =
			neededCameraIds.length > 0
				? [
						{
							bool: {
								should: neededCameraIds.map((cameraId) => ({
									term: { 'camera_id.keyword': cameraId }
								})),
								minimum_should_match: 1
							}
						}
					]
				: [];

		// Run plate and face statistics queries in parallel
		await Promise.allSettled([
			// Plate statistics query
			(async () => {
				try {
					const plateQuery = {
						index: plateIndex,
						size: 0,
						query: {
							bool: {
								must: [...time_constraints, ...camera_filter, ...statsCameraFilter]
							}
						},
						aggs: {
							cameras: {
								terms: {
									field: 'camera_id.keyword',
									size: neededCameraIds.length || limit
								},
								aggs: {
									normal_plates: {
										filter: {
											bool: {
												must_not: [
													{ wildcard: { 'plate_number.keyword': '*\\**' } },
													{ wildcard: { 'plate_number.keyword': '*_*' } },
													{ term: { 'plate_number.keyword': '********' } },
													{ term: { 'plate_number.keyword': '' } }
												]
											}
										}
									},
									damaged_plates: {
										filter: {
											bool: {
												must: [
													{
														bool: {
															should: [
																{ wildcard: { 'plate_number.keyword': '*\\**' } },
																{ wildcard: { 'plate_number.keyword': '*_*' } }
															],
															minimum_should_match: 1
														}
													}
												],
												must_not: [
													{ term: { 'plate_number.keyword': '********' } },
													{ term: { 'plate_number.keyword': '' } }
												]
											}
										}
									},
									no_plates: {
										filter: {
											bool: {
												should: [
													{ term: { 'plate_number.keyword': '********' } },
													{ term: { 'plate_number.keyword': '' } }
												],
												minimum_should_match: 1
											}
										}
									}
								}
							}
						}
					};

					let plateRes;
					try {
						plateRes = await process.esclient.search(plateQuery);
					} catch (searchErr: unknown) {
						const searchError = searchErr as { meta?: { body?: { error?: { type?: string } } } };
						if (searchError.meta?.body?.error?.type === 'index_not_found_exception') {
							// Plate index doesn't exist, continue without plate stats
							return;
						}
						throw searchErr;
					}

					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const plateAggs = plateRes?.aggregations as any;

					if (plateAggs?.cameras?.buckets) {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(plateAggs.cameras.buckets ?? []).forEach((bucket: any) => {
							const bucketKey = bucket?.key as string;
							if (!bucketKey) return;
							const normalPlates = bucket.normal_plates?.doc_count || 0;
							const damagedPlates = bucket.damaged_plates?.doc_count || 0;
							const noPlates = bucket.no_plates?.doc_count || 0;
							plateStatsMap.set(bucketKey, {
								normal: normalPlates,
								damaged: damagedPlates,
								no_plate: noPlates
							});
						});
					}
				} catch (err: unknown) {
					// If plate index doesn't exist or error occurs, continue without plate stats
					const error = err as { message?: string };
					console.warn('Could not fetch plate statistics:', error.message || 'Unknown error');
				}
			})(),
			// Face statistics query
			(async () => {
				try {
					const faceQuery = {
						index: faceIndex,
						size: 0,
						query: {
							bool: {
								must: [...time_constraints, ...camera_filter, ...statsCameraFilter]
							}
						},
						aggs: {
							cameras: {
								terms: {
									field: 'camera_id.keyword',
									size: neededCameraIds.length || limit
								},
								aggs: {
									known_faces: {
										filter: {
											bool: {
												must: [{ exists: { field: 'personnel_id' } }],
												must_not: [{ term: { 'personnel_id.keyword': 'unknown' } }]
											}
										}
									},
									unknown_faces: {
										filter: {
											bool: {
												should: [
													{ term: { 'personnel_id.keyword': 'unknown' } },
													{ bool: { must_not: [{ exists: { field: 'personnel_id' } }] } }
												],
												minimum_should_match: 1
											}
										}
									}
								}
							}
						}
					};

					let faceRes;
					try {
						faceRes = await process.esclient.search(faceQuery);
					} catch (searchErr: unknown) {
						const searchError = searchErr as { meta?: { body?: { error?: { type?: string } } } };
						if (searchError.meta?.body?.error?.type === 'index_not_found_exception') {
							// Face index doesn't exist, continue without face stats
							return;
						}
						throw searchErr;
					}

					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const faceAggs = faceRes?.aggregations as any;

					if (faceAggs?.cameras?.buckets) {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(faceAggs.cameras.buckets ?? []).forEach((bucket: any) => {
							const bucketKey = bucket?.key as string;
							if (!bucketKey) return;
							const knownFaces = bucket.known_faces?.doc_count || 0;
							const unknownFaces = bucket.unknown_faces?.doc_count || 0;
							faceStatsMap.set(bucketKey, {
								known: knownFaces,
								unknown: unknownFaces
							});
						});
					}
				} catch (err: unknown) {
					// If face index doesn't exist or error occurs, continue without face stats
					const error = err as { message?: string };
					console.warn('Could not fetch face statistics:', error.message || 'Unknown error');
				}
			})()
		]);

		// Batch fetch all cameras at once for better performance
		const cameraIds = data.map((item) => item.camera_id).filter((id) => isValidObjectId(id));
		const camerasMap = await Camera.find({ _id: { $in: cameraIds } })
			.exec()
			.then((docs) => new Map(docs.map((doc) => [doc._id.toString(), doc])));

		// Enrich with camera names and statistics based on detection type
		const enrichedData = data.map((item) => {
			const camera = isValidObjectId(item.camera_id) ? camerasMap.get(item.camera_id) : undefined;

			const result: {
				camera_id: string;
				camera_name: string;
				camera_type: string;
				total_count: number;
				detection_type: string;
				detection_count: number;
				plate_statistics?: {
					normal_plates: number;
					damaged_plates: number;
					no_plates: number;
					total_plates: number;
				};
				face_statistics?: {
					known_faces: number;
					unknown_faces: number;
					total_faces: number;
				};
				first_detection: string;
				last_detection: string;
			} = {
				camera_id: item.camera_id,
				camera_name: camera?.name ?? 'Unknown',
				camera_type: camera?.camera_type ?? '',
				total_count: item.total_count,
				detection_type: item.detection_type,
				detection_count: item.detection_count,
				first_detection: new Date(item.first_detection).toLocaleString('en-US', { timeZone: timezone }),
				last_detection: new Date(item.last_detection).toLocaleString('en-US', { timeZone: timezone })
			};

			// Add plate statistics if detection type is plate
			if (item.detection_type === 'plate') {
				const plateStats = plateStatsMap.get(item.camera_id) || {
					normal: 0,
					damaged: 0,
					no_plate: 0
				};
				result.plate_statistics = {
					normal_plates: plateStats.normal,
					damaged_plates: plateStats.damaged,
					no_plates: plateStats.no_plate,
					total_plates: plateStats.normal + plateStats.damaged + plateStats.no_plate
				};
			}

			// Add face statistics if detection type is face
			if (item.detection_type === 'face') {
				const faceStats = faceStatsMap.get(item.camera_id) || {
					known: 0,
					unknown: 0
				};
				result.face_statistics = {
					known_faces: faceStats.known,
					unknown_faces: faceStats.unknown,
					total_faces: faceStats.known + faceStats.unknown
				};
			}

			return result;
		});

		return res.status(200).json({
			success: true,
			data: enrichedData,
			total: enrichedData.length
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /brand-statistics
 * Get vehicle brand statistics within a time range
 *
 * Returns distribution of detected vehicle brands
 */
router.post('/brand-statistics', async (req: Request, res, next) => {
	try {
		const { date_start, date_end, time_start, time_end, cameras, limit = 20, timez } = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';

		// Build time range constraints
		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);

		// Build camera access filter
		const camera_filter = buildCameraFilter(req, cameras);

		// Elasticsearch aggregation query
		const query = {
			index: process.env['PLATE_INDEX'] ?? 'plate_log',
			size: 0,
			query: {
				bool: {
					must: [...time_constraints, ...camera_filter, { exists: { field: 'brand' } }]
				}
			},
			aggs: {
				brands: {
					terms: {
						field: 'brand.keyword',
						size: limit,
						order: { _count: 'desc' }
					}
				}
			}
		};

		let esRes;
		try {
			esRes = await process.esclient.search(query);
		} catch (err: unknown) {
			const error = err as { meta?: { body?: { error?: { type?: string } } }; message?: string };
			if (error.meta?.body?.error?.type === 'index_not_found_exception') {
				return res.status(200).json({
					success: true,
					data: [],
					total: 0,
					message: `Index ${query.index} not found. No data available.`
				});
			}
			throw err;
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const aggregations = esRes.aggregations as any;

		if (!aggregations?.brands?.buckets) {
			return res.status(200).json({
				success: true,
				data: [],
				total: 0
			});
		}

		// Enrich with brand names
		const data = await Promise.all(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(aggregations.brands?.buckets ?? []).map(async (bucket: any) => {
				let brand = undefined;
				if (isValidObjectId(bucket.key)) {
					brand = await CarBrand.findById(bucket.key).exec();
				}

				return {
					brand_id: bucket.key,
					brand_name: brand?.name ?? 'Unknown',
					car_type: brand?.car_type ?? '',
					count: bucket.doc_count
				};
			})
		);

		return res.status(200).json({
			success: true,
			data,
			total: data.length
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * ===================================
 * PEOPLE COUNTING HELPER FUNCTION
 * ===================================
 */

/**
 * Helper function to get people counting data from Elasticsearch
 * Used by all three people counting endpoints
 * @param intervalHours - Interval in hours for histogram aggregation (1, 2, 4, or 12)
 */
async function getPeopleCountingData(req: Request, intervalHours: number = 1) {
	const { date_start, date_end, time_start, time_end, cameras, timez } = req.body;
	const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
	const intervalMs = intervalHours * 3600000; // Convert hours to milliseconds

	// Build time range constraints
	const time_constraints = buildTimeConstraints(
		date_start,
		date_end,
		time_start,
		time_end,
		timezone,
		req.body.time_filter
	);

	// Get all cameras with their types (enter/exit)
	const cameraAccess = Array.isArray(req.user.camera_access) ? req.user.camera_access : [];
	const cameraQuery =
		req.user.role === 'admin'
			? cameras && cameras.length > 0
				? { _id: { $in: cameras } }
				: {}
			: {
					_id: {
						$in:
							cameras && cameras.length > 0
								? cameras.filter((c: string) => cameraAccess.map(String).includes(c))
								: cameraAccess
					}
				};

	const allCameras = await Camera.find(cameraQuery).exec();
	const cameraTypeMap = new Map<string, { name: string; type: string }>();
	const entryCameraIds: string[] = [];
	const exitCameraIds: string[] = [];

	allCameras.forEach((cam) => {
		const camId = cam._id.toString();
		cameraTypeMap.set(camId, { name: cam.name, type: cam.camera_type ?? 'null' });
		if (cam.camera_type === 'enter') {
			entryCameraIds.push(camId);
		} else if (cam.camera_type === 'exit') {
			exitCameraIds.push(camId);
		}
	});

	const faceIndex: string = process.env['FACE_INDEX'] ?? 'face_log';

	// Build queries for entry and exit cameras
	// Note: camera_filter is NOT included here because cameraIds are already
	// filtered from allCameras which respects user access permissions
	const buildFaceQuery = (cameraIds: string[], isKnown: boolean) => {
		const cameraConstraint =
			cameraIds.length > 0
				? [
						{
							bool: {
								should: cameraIds.map((cid) => ({ term: { 'camera_id.keyword': cid } })),
								minimum_should_match: 1
							}
						}
					]
				: [];

		const personnelConstraint = isKnown
			? [
					{ exists: { field: 'personnel_id' } },
					{ bool: { must_not: [{ term: { 'personnel_id.keyword': 'unknown' } }] } }
				]
			: [
					{
						bool: {
							should: [
								{ term: { 'personnel_id.keyword': 'unknown' } },
								{ bool: { must_not: [{ exists: { field: 'personnel_id' } }] } }
							],
							minimum_should_match: 1
						}
					}
				];

		const aggs: Record<string, unknown> = {
			by_camera: {
				terms: {
					field: 'camera_id.keyword',
					size: 1000
				}
			},
			by_hour: {
				histogram: {
					field: 'timestamp',
					interval: intervalMs
				},
				aggs: {
					by_camera: {
						terms: {
							field: 'camera_id.keyword',
							size: 1000
						}
					}
				}
			}
		};

		// Add by_person aggregation for known personnel with camera breakdown
		if (isKnown) {
			aggs.by_person = {
				terms: {
					field: 'personnel_id.keyword',
					size: 10000
				},
				aggs: {
					by_camera: {
						terms: {
							field: 'camera_id.keyword',
							size: 100
						}
					}
				}
			};
		}

		return {
			index: faceIndex,
			size: 0,
			track_total_hits: true,
			query: {
				bool: {
					must: [...time_constraints, ...cameraConstraint, ...personnelConstraint]
				}
			},
			aggs
		};
	};

	// Execute all queries in parallel
	const [entryKnownRes, entryUnknownRes, exitKnownRes, exitUnknownRes] = await Promise.all([
		// Entry - Known personnel
		(async () => {
			if (entryCameraIds.length === 0) return null;
			try {
				return await process.esclient.search(buildFaceQuery(entryCameraIds, true));
			} catch (err: unknown) {
				const error = err as { meta?: { body?: { error?: { type?: string } } } };
				if (error.meta?.body?.error?.type === 'index_not_found_exception') return null;
				throw err;
			}
		})(),
		// Entry - Unknown
		(async () => {
			if (entryCameraIds.length === 0) return null;
			try {
				return await process.esclient.search(buildFaceQuery(entryCameraIds, false));
			} catch (err: unknown) {
				const error = err as { meta?: { body?: { error?: { type?: string } } } };
				if (error.meta?.body?.error?.type === 'index_not_found_exception') return null;
				throw err;
			}
		})(),
		// Exit - Known personnel
		(async () => {
			if (exitCameraIds.length === 0) return null;
			try {
				return await process.esclient.search(buildFaceQuery(exitCameraIds, true));
			} catch (err: unknown) {
				const error = err as { meta?: { body?: { error?: { type?: string } } } };
				if (error.meta?.body?.error?.type === 'index_not_found_exception') return null;
				throw err;
			}
		})(),
		// Exit - Unknown
		(async () => {
			if (exitCameraIds.length === 0) return null;
			try {
				return await process.esclient.search(buildFaceQuery(exitCameraIds, false));
			} catch (err: unknown) {
				const error = err as { meta?: { body?: { error?: { type?: string } } } };
				if (error.meta?.body?.error?.type === 'index_not_found_exception') return null;
				throw err;
			}
		})()
	]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const getTotal = (res: any) => res?.hits?.total?.value ?? 0;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const getAggs = (res: any) => res?.aggregations;

	return {
		entryKnownRes,
		entryUnknownRes,
		exitKnownRes,
		exitUnknownRes,
		getTotal,
		getAggs,
		cameraTypeMap,
		timezone
	};
}

/**
 * POST /people-counting-summary
 * Get overall people counting statistics (entry/exit) separated by personnel and unknown
 *
 * Returns:
 * - total_entry: Total people entered
 * - total_exit: Total people exited
 * - personnel_entry: Known personnel entries
 * - personnel_exit: Known personnel exits
 * - unknown_entry: Unknown people entries
 * - unknown_exit: Unknown people exits
 * - net_flow: Difference between entries and exits
 * - personnel_breakdown: Array of { personnel_id, entry_count, exit_count, total_count } for each known person
 * - unique_personnel_count: Number of unique known personnel detected
 */
router.post('/people-counting-summary', async (req: Request, res, next) => {
	try {
		const { entryKnownRes, entryUnknownRes, exitKnownRes, exitUnknownRes, getTotal, getAggs, cameraTypeMap } =
			await getPeopleCountingData(req);

		const personnelEntry = getTotal(entryKnownRes);
		const unknownEntry = getTotal(entryUnknownRes);
		const personnelExit = getTotal(exitKnownRes);
		const unknownExit = getTotal(exitUnknownRes);

		// Build person breakdown for known personnel with camera details
		const personStats = new Map<
			string,
			{
				entry_count: number;
				exit_count: number;
				cameras: Map<string, { entry_count: number; exit_count: number }>;
			}
		>();

		// Process entry known personnel by person
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(getAggs(entryKnownRes)?.by_person?.buckets ?? []).forEach((b: any) => {
			const personId = String(b.key);
			const existing = personStats.get(personId) || {
				entry_count: 0,
				exit_count: 0,
				cameras: new Map()
			};
			existing.entry_count += b.doc_count;

			// Process camera breakdown for this person
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(b.by_camera?.buckets ?? []).forEach((camBucket: any) => {
				const camId = String(camBucket.key);
				const camStats = existing.cameras.get(camId) || { entry_count: 0, exit_count: 0 };
				camStats.entry_count += camBucket.doc_count;
				existing.cameras.set(camId, camStats);
			});

			personStats.set(personId, existing);
		});

		// Process exit known personnel by person
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(getAggs(exitKnownRes)?.by_person?.buckets ?? []).forEach((b: any) => {
			const personId = String(b.key);
			const existing = personStats.get(personId) || {
				entry_count: 0,
				exit_count: 0,
				cameras: new Map()
			};
			existing.exit_count += b.doc_count;

			// Process camera breakdown for this person
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(b.by_camera?.buckets ?? []).forEach((camBucket: any) => {
				const camId = String(camBucket.key);
				const camStats = existing.cameras.get(camId) || { entry_count: 0, exit_count: 0 };
				camStats.exit_count += camBucket.doc_count;
				existing.cameras.set(camId, camStats);
			});

			personStats.set(personId, existing);
		});

		// Load personnel names for breakdown
		const personnelIds = Array.from(personStats.keys());
		const personnelDocs = await Personnel.find({ _id: { $in: personnelIds } })
			.exec()
			.then((docs) => new Map(docs.map((doc) => [doc._id.toString(), doc])));

		// Convert to array format including personnel name and camera breakdown
		const personnelBreakdown = Array.from(personStats.entries()).map(([personnel_id, stats]) => {
			const person = personnelDocs.get(personnel_id);
			return {
				personnel_id,
				personnel_name: person ? person.toName() : 'Unknown',
				entry_count: stats.entry_count,
				exit_count: stats.exit_count,
				total_count: stats.entry_count + stats.exit_count,
				cameras: Array.from(stats.cameras.entries()).map(([camId, camStats]) => {
					const camInfo = cameraTypeMap.get(camId);
					return {
						camera_id: camId,
						camera_name: camInfo?.name ?? 'Unknown',
						camera_type: camInfo?.type ?? 'unknown',
						entry_count: camStats.entry_count,
						exit_count: camStats.exit_count,
						total_count: camStats.entry_count + camStats.exit_count
					};
				})
			};
		});

		return res.status(200).json({
			success: true,
			data: {
				total_entry: personnelEntry + unknownEntry,
				total_exit: personnelExit + unknownExit,
				personnel_entry: personnelEntry,
				personnel_exit: personnelExit,
				unknown_entry: unknownEntry,
				unknown_exit: unknownExit,
				net_flow: personnelEntry + unknownEntry - (personnelExit + unknownExit),
				personnel_breakdown: personnelBreakdown,
				unique_personnel_count: personnelBreakdown.length
			}
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /people-counting-by-camera
 * Get people counting statistics per camera
 *
 * Returns array of:
 * - camera_id, camera_name, camera_type
 * - direction: 'entry' or 'exit'
 * - total_count, personnel_count, unknown_count
 */
router.post('/people-counting-by-camera', async (req: Request, res, next) => {
	try {
		const { entryKnownRes, entryUnknownRes, exitKnownRes, exitUnknownRes, getAggs, cameraTypeMap } =
			await getPeopleCountingData(req);

		// Build camera breakdown
		const cameraStats = new Map<
			string,
			{ personnel_count: number; unknown_count: number; type: 'entry' | 'exit' | 'unknown' }
		>();

		// Helper to get direction based on camera type from map
		const getDirection = (camId: string): 'entry' | 'exit' | 'unknown' => {
			const camInfo = cameraTypeMap.get(camId);
			if (camInfo?.type === 'enter') return 'entry';
			if (camInfo?.type === 'exit') return 'exit';
			return 'unknown';
		};

		// Process entry cameras (known personnel)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(getAggs(entryKnownRes)?.by_camera?.buckets ?? []).forEach((b: any) => {
			const existing = cameraStats.get(b.key) || {
				personnel_count: 0,
				unknown_count: 0,
				type: getDirection(b.key)
			};
			existing.personnel_count += b.doc_count;
			cameraStats.set(b.key, existing);
		});
		// Process entry cameras (unknown)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(getAggs(entryUnknownRes)?.by_camera?.buckets ?? []).forEach((b: any) => {
			const existing = cameraStats.get(b.key) || {
				personnel_count: 0,
				unknown_count: 0,
				type: getDirection(b.key)
			};
			existing.unknown_count += b.doc_count;
			cameraStats.set(b.key, existing);
		});

		// Process exit cameras (known personnel)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(getAggs(exitKnownRes)?.by_camera?.buckets ?? []).forEach((b: any) => {
			const existing = cameraStats.get(b.key) || {
				personnel_count: 0,
				unknown_count: 0,
				type: getDirection(b.key)
			};
			existing.personnel_count += b.doc_count;
			cameraStats.set(b.key, existing);
		});
		// Process exit cameras (unknown)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(getAggs(exitUnknownRes)?.by_camera?.buckets ?? []).forEach((b: any) => {
			const existing = cameraStats.get(b.key) || {
				personnel_count: 0,
				unknown_count: 0,
				type: getDirection(b.key)
			};
			existing.unknown_count += b.doc_count;
			cameraStats.set(b.key, existing);
		});

		// Format camera breakdown
		const data = Array.from(cameraStats.entries()).map(([camId, stats]) => {
			const camInfo = cameraTypeMap.get(camId);
			return {
				camera_id: camId,
				camera_name: camInfo?.name ?? 'Unknown',
				camera_type: camInfo?.type ?? 'unknown',
				direction: stats.type,
				total_count: stats.personnel_count + stats.unknown_count,
				personnel_count: stats.personnel_count,
				unknown_count: stats.unknown_count
			};
		});

		return res.status(200).json({
			success: true,
			data,
			total: data.length
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /people-counting-hourly
 * Get time-based breakdown of people counting statistics
 *
 * Request Parameters:
 * - interval: Time interval in hours (1, 2, 4, 12, or 24). Default: 1
 *
 * Returns array of:
 * - time: Formatted time string
 * - time_epoch: Epoch milliseconds
 * - personnel_entry, unknown_entry, personnel_exit, unknown_exit
 * - total_entry, total_exit
 * - cameras: Array of camera breakdowns for this time period
 */
router.post('/people-counting-hourly', async (req: Request, res, next) => {
	try {
		// Get interval from request (default 1 hour, allowed: 1, 2, 4, 12, 24)
		const requestedInterval = Number(req.body.interval) || 1;
		const allowedIntervals = [1, 2, 4, 12, 24];
		const intervalHours = allowedIntervals.includes(requestedInterval) ? requestedInterval : 1;

		const { entryKnownRes, entryUnknownRes, exitKnownRes, exitUnknownRes, getAggs, cameraTypeMap, timezone } =
			await getPeopleCountingData(req, intervalHours);

		// Build hourly breakdown with camera details
		// Key: hourKey, Value: { stats, cameras: Map<cameraId, cameraStats> }
		const hourlyStats = new Map<
			string,
			{
				personnel_entry: number;
				unknown_entry: number;
				personnel_exit: number;
				unknown_exit: number;
				cameras: Map<
					string,
					{ personnel_entry: number; unknown_entry: number; personnel_exit: number; unknown_exit: number }
				>;
			}
		>();

		const processHourlyBuckets = (
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			buckets: any[],
			field: 'personnel_entry' | 'unknown_entry' | 'personnel_exit' | 'unknown_exit'
		) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(buckets ?? []).forEach((b: any) => {
				const hourKey = String(b.key);
				const existing = hourlyStats.get(hourKey) || {
					personnel_entry: 0,
					unknown_entry: 0,
					personnel_exit: 0,
					unknown_exit: 0,
					cameras: new Map()
				};
				existing[field] += b.doc_count;

				// Process camera breakdown within this hour bucket
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(b.by_camera?.buckets ?? []).forEach((camBucket: any) => {
					const camId = String(camBucket.key);
					const camStats = existing.cameras.get(camId) || {
						personnel_entry: 0,
						unknown_entry: 0,
						personnel_exit: 0,
						unknown_exit: 0
					};
					(camStats as Record<string, number>)[field] += camBucket.doc_count;
					existing.cameras.set(camId, camStats);
				});

				hourlyStats.set(hourKey, existing);
			});
		};

		processHourlyBuckets(getAggs(entryKnownRes)?.by_hour?.buckets ?? [], 'personnel_entry');
		processHourlyBuckets(getAggs(entryUnknownRes)?.by_hour?.buckets ?? [], 'unknown_entry');
		processHourlyBuckets(getAggs(exitKnownRes)?.by_hour?.buckets ?? [], 'personnel_exit');
		processHourlyBuckets(getAggs(exitUnknownRes)?.by_hour?.buckets ?? [], 'unknown_exit');

		// Format time breakdown with camera details
		const data = Array.from(hourlyStats.entries())
			.sort((a, b) => Number(a[0]) - Number(b[0]))
			.map(([timeEpoch, stats]) => ({
				time: new Date(Number(timeEpoch)).toLocaleString('en-US', { timeZone: timezone }),
				time_epoch: Number(timeEpoch),
				personnel_entry: stats.personnel_entry,
				unknown_entry: stats.unknown_entry,
				personnel_exit: stats.personnel_exit,
				unknown_exit: stats.unknown_exit,
				total_entry: stats.personnel_entry + stats.unknown_entry,
				total_exit: stats.personnel_exit + stats.unknown_exit,
				cameras: Array.from(stats.cameras.entries()).map(([camId, camStats]) => {
					const camInfo = cameraTypeMap.get(camId);
					return {
						camera_id: camId,
						camera_name: camInfo?.name ?? 'Unknown',
						camera_type: camInfo?.type ?? 'unknown',
						personnel_entry: camStats.personnel_entry,
						unknown_entry: camStats.unknown_entry,
						personnel_exit: camStats.personnel_exit,
						unknown_exit: camStats.unknown_exit,
						total_entry: camStats.personnel_entry + camStats.unknown_entry,
						total_exit: camStats.personnel_exit + camStats.unknown_exit
					};
				})
			}));

		return res.status(200).json({
			success: true,
			data,
			total: data.length,
			interval_hours: intervalHours
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /unknown-face-counting
 * Get unknown face counting statistics from face_count index
 *
 * Returns:
 * - unique_faces: Number of unique unknown persons (by global_virtual_id)
 * - total_visits: Total face detections/visits in time range
 * - cameras: Array of per-camera breakdown with unique and total counts
 *
 * Request body (AnalyticsBody):
 * - date_start, date_end, time_start, time_end: Time range filters
 * - cameras: Optional array of camera IDs to filter
 * - timez: Timezone (default: Asia/Tehran)
 * - time_filter: Boolean to enable time-of-day filtering
 */
router.post('/unknown-face-counting', async (req: Request, res, next) => {
	try {
		const { date_start, date_end, time_start, time_end, cameras, timez } = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const faceCountIndex: string = process.env['FACE_COUNT_INDEX'] ?? 'face_count';

		// Build time range constraints
		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);

		// Build camera access filter
		const camera_filter = buildCameraFilter(req, cameras);

		// Build Elasticsearch query with aggregations
		const query = {
			index: faceCountIndex,
			size: 0,
			track_total_hits: true,
			query: {
				bool: {
					must: [...time_constraints, ...camera_filter]
				}
			},
			aggs: {
				unique_faces: {
					cardinality: {
						field: 'global_virtual_id'
					}
				},
				total_visits: {
					value_count: {
						field: 'timestamp'
					}
				},
				by_camera: {
					terms: {
						field: 'camera_id.keyword',
						size: 1000
					},
					aggs: {
						unique_faces: {
							cardinality: {
								field: 'global_virtual_id'
							}
						}
					}
				}
			}
		};

		// Execute query
		let esResponse;
		try {
			esResponse = await process.esclient.search(query);
		} catch (searchErr: unknown) {
			if (isIndexNotFoundError(searchErr)) {
				// Index doesn't exist yet, return zeros
				return res.status(200).json({
					success: true,
					data: {
						unique_faces: 0,
						total_visits: 0,
						cameras: []
					}
				});
			}
			throw searchErr;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const aggs = esResponse.aggregations as any;

		// Get camera names
		const cameraIds = (aggs?.by_camera?.buckets ?? []).map((b: any) => b.key);
		const cameraDocs = await Camera.find({ _id: { $in: cameraIds } })
			.exec()
			.then((docs) => new Map(docs.map((doc) => [doc._id.toString(), doc])));

		// Format per-camera breakdown
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const cameraBreakdown = (aggs?.by_camera?.buckets ?? []).map((bucket: any) => {
			const cameraId = String(bucket.key);
			const camera = cameraDocs.get(cameraId);
			return {
				camera_id: cameraId,
				camera_name: camera?.name ?? 'Unknown',
				unique_faces: bucket.unique_faces?.value ?? 0,
				total_visits: bucket.doc_count ?? 0
			};
		});

		return res.status(200).json({
			success: true,
			data: {
				unique_faces: aggs?.unique_faces?.value ?? 0,
				total_visits: aggs?.total_visits?.value ?? 0,
				cameras: cameraBreakdown
			}
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /unknown-faces-list
 * Get paginated list of unknown face records from face_count index
 */
router.post('/unknown-faces-list', async (req: Request, res, next) => {
	try {
		const { date_start, date_end, time_start, time_end, cameras, timez } = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const faceCountIndex: string = process.env['FACE_COUNT_INDEX'] ?? 'face_count';

		const page = Math.max(1, Number(req.body.page) || 1);
		const size = Math.min(1000, Number(req.body.limit) || 50);
		const from = (page - 1) * size;

		const allowedSortFields = new Set(['timestamp', 'visit_number', 'match_score']);
		const sortByRaw = typeof req.body.sort_by === 'string' ? req.body.sort_by : 'timestamp';
		const sortBy = allowedSortFields.has(sortByRaw) ? sortByRaw : 'timestamp';
		const sortDirection = req.body.sort_dir === 'asc' ? 'asc' : 'desc';

		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);
		const camera_filter = buildCameraFilter(req, cameras);

		const visitMin = Number(req.body.visit_number_min);
		const visitMax = Number(req.body.visit_number_max);
		const visitRange: Record<string, number> = {};
		if (!Number.isNaN(visitMin) && req.body.visit_number_min !== undefined) visitRange.gte = visitMin;
		if (!Number.isNaN(visitMax) && req.body.visit_number_max !== undefined) visitRange.lte = visitMax;

		const visitConstraint =
			Object.keys(visitRange).length > 0 ? [{ range: { visit_number: visitRange } }] : [];

		const query = {
			index: faceCountIndex,
			size,
			from,
			track_total_hits: true,
			query: {
				bool: {
					must: [...time_constraints, ...camera_filter, ...visitConstraint]
				}
			},
			sort: [{ [sortBy]: { order: sortDirection } }],
			_source: {
				excludes: ['vector'] // Exclude vector field to reduce response size
			}
		};

		let esResponse;
		try {
			esResponse = await process.esclient.search(query);
		} catch (searchErr: unknown) {
			if (isIndexNotFoundError(searchErr)) {
				return res.status(200).json({
					success: true,
					data: [],
					total: 0,
					page,
					size
				});
			}
			throw searchErr;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const hits = (esResponse.hits?.hits ?? []) as any[];
		const data = hits.map((hit) => ({
			_id: hit._id,
			...(hit._source ?? {})
		}));

		const cameraIds = Array.from(
			new Set(data.map((item) => String(item.camera_id)).filter((id) => id && id !== 'undefined'))
		);
		const cameraMap = await loadCameraMap(cameraIds);

		const enriched = data.map((item) => ({
			...item,
			camera_name: cameraMap.get(String(item.camera_id))?.name ?? 'Unknown'
		}));

		return res.status(200).json({
			success: true,
			data: enriched,
			total:
				esResponse.hits?.total &&
				typeof esResponse.hits.total === 'object' &&
				'value' in esResponse.hits.total
					? esResponse.hits.total.value
					: enriched.length,
			page,
			size
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /unknown-faces-hourly
 * Get hourly breakdown of unknown faces from face_count index
 */
router.post('/unknown-faces-hourly', async (req: Request, res, next) => {
	try {
		const requestedInterval = Number(req.body.interval) || 1;
		const allowedIntervals = [1, 2, 4, 12, 24];
		const intervalHours = allowedIntervals.includes(requestedInterval) ? requestedInterval : 1;
		const intervalMs = intervalHours * 3600000;

		const { date_start, date_end, time_start, time_end, cameras, timez } = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const faceCountIndex: string = process.env['FACE_COUNT_INDEX'] ?? 'face_count';

		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);
		const camera_filter = buildCameraFilter(req, cameras);

		const query = {
			index: faceCountIndex,
			size: 0,
			track_total_hits: true,
			query: {
				bool: {
					must: [...time_constraints, ...camera_filter]
				}
			},
			aggs: {
				by_hour: {
					histogram: {
						field: 'timestamp',
						interval: intervalMs
					},
					aggs: {
						unique_faces: { cardinality: { field: 'global_virtual_id' } },
						total_visits: { value_count: { field: 'timestamp' } },
						by_camera: {
							terms: { field: 'camera_id.keyword', size: 1000 },
							aggs: {
								unique_faces: { cardinality: { field: 'global_virtual_id' } },
								total_visits: { value_count: { field: 'timestamp' } }
							}
						}
					}
				}
			}
		};

		let esResponse;
		try {
			esResponse = await process.esclient.search(query);
		} catch (searchErr: unknown) {
			if (isIndexNotFoundError(searchErr)) {
				return res.status(200).json({
					success: true,
					data: [],
					total: 0,
					interval_hours: intervalHours
				});
			}
			throw searchErr;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const buckets = (esResponse.aggregations as any)?.by_hour?.buckets ?? [];
		const cameraIdSet = new Set<string>();
		buckets.forEach((bucket: any) => {
			(bucket.by_camera?.buckets ?? []).forEach((camBucket: any) => {
				cameraIdSet.add(String(camBucket.key));
			});
		});
		const cameraMap = await loadCameraMap(Array.from(cameraIdSet));

		const data = buckets.map((bucket: any) => ({
			time: new Date(Number(bucket.key)).toLocaleString('en-US', { timeZone: timezone }),
			time_epoch: Number(bucket.key),
			unique_faces: bucket.unique_faces?.value ?? 0,
			total_visits: bucket.total_visits?.value ?? bucket.doc_count ?? 0,
			cameras: (bucket.by_camera?.buckets ?? []).map((camBucket: any) => ({
				camera_id: String(camBucket.key),
				camera_name: cameraMap.get(String(camBucket.key))?.name ?? 'Unknown',
				unique_faces: camBucket.unique_faces?.value ?? 0,
				total_visits: camBucket.total_visits?.value ?? camBucket.doc_count ?? 0
			}))
		}));

		return res.status(200).json({
			success: true,
			data,
			total: data.length,
			interval_hours: intervalHours
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /unknown-faces-daily
 * Get daily trend of unknown faces from face_count index
 */
router.post('/unknown-faces-daily', async (req: Request, res, next) => {
	try {
		const { date_start, date_end, time_start, time_end, cameras, timez } = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const faceCountIndex: string = process.env['FACE_COUNT_INDEX'] ?? 'face_count';

		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);
		const camera_filter = buildCameraFilter(req, cameras);

		const query = {
			index: faceCountIndex,
			size: 0,
			track_total_hits: true,
			query: {
				bool: {
					must: [...time_constraints, ...camera_filter]
				}
			},
			aggs: {
				by_day: {
					date_histogram: {
						field: 'timestamp',
						calendar_interval: '1d',
						time_zone: timezone
					},
					aggs: {
						unique_faces: { cardinality: { field: 'global_virtual_id' } },
						total_visits: { value_count: { field: 'timestamp' } },
						by_camera: {
							terms: { field: 'camera_id.keyword', size: 1000 },
							aggs: {
								unique_faces: { cardinality: { field: 'global_virtual_id' } },
								total_visits: { value_count: { field: 'timestamp' } }
							}
						}
					}
				}
			}
		};

		let esResponse;
		try {
			esResponse = await process.esclient.search(query);
		} catch (searchErr: unknown) {
			if (isIndexNotFoundError(searchErr)) {
				return res.status(200).json({
					success: true,
					data: [],
					total: 0
				});
			}
			throw searchErr;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const buckets = (esResponse.aggregations as any)?.by_day?.buckets ?? [];
		const cameraIdSet = new Set<string>();
		buckets.forEach((bucket: any) => {
			(bucket.by_camera?.buckets ?? []).forEach((camBucket: any) => {
				cameraIdSet.add(String(camBucket.key));
			});
		});
		const cameraMap = await loadCameraMap(Array.from(cameraIdSet));

		const data = buckets.map((bucket: any) => ({
			date: new Date(Number(bucket.key)).toLocaleDateString('en-CA', { timeZone: timezone }),
			date_epoch: Number(bucket.key),
			unique_faces: bucket.unique_faces?.value ?? 0,
			total_visits: bucket.total_visits?.value ?? bucket.doc_count ?? 0,
			cameras: (bucket.by_camera?.buckets ?? []).map((camBucket: any) => ({
				camera_id: String(camBucket.key),
				camera_name: cameraMap.get(String(camBucket.key))?.name ?? 'Unknown',
				unique_faces: camBucket.unique_faces?.value ?? 0,
				total_visits: camBucket.total_visits?.value ?? camBucket.doc_count ?? 0
			}))
		}));

		return res.status(200).json({
			success: true,
			data,
			total: data.length
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /unknown-faces-by-camera
 * Compare unknown faces per camera
 */
router.post('/unknown-faces-by-camera', async (req: Request, res, next) => {
	try {
		const { date_start, date_end, time_start, time_end, cameras, timez } = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const faceCountIndex: string = process.env['FACE_COUNT_INDEX'] ?? 'face_count';
		const limit = Math.min(1000, Number(req.body.limit) || 1000);

		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);
		const camera_filter = buildCameraFilter(req, cameras);

		const query = {
			index: faceCountIndex,
			size: 0,
			track_total_hits: true,
			query: {
				bool: {
					must: [...time_constraints, ...camera_filter]
				}
			},
			aggs: {
				by_camera: {
					terms: { field: 'camera_id.keyword', size: limit },
					aggs: {
						unique_faces: { cardinality: { field: 'global_virtual_id' } },
						total_visits: { value_count: { field: 'timestamp' } }
					}
				}
			}
		};

		let esResponse;
		try {
			esResponse = await process.esclient.search(query);
		} catch (searchErr: unknown) {
			if (isIndexNotFoundError(searchErr)) {
				return res.status(200).json({
					success: true,
					data: [],
					total: 0
				});
			}
			throw searchErr;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const buckets = (esResponse.aggregations as any)?.by_camera?.buckets ?? [];
		const cameraMap = await loadCameraMap(buckets.map((bucket: any) => String(bucket.key)));

		const data = buckets.map((bucket: any) => {
			const uniqueFaces = bucket.unique_faces?.value ?? 0;
			const totalVisits = bucket.total_visits?.value ?? bucket.doc_count ?? 0;
			return {
				camera_id: String(bucket.key),
				camera_name: cameraMap.get(String(bucket.key))?.name ?? 'Unknown',
				unique_faces: uniqueFaces,
				total_visits: totalVisits,
				avg_visits_per_person: uniqueFaces > 0 ? Number((totalVisits / uniqueFaces).toFixed(2)) : 0
			};
		});

		return res.status(200).json({
			success: true,
			data,
			total: data.length
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /unknown-faces-visit-frequency
 * Histogram of visit counts per unknown person
 */
router.post('/unknown-faces-visit-frequency', async (req: Request, res, next) => {
	try {
		const { date_start, date_end, time_start, time_end, cameras: requestCameras, timez } = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const faceCountIndex: string = process.env['FACE_COUNT_INDEX'] ?? 'face_count';
		const includeCameras = Boolean(req.body.include_cameras);
		const personLimit = Math.min(10000, Number(req.body.person_limit) || 10000);

		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);
		const camera_filter = buildCameraFilter(req, requestCameras);

		const aggs: Record<string, unknown> = {
			by_person: {
				terms: {
					field: 'global_virtual_id',
					size: personLimit
				}
			}
		};

		if (includeCameras) {
			aggs.by_camera = {
				terms: { field: 'camera_id.keyword', size: 1000 },
				aggs: {
					by_person: {
						terms: {
							field: 'global_virtual_id',
							size: personLimit
						}
					}
				}
			};
		}

		const query = {
			index: faceCountIndex,
			size: 0,
			track_total_hits: true,
			query: {
				bool: {
					must: [...time_constraints, ...camera_filter]
				}
			},
			aggs
		};

		let esResponse;
		try {
			esResponse = await process.esclient.search(query);
		} catch (searchErr: unknown) {
			if (isIndexNotFoundError(searchErr)) {
				return res.status(200).json({
					success: true,
					data: { distribution: [], total_people: 0, cameras: [] }
				});
			}
			throw searchErr;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const baseAggs = esResponse.aggregations as any;
		const distributionMap = new Map<number, number>();
		(baseAggs?.by_person?.buckets ?? []).forEach((bucket: any) => {
			const visitCount = bucket.doc_count ?? 0;
			distributionMap.set(visitCount, (distributionMap.get(visitCount) ?? 0) + 1);
		});

		const distribution = Array.from(distributionMap.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([visits, people]) => ({ visits, people }));

		let cameras: Array<{
			camera_id: string;
			camera_name: string;
			distribution: Array<{ visits: number; people: number }>;
		}> = [];

		if (includeCameras) {
			const cameraBuckets = baseAggs?.by_camera?.buckets ?? [];
			const cameraMap = await loadCameraMap(cameraBuckets.map((b: any) => String(b.key)));

			cameras = cameraBuckets.map((bucket: any) => {
				const cameraDistribution = new Map<number, number>();
				(bucket.by_person?.buckets ?? []).forEach((personBucket: any) => {
					const visitCount = personBucket.doc_count ?? 0;
					cameraDistribution.set(visitCount, (cameraDistribution.get(visitCount) ?? 0) + 1);
				});
				return {
					camera_id: String(bucket.key),
					camera_name: cameraMap.get(String(bucket.key))?.name ?? 'Unknown',
					distribution: Array.from(cameraDistribution.entries())
						.sort((a, b) => a[0] - b[0])
						.map(([visits, people]) => ({ visits, people }))
				};
			});
		}

		return res.status(200).json({
			success: true,
			data: {
				distribution,
				total_people: (baseAggs?.by_person?.buckets ?? []).length,
				cameras
			}
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /unknown-faces-repeat-visitors
 * List repeat unknown visitors and their detections
 */
router.post('/unknown-faces-repeat-visitors', async (req: Request, res, next) => {
	try {
		const { date_start, date_end, time_start, time_end, cameras, timez } = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const faceCountIndex: string = process.env['FACE_COUNT_INDEX'] ?? 'face_count';
		const minVisits = Math.max(2, Number(req.body.min_visits) || 3);
		const limit = Math.min(1000, Number(req.body.limit) || 100);
		const maxRecords = Math.min(20000, Number(req.body.max_records) || 10000);

		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);
		const camera_filter = buildCameraFilter(req, cameras);

		const repeatQuery = {
			index: faceCountIndex,
			size: 0,
			track_total_hits: true,
			query: {
				bool: {
					must: [...time_constraints, ...camera_filter]
				}
			},
			aggs: {
				repeat_persons: {
					terms: {
						field: 'global_virtual_id',
						size: limit,
						min_doc_count: minVisits,
						order: { _count: 'desc' }
					}
				}
			}
		};

		let esResponse;
		try {
			esResponse = await process.esclient.search(repeatQuery);
		} catch (searchErr: unknown) {
			if (isIndexNotFoundError(searchErr)) {
				return res.status(200).json({
					success: true,
					data: [],
					total: 0
				});
			}
			throw searchErr;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const buckets = (esResponse.aggregations as any)?.repeat_persons?.buckets ?? [];
		const repeatIds = buckets.map((b: any) => String(b.key));

		if (repeatIds.length === 0) {
			return res.status(200).json({
				success: true,
				data: [],
				total: 0
			});
		}

		const detectionsQuery = {
			index: faceCountIndex,
			size: maxRecords,
			track_total_hits: true,
			query: {
				bool: {
					must: [
						...time_constraints,
						...camera_filter,
						{
							bool: {
								should: repeatIds.map((id: string) => ({ term: { global_virtual_id: id } })),
								minimum_should_match: 1
							}
						}
					]
				}
			},
			sort: [{ timestamp: { order: 'asc' } }]
		};

		const detectionsRes = await process.esclient.search(detectionsQuery);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const hits = (detectionsRes.hits?.hits ?? []) as any[];
		const detections = hits.map((hit) => ({
			_id: hit._id,
			...(hit._source ?? {})
		}));

		const cameraIds = Array.from(
			new Set(detections.map((item) => String(item.camera_id)).filter((id) => id && id !== 'undefined'))
		);
		const cameraMap = await loadCameraMap(cameraIds);

		const grouped = new Map<
			string,
			{
				global_virtual_id: string;
				total_visits: number;
				first_seen: string | undefined;
				last_seen: string | undefined;
				detections: Array<Record<string, unknown>>;
			}
		>();

		detections.forEach((item) => {
			const gvId = String(item.global_virtual_id);
			const existing = grouped.get(gvId) || {
				global_virtual_id: gvId,
				total_visits: 0,
				first_seen: undefined,
				last_seen: undefined,
				detections: []
			};
			existing.total_visits += 1;
			const ts = item.timestamp;
			if (!existing.first_seen || (ts && ts < existing.first_seen)) existing.first_seen = ts;
			if (!existing.last_seen || (ts && ts > existing.last_seen)) existing.last_seen = ts;
			existing.detections.push({
				...item,
				camera_name: cameraMap.get(String(item.camera_id))?.name ?? 'Unknown'
			});
			grouped.set(gvId, existing);
		});

		const data = Array.from(grouped.values());

		return res.status(200).json({
			success: true,
			data,
			total: data.length,
			truncated:
				detectionsRes.hits?.total &&
				typeof detectionsRes.hits.total === 'object' &&
				'value' in detectionsRes.hits.total
					? detectionsRes.hits.total.value > maxRecords
					: false
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * ===================================
 * FACE COUNTING ROUTES
 * ===================================
 */

/**
 * POST /face-count/unique-today
 * Get count of unique unknown faces detected today
 *
 * Returns:
 * - unique_faces: Number of unique unknown faces detected today
 * - total_visits: Total number of face detections/visits today
 * - cameras: Array of per-camera breakdown
 */
router.post('/face-count/unique-today', async (req: Request, res, next) => {
	try {
		const { cameras } = req.body;
		const faceCountIndex: string = process.env['FACE_COUNT_INDEX'] ?? 'face_count';

		// Get today's date range
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayStart = today.getTime();
		const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;

		const camera_filter = buildCameraFilter(req, cameras);

		const query = {
			index: faceCountIndex,
			size: 0,
			track_total_hits: true,
			query: {
				bool: {
					must: [{ range: { timestamp: { gte: todayStart, lte: todayEnd } } }, ...camera_filter]
				}
			},
			aggs: {
				unique_faces: {
					cardinality: {
						field: 'global_virtual_id'
					}
				},
				total_visits: {
					value_count: {
						field: 'timestamp'
					}
				},
				by_camera: {
					terms: {
						field: 'camera_id.keyword',
						size: 1000
					},
					aggs: {
						unique_faces: {
							cardinality: {
								field: 'global_virtual_id'
							}
						}
					}
				}
			}
		};

		let esResponse;
		try {
			esResponse = await process.esclient.search(query);
		} catch (searchErr: unknown) {
			if (isIndexNotFoundError(searchErr)) {
				return res.status(200).json({
					success: true,
					data: {
						unique_faces: 0,
						total_visits: 0,
						cameras: []
					}
				});
			}
			throw searchErr;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const aggs = esResponse.aggregations as any;

		// Get camera names
		const cameraIds = (aggs?.by_camera?.buckets ?? []).map((b: any) => b.key);
		const cameraMap = await loadCameraMap(cameraIds);

		// Format per-camera breakdown
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const cameraBreakdown = (aggs?.by_camera?.buckets ?? []).map((bucket: any) => {
			const cameraId = String(bucket.key);
			const camera = cameraMap.get(cameraId);
			return {
				camera_id: cameraId,
				camera_name: camera?.name ?? 'Unknown',
				unique_faces: bucket.unique_faces?.value ?? 0,
				total_visits: bucket.doc_count ?? 0
			};
		});

		return res.status(200).json({
			success: true,
			data: {
				unique_faces: aggs?.unique_faces?.value ?? 0,
				total_visits: aggs?.total_visits?.value ?? 0,
				cameras: cameraBreakdown
			}
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /face-count/person-visits
 * Get visit count for a specific unknown person (identified by global_virtual_id)
 *
 * Request body:
 * - global_virtual_id: Required - ID of the unknown person to count visits for
 * - date_start, date_end: Optional - Date range filter
 * - time_start, time_end: Optional - Time range filter
 * - cameras: Optional - Array of camera IDs to filter
 * - timez: Optional - Timezone (default: Asia/Tehran)
 *
 * Returns:
 * - global_virtual_id: The person's virtual ID
 * - visit_count: Total number of visits/detections
 * - first_seen: First detection timestamp
 * - last_seen: Last detection timestamp
 * - cameras: Array of per-camera visit counts
 */
router.post('/face-count/person-visits', async (req: Request, res, next) => {
	try {
		const { global_virtual_id, date_start, date_end, time_start, time_end, cameras, timez } = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const faceCountIndex: string = process.env['FACE_COUNT_INDEX'] ?? 'face_count';

		if (!global_virtual_id) {
			return res.status(400).json({
				success: false,
				message: 'global_virtual_id is required'
			});
		}

		// Build time range constraints
		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);
		const camera_filter = buildCameraFilter(req, cameras);

		const query = {
			index: faceCountIndex,
			size: 0,
			track_total_hits: true,
			query: {
				bool: {
					must: [
						...time_constraints,
						...camera_filter,
						{ term: { global_virtual_id: String(global_virtual_id) } }
					]
				}
			},
			aggs: {
				first_seen: { min: { field: 'timestamp' } },
				last_seen: { max: { field: 'timestamp' } },
				by_camera: {
					terms: {
						field: 'camera_id.keyword',
						size: 1000
					}
				}
			}
		};

		let esResponse;
		try {
			esResponse = await process.esclient.search(query);
		} catch (searchErr: unknown) {
			if (isIndexNotFoundError(searchErr)) {
				return res.status(200).json({
					success: true,
					data: {
						global_virtual_id: String(global_virtual_id),
						visit_count: 0,
						first_seen: null,
						last_seen: null,
						cameras: []
					}
				});
			}
			throw searchErr;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const aggs = esResponse.aggregations as any;
		const totalHits =
			esResponse.hits?.total && typeof esResponse.hits.total === 'object' && 'value' in esResponse.hits.total
				? esResponse.hits.total.value
				: 0;

		// Get camera names
		const cameraIds = (aggs?.by_camera?.buckets ?? []).map((b: any) => b.key);
		const cameraMap = await loadCameraMap(cameraIds);

		// Format per-camera breakdown
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const cameraBreakdown = (aggs?.by_camera?.buckets ?? []).map((bucket: any) => {
			const cameraId = String(bucket.key);
			const camera = cameraMap.get(cameraId);
			return {
				camera_id: cameraId,
				camera_name: camera?.name ?? 'Unknown',
				visit_count: bucket.doc_count ?? 0
			};
		});

		const firstSeen = aggs?.first_seen?.value
			? new Date(aggs.first_seen.value).toLocaleString('en-US', { timeZone: timezone })
			: null;
		const lastSeen = aggs?.last_seen?.value
			? new Date(aggs.last_seen.value).toLocaleString('en-US', { timeZone: timezone })
			: null;

		return res.status(200).json({
			success: true,
			data: {
				global_virtual_id: String(global_virtual_id),
				visit_count: totalHits,
				first_seen: firstSeen,
				last_seen: lastSeen,
				cameras: cameraBreakdown
			}
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /face-count/visits-by-global-virtual-id
 * Get all paginated visit records for a specific global_virtual_id
 *
 * Request body:
 * - global_virtual_id: Required - ID of the unknown person to get visits for
 * - date_start, date_end: Optional - Date range filter
 * - time_start, time_end: Optional - Time range filter
 * - cameras: Optional - Array of camera IDs to filter
 * - page: Optional - Page number (default: 1)
 * - limit: Optional - Results per page (default: 50, max: 1000)
 * - sort_by: Optional - Sort field: 'timestamp', 'visit_number', 'match_score' (default: 'timestamp')
 * - sort_dir: Optional - Sort direction: 'asc' or 'desc' (default: 'desc')
 * - timez: Optional - Timezone (default: Asia/Tehran)
 *
 * Returns:
 * - data: Array of all visit records for the given global_virtual_id
 * - total: Total number of records
 * - page: Current page number
 * - size: Results per page
 */
router.post('/face-count/visits-by-global-virtual-id', async (req: Request, res, next) => {
	try {
		const { global_virtual_id, date_start, date_end, time_start, time_end, cameras, timez } = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const faceCountIndex: string = process.env['FACE_COUNT_INDEX'] ?? 'face_count';

		if (!global_virtual_id) {
			return res.status(400).json({
				success: false,
				message: 'global_virtual_id is required'
			});
		}

		const page = Math.max(1, Number(req.body.page) || 1);
		const size = Math.min(1000, Number(req.body.limit) || 50);
		const from = (page - 1) * size;

		const allowedSortFields = new Set(['timestamp', 'visit_number', 'match_score']);
		const sortByRaw = typeof req.body.sort_by === 'string' ? req.body.sort_by : 'timestamp';
		const sortBy = allowedSortFields.has(sortByRaw) ? sortByRaw : 'timestamp';
		const sortDirection = req.body.sort_dir === 'asc' ? 'asc' : 'desc';

		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);
		const camera_filter = buildCameraFilter(req, cameras);

		// Build must clauses
		const mustClauses = [...time_constraints, { term: { global_virtual_id: String(global_virtual_id) } }];
		if (camera_filter && camera_filter.length > 0) {
			mustClauses.push(...camera_filter);
		}

		const visitMin = Number(req.body.visit_number_min);
		const visitMax = Number(req.body.visit_number_max);
		const visitRange: Record<string, number> = {};
		if (!Number.isNaN(visitMin) && req.body.visit_number_min !== undefined) visitRange.gte = visitMin;
		if (!Number.isNaN(visitMax) && req.body.visit_number_max !== undefined) visitRange.lte = visitMax;

		const visitConstraint =
			Object.keys(visitRange).length > 0 ? [{ range: { visit_number: visitRange } }] : [];

		if (visitConstraint.length > 0) {
			mustClauses.push(...visitConstraint);
		}

		const query = {
			index: faceCountIndex,
			size,
			from,
			track_total_hits: true,
			query: {
				bool: {
					must: mustClauses
				}
			},
			sort: [{ [sortBy]: { order: sortDirection } }]
		};

		let esResponse;
		try {
			esResponse = await process.esclient.search(query);
		} catch (searchErr: unknown) {
			if (isIndexNotFoundError(searchErr)) {
				return res.status(200).json({
					success: true,
					data: [],
					total: 0,
					page,
					size
				});
			}
			throw searchErr;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const hits = (esResponse.hits?.hits ?? []) as any[];
		const data = hits.map((hit) => ({
			_id: hit._id,
			...(hit._source ?? {})
		}));

		const cameraIds = Array.from(
			new Set(data.map((item) => String(item.camera_id)).filter((id) => id && id !== 'undefined'))
		);
		const cameraMap = await loadCameraMap(cameraIds);

		const enriched = data.map((item) => ({
			...item,
			camera_name: cameraMap.get(String(item.camera_id))?.name ?? 'Unknown'
		}));

		const total =
			esResponse.hits?.total && typeof esResponse.hits.total === 'object' && 'value' in esResponse.hits.total
				? esResponse.hits.total.value
				: enriched.length;

		return res.status(200).json({
			success: true,
			data: enriched,
			total,
			page,
			size,
			total_pages: Math.ceil(total / size)
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /face-count/list-unknown-faces
 * Get paginated list of unknown face records from face_count index
 * Can filter by global_virtual_id to see details of a specific person
 *
 * Request body:
 * - global_virtual_id: Optional - Filter by specific unknown person's virtual ID
 * - date_start, date_end: Optional - Date range filter
 * - time_start, time_end: Optional - Time range filter
 * - cameras: Optional - Array of camera IDs to filter
 * - page: Optional - Page number (default: 1)
 * - limit: Optional - Results per page (default: 50, max: 1000)
 * - sort_by: Optional - Sort field: 'timestamp', 'visit_number', 'match_score' (default: 'timestamp')
 * - sort_dir: Optional - Sort direction: 'asc' or 'desc' (default: 'desc')
 * - timez: Optional - Timezone (default: Asia/Tehran)
 *
 * Returns:
 * - data: Array of face detection records
 * - total: Total number of records
 * - page: Current page number
 * - size: Results per page
 */
router.post('/face-count/list-unknown-faces', async (req: Request, res, next) => {
	try {
		const { global_virtual_id, date_start, date_end, time_start, time_end, cameras, timez } = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const faceCountIndex: string = process.env['FACE_COUNT_INDEX'] ?? 'face_count';

		const page = Math.max(1, Number(req.body.page) || 1);
		const size = Math.min(1000, Number(req.body.limit) || 50);
		const from = (page - 1) * size;

		const allowedSortFields = new Set(['timestamp', 'visit_number', 'match_score']);
		const sortByRaw = typeof req.body.sort_by === 'string' ? req.body.sort_by : 'timestamp';
		const sortBy = allowedSortFields.has(sortByRaw) ? sortByRaw : 'timestamp';
		const sortDirection = req.body.sort_dir === 'asc' ? 'asc' : 'desc';

		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);
		const camera_filter = buildCameraFilter(req, cameras);

		// Build must clauses
		const mustClauses = [...time_constraints];
		if (camera_filter && camera_filter.length > 0) {
			mustClauses.push(...camera_filter);
		}

		// Add global_virtual_id filter if provided
		if (global_virtual_id) {
			mustClauses.push({ term: { global_virtual_id: String(global_virtual_id) } });
		}

		const visitMin = Number(req.body.visit_number_min);
		const visitMax = Number(req.body.visit_number_max);
		const visitRange: Record<string, number> = {};
		if (!Number.isNaN(visitMin) && req.body.visit_number_min !== undefined) visitRange.gte = visitMin;
		if (!Number.isNaN(visitMax) && req.body.visit_number_max !== undefined) visitRange.lte = visitMax;

		const visitConstraint =
			Object.keys(visitRange).length > 0 ? [{ range: { visit_number: visitRange } }] : [];

		if (visitConstraint.length > 0) {
			mustClauses.push(...visitConstraint);
		}

		// Use aggregations to group by global_virtual_id and get latest record for each group
		const query = {
			index: faceCountIndex,
			size: 0,
			track_total_hits: true,
			query: {
				bool: {
					must: mustClauses
				}
			},
			aggs: {
				by_global_virtual_id: {
					terms: {
						field: 'global_virtual_id',
						size: 10000, // Get all unique global_virtual_ids
						order: { _key: 'asc' }
					},
					aggs: {
						latest_record: {
							top_hits: {
								size: 1,
								sort: [{ visit_number: { order: 'desc' } }, { timestamp: { order: 'desc' } }]
							}
						}
					}
				}
			}
		};

		let esResponse;
		try {
			esResponse = await process.esclient.search(query);
		} catch (searchErr: unknown) {
			if (isIndexNotFoundError(searchErr)) {
				return res.status(200).json({
					success: true,
					data: [],
					total: 0,
					page,
					size
				});
			}
			throw searchErr;
		}

		// Extract data from aggregations
		const aggs = esResponse.aggregations as any;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const buckets = (aggs?.by_global_virtual_id?.buckets ?? []) as any[];

		// Extract the latest record from each bucket
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const allData: any[] = [];
		for (const bucket of buckets) {
			const latestHits = bucket.latest_record?.hits?.hits ?? [];
			if (latestHits.length > 0) {
				const hit = latestHits[0];
				allData.push({
					_id: hit._id,
					...(hit._source ?? {})
				});
			}
		}

		// Apply sorting to the grouped results
		allData.sort((a, b) => {
			const aVal = a[sortBy];
			const bVal = b[sortBy];
			if (aVal === undefined || aVal === null) return 1;
			if (bVal === undefined || bVal === null) return -1;
			if (sortDirection === 'asc') {
				return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
			} else {
				return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
			}
		});

		// Apply pagination
		const total = allData.length;
		const paginatedData = allData.slice(from, from + size);

		const cameraIds = Array.from(
			new Set(paginatedData.map((item) => String(item.camera_id)).filter((id) => id && id !== 'undefined'))
		);
		const cameraMap = await loadCameraMap(cameraIds);

		const enriched = paginatedData.map((item) => ({
			...item,
			camera_name: cameraMap.get(String(item.camera_id))?.name ?? 'Unknown'
		}));

		return res.status(200).json({
			success: true,
			data: enriched,
			total,
			page,
			size,
			total_pages: Math.ceil(total / size)
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /face-count/realtime-per-camera
 * Get real-time unknown face count per camera (last 1 hour)
 *
 * Returns:
 * - cameras: Array of camera breakdowns with:
 *   - camera_id, camera_name
 *   - unique_faces: Number of unique unknown faces in last hour
 *   - total_visits: Total visits/detections in last hour
 *   - last_detection: Timestamp of most recent detection
 */
router.post('/face-count/realtime-per-camera', async (req: Request, res, next) => {
	try {
		const { cameras, timez } = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const faceCountIndex: string = process.env['FACE_COUNT_INDEX'] ?? 'face_count';

		// Last 1 hour
		const now = Date.now();
		const oneHourAgo = now - 60 * 60 * 1000;

		const camera_filter = buildCameraFilter(req, cameras);

		// Build must clauses - ensure camera_filter is not empty or causing issues
		const mustClauses = [{ range: { timestamp: { gte: oneHourAgo, lte: now } } }];
		if (camera_filter && camera_filter.length > 0) {
			mustClauses.push(...camera_filter);
		}

		const query = {
			index: faceCountIndex,
			size: 0,
			track_total_hits: true,
			query: {
				bool: {
					must: mustClauses
				}
			},
			aggs: {
				by_camera: {
					terms: {
						field: 'camera_id.keyword',
						size: 1000
					},
					aggs: {
						unique_faces: {
							cardinality: {
								field: 'global_virtual_id'
							}
						},
						last_detection: {
							max: {
								field: 'timestamp'
							}
						}
					}
				}
			}
		};

		let esResponse;
		try {
			esResponse = await process.esclient.search(query);
		} catch (searchErr: unknown) {
			if (isIndexNotFoundError(searchErr)) {
				return res.status(200).json({
					success: true,
					data: {
						cameras: [],
						time_range: {
							start: new Date(oneHourAgo).toLocaleString('en-US', { timeZone: timezone }),
							end: new Date(now).toLocaleString('en-US', { timeZone: timezone })
						}
					}
				});
			}
			throw searchErr;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const aggs = esResponse.aggregations as any;

		if (!aggs?.by_camera?.buckets || aggs.by_camera.buckets.length === 0) {
			return res.status(200).json({
				success: true,
				data: {
					cameras: [],
					time_range: {
						start: new Date(oneHourAgo).toLocaleString('en-US', { timeZone: timezone }),
						end: new Date(now).toLocaleString('en-US', { timeZone: timezone })
					}
				}
			});
		}

		// Get camera names
		const cameraIds = (aggs.by_camera.buckets ?? []).map((b: any) => b.key);
		const cameraMap = await loadCameraMap(cameraIds);

		// Format camera breakdown
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const cameraBreakdown = (aggs.by_camera.buckets ?? []).map((bucket: any) => {
			const cameraId = String(bucket.key);
			const camera = cameraMap.get(cameraId);
			const lastDetection = bucket.last_detection?.value
				? new Date(bucket.last_detection.value).toLocaleString('en-US', { timeZone: timezone })
				: null;

			return {
				camera_id: cameraId,
				camera_name: camera?.name ?? 'Unknown',
				unique_faces: bucket.unique_faces?.value ?? 0,
				total_visits: bucket.doc_count ?? 0,
				last_detection: lastDetection
			};
		});

		return res.status(200).json({
			success: true,
			data: {
				cameras: cameraBreakdown,
				time_range: {
					start: new Date(oneHourAgo).toLocaleString('en-US', { timeZone: timezone }),
					end: new Date(now).toLocaleString('en-US', { timeZone: timezone })
				}
			}
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * ===================================
 * HUMAN COUNT ANALYTICS ENDPOINTS
 * ===================================
 */

/**
 * POST /human-count/realtime-occupancy
 * Get real-time occupancy data from human_count index
 *
 * Returns:
 * - current_occupancy: Net count over last 2 hours
 * - entries_last_hour: Entries in last hour
 * - exits_last_hour: Exits in last hour
 * - net_last_hour: Net change in last hour
 */
router.post('/human-count/realtime-occupancy', async (req: Request, res, next) => {
	try {
		const { cameras, line_ids } = req.body;
		const humanCountIndex = process.env['HUMAN_COUNT_INDEX'] ?? 'human_count';

		const camera_filter = buildCameraFilter(req, cameras);
		const line_filter =
			line_ids && line_ids.length > 0
				? [
						{
							bool: {
								should: line_ids.map((id: string) => ({ term: { 'line_id.keyword': id } })),
								minimum_should_match: 1
							}
						}
					]
				: [];

		const data = await getHumanCountRealTimeOccupancy(humanCountIndex, camera_filter, line_filter);

		return res.status(200).json({
			success: true,
			data
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /human-count/hourly-traffic
 * Get hourly traffic summary (last 24 hours)
 *
 * Returns array of hourly buckets with:
 * - time: Formatted time string
 * - time_epoch: Epoch milliseconds
 * - entries: Entry count
 * - exits: Exit count
 * - net: Net change (entries - exits)
 */
router.post('/human-count/hourly-traffic', async (req: Request, res, next) => {
	try {
		const { date_start, date_end, time_start, time_end, cameras, line_ids, timez } = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const humanCountIndex = process.env['HUMAN_COUNT_INDEX'] ?? 'human_count';

		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);
		const camera_filter = buildCameraFilter(req, cameras);
		const line_filter =
			line_ids && line_ids.length > 0
				? [
						{
							bool: {
								should: line_ids.map((id: string) => ({ term: { 'line_id.keyword': id } })),
								minimum_should_match: 1
							}
						}
					]
				: [];

		const base_must = [...time_constraints, ...camera_filter, ...line_filter];
		const data = await getHumanCountHourlyTraffic(humanCountIndex, base_must, timezone);

		return res.status(200).json({
			success: true,
			data,
			total: data.length
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /human-count/camera-comparison
 * Get daily camera comparison (last 7 days)
 *
 * Returns:
 * - cameras: Array of camera breakdowns with daily traffic
 * Each camera includes:
 *   - camera_id, camera_name
 *   - total_entries, total_exits, total_count
 *   - week_trend_pct: Week-over-week trend percentage
 *   - daily_breakdown: Array of daily data
 */
router.post('/human-count/camera-comparison', async (req: Request, res, next) => {
	try {
		const { date_start, date_end, time_start, time_end, cameras, line_ids, timez } = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const humanCountIndex = process.env['HUMAN_COUNT_INDEX'] ?? 'human_count';

		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);
		const camera_filter = buildCameraFilter(req, cameras);
		const line_filter =
			line_ids && line_ids.length > 0
				? [
						{
							bool: {
								should: line_ids.map((id: string) => ({ term: { 'line_id.keyword': id } })),
								minimum_should_match: 1
							}
						}
					]
				: [];

		const base_must = [...time_constraints, ...camera_filter, ...line_filter];
		const data = await getHumanCountDailyCameraComparison(humanCountIndex, base_must, timezone);

		return res.status(200).json({
			success: true,
			data
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /human-count/peak-hours
 * Get peak hours analysis
 *
 * Returns:
 * - busiest_hours: Top 10 busiest hours with traffic counts
 * - avg_by_hour: Traffic by hour (0-23) sorted
 * - average_per_hour: Overall average traffic per hour
 */
router.post('/human-count/peak-hours', async (req: Request, res, next) => {
	try {
		const { date_start, date_end, time_start, time_end, cameras, line_ids, timez } = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const humanCountIndex = process.env['HUMAN_COUNT_INDEX'] ?? 'human_count';

		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);
		const camera_filter = buildCameraFilter(req, cameras);
		const line_filter =
			line_ids && line_ids.length > 0
				? [
						{
							bool: {
								should: line_ids.map((id: string) => ({ term: { 'line_id.keyword': id } })),
								minimum_should_match: 1
							}
						}
					]
				: [];

		const base_must = [...time_constraints, ...camera_filter, ...line_filter];
		const data = await getHumanCountPeakHours(humanCountIndex, base_must, timezone);

		return res.status(200).json({
			success: true,
			data
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * POST /human-count/time-comparisons
 * Get time range comparisons
 *
 * Compares current period with:
 * - Previous period (same duration before)
 * - Previous year (optional, if compare_basis = 'year')
 *
 * Returns:
 * - this_period: Current period stats
 * - previous_period: Previous period stats
 * - change_pct: Percentage change
 * - yoy_change_pct: Year-over-year change (if applicable)
 */
router.post('/human-count/time-comparisons', async (req: Request, res, next) => {
	try {
		const {
			date_start,
			date_end,
			time_start,
			time_end,
			cameras,
			line_ids,
			timez,
			compare_basis = 'week'
		} = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';
		const humanCountIndex = process.env['HUMAN_COUNT_INDEX'] ?? 'human_count';

		const camera_filter = buildCameraFilter(req, cameras);
		const line_filter =
			line_ids && line_ids.length > 0
				? [
						{
							bool: {
								should: line_ids.map((id: string) => ({ term: { 'line_id.keyword': id } })),
								minimum_should_match: 1
							}
						}
					]
				: [];

		const data = await getHumanCountTimeComparisons(
			humanCountIndex,
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			compare_basis,
			camera_filter,
			line_filter
		);

		return res.status(200).json({
			success: true,
			data
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * Helper: Get real-time occupancy (last 2 hours)
 */
async function getHumanCountRealTimeOccupancy(
	index: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	camera_filter: any[],
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	line_filter: any[]
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	const now = Date.now();
	const twoHoursAgo = now - 2 * 3600000;
	const oneHourAgo = now - 3600000;

	const query = {
		index,
		size: 0,
		query: {
			bool: {
				must: [{ range: { timestamp: { gte: twoHoursAgo } } }, ...camera_filter, ...line_filter]
			}
		},
		aggs: {
			all_entries: {
				filter: { term: { 'event_type.keyword': 'entry' } },
				aggs: { count: { value_count: { field: 'event_type.keyword' } } }
			},
			all_exits: {
				filter: { term: { 'event_type.keyword': 'exit' } },
				aggs: { count: { value_count: { field: 'event_type.keyword' } } }
			},
			last_hour: {
				filter: { range: { timestamp: { gte: oneHourAgo } } },
				aggs: {
					entries: {
						filter: { term: { 'event_type.keyword': 'entry' } },
						aggs: { count: { value_count: { field: 'event_type.keyword' } } }
					},
					exits: {
						filter: { term: { 'event_type.keyword': 'exit' } },
						aggs: { count: { value_count: { field: 'event_type.keyword' } } }
					}
				}
			}
		}
	};

	try {
		const esRes = await process.esclient.search(query);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const aggs = esRes.aggregations as any;

		const allEntries = aggs?.all_entries?.count?.value ?? 0;
		const allExits = aggs?.all_exits?.count?.value ?? 0;
		const lastHourEntries = aggs?.last_hour?.entries?.count?.value ?? 0;
		const lastHourExits = aggs?.last_hour?.exits?.count?.value ?? 0;

		return {
			current_occupancy: allEntries - allExits,
			entries_last_hour: lastHourEntries,
			exits_last_hour: lastHourExits,
			net_last_hour: lastHourEntries - lastHourExits
		};
	} catch (err: unknown) {
		if (isIndexNotFoundError(err)) {
			return { current_occupancy: 0, entries_last_hour: 0, exits_last_hour: 0, net_last_hour: 0 };
		}
		throw err;
	}
}

/**
 * Helper: Get hourly traffic summary (last 24 hours)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getHumanCountHourlyTraffic(index: string, base_must: any[], timezone: string): Promise<any[]> {
	const now = Date.now();
	const twentyFourHoursAgo = now - 24 * 3600000;

	const query = {
		index,
		size: 0,
		query: {
			bool: {
				must: [...base_must, { range: { timestamp: { gte: twentyFourHoursAgo } } }]
			}
		},
		aggs: {
			by_hour: {
				date_histogram: {
					field: 'timestamp',
					fixed_interval: '1h',
					time_zone: timezone,
					min_doc_count: 0,
					extended_bounds: {
						min: twentyFourHoursAgo,
						max: now
					}
				},
				aggs: {
					entries: {
						filter: { term: { 'event_type.keyword': 'entry' } }
					},
					exits: {
						filter: { term: { 'event_type.keyword': 'exit' } }
					}
				}
			}
		}
	};

	try {
		const esRes = await process.esclient.search(query);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const aggs = esRes.aggregations as any;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (aggs?.by_hour?.buckets ?? []).map((bucket: any) => ({
			time: new Date(bucket.key).toLocaleString('en-US', { timeZone: timezone }),
			time_epoch: bucket.key,
			entries: bucket.entries?.doc_count ?? 0,
			exits: bucket.exits?.doc_count ?? 0,
			net: (bucket.entries?.doc_count ?? 0) - (bucket.exits?.doc_count ?? 0)
		}));
	} catch (err: unknown) {
		if (isIndexNotFoundError(err)) {
			return [];
		}
		throw err;
	}
}

/**
 * Helper: Get daily camera comparison (last 7 days)
 */
async function getHumanCountDailyCameraComparison(
	index: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	base_must: any[],
	timezone: string
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	const now = Date.now();
	const sevenDaysAgo = now - 7 * 24 * 3600000;

	const query = {
		index,
		size: 0,
		query: {
			bool: {
				must: [...base_must, { range: { timestamp: { gte: sevenDaysAgo } } }]
			}
		},
		aggs: {
			by_camera: {
				terms: {
					field: 'camera_id.keyword',
					size: 50
				},
				aggs: {
					by_day: {
						date_histogram: {
							field: 'timestamp',
							fixed_interval: '1d',
							time_zone: timezone,
							min_doc_count: 0
						},
						aggs: {
							entries: {
								filter: { term: { 'event_type.keyword': 'entry' } }
							},
							exits: {
								filter: { term: { 'event_type.keyword': 'exit' } }
							}
						}
					},
					total_entries: {
						filter: { term: { 'event_type.keyword': 'entry' } }
					},
					total_exits: {
						filter: { term: { 'event_type.keyword': 'exit' } }
					}
				}
			}
		}
	};

	try {
		const esRes = await process.esclient.search(query);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const aggs = esRes.aggregations as any;

		// Fetch camera names
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const cameraIds = (aggs?.by_camera?.buckets ?? []).map((b: any) => b.key);
		const cameraMap = new Map<string, string>();
		if (cameraIds.length > 0) {
			const cameraDocs = await Camera.find({ _id: { $in: cameraIds } }).exec();
			cameraDocs.forEach((cam) => cameraMap.set(cam._id.toString(), cam.name));
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const cameras = (aggs?.by_camera?.buckets ?? []).map((bucket: any) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const dailyData = (bucket.by_day?.buckets ?? []).map((dayBucket: any) => ({
				date: new Date(dayBucket.key).toLocaleDateString('en-US', { timeZone: timezone }),
				date_epoch: dayBucket.key,
				entries: dayBucket.entries?.doc_count ?? 0,
				exits: dayBucket.exits?.doc_count ?? 0,
				net: (dayBucket.entries?.doc_count ?? 0) - (dayBucket.exits?.doc_count ?? 0)
			}));

			// Week-over-week trend: compare first 3 days vs last 3 days
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const firstThree = dailyData.slice(0, 3).reduce((sum: any, d: any) => sum + d.entries + d.exits, 0);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const lastThree = dailyData.slice(-3).reduce((sum: any, d: any) => sum + d.entries + d.exits, 0);
			const trend = firstThree > 0 ? ((lastThree - firstThree) / firstThree) * 100 : 0;

			return {
				camera_id: bucket.key,
				camera_name: cameraMap.get(bucket.key) ?? 'Unknown',
				total_entries: bucket.total_entries?.doc_count ?? 0,
				total_exits: bucket.total_exits?.doc_count ?? 0,
				total_count: (bucket.total_entries?.doc_count ?? 0) + (bucket.total_exits?.doc_count ?? 0),
				week_trend_pct: Math.round(trend * 100) / 100,
				daily_breakdown: dailyData
			};
		});

		return { cameras };
	} catch (err: unknown) {
		if (isIndexNotFoundError(err)) {
			return { cameras: [] };
		}
		throw err;
	}
}

/**
 * Helper: Get peak hours analysis
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getHumanCountPeakHours(index: string, base_must: any[], timezone: string): Promise<any> {
	const query = {
		index,
		size: 0,
		query: {
			bool: {
				must: base_must
			}
		},
		aggs: {
			by_hour_of_day: {
				terms: {
					script: {
						source:
							"ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc['timestamp'].value), ZoneId.of(params.tz)).getHour()",
						params: { tz: timezone }
					},
					size: 24,
					order: { _count: 'desc' }
				},
				aggs: {
					entries: {
						filter: { term: { 'event_type.keyword': 'entry' } }
					},
					exits: {
						filter: { term: { 'event_type.keyword': 'exit' } }
					}
				}
			}
		}
	};

	try {
		const esRes = await process.esclient.search(query);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const aggs = esRes.aggregations as any;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const hourlyData = (aggs?.by_hour_of_day?.buckets ?? []).map((bucket: any) => ({
			hour: bucket.key,
			total_count: bucket.doc_count,
			entries: bucket.entries?.doc_count ?? 0,
			exits: bucket.exits?.doc_count ?? 0,
			net: (bucket.entries?.doc_count ?? 0) - (bucket.exits?.doc_count ?? 0)
		}));

		// Sort by hour for average display
		const sortedByHour = [...hourlyData].sort((a, b) => a.hour - b.hour);

		// Calculate average per hour
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const totalEvents = hourlyData.reduce((sum: any, h: any) => sum + h.total_count, 0);
		const avgPerHour = hourlyData.length > 0 ? Math.round(totalEvents / 24) : 0;

		return {
			busiest_hours: hourlyData.slice(0, 10), // Top 10 busiest
			avg_by_hour: sortedByHour,
			average_per_hour: avgPerHour
		};
	} catch (err: unknown) {
		if (isIndexNotFoundError(err)) {
			return { busiest_hours: [], avg_by_hour: [], average_per_hour: 0 };
		}
		throw err;
	}
}

/**
 * Helper: Get time range comparisons
 */
async function getHumanCountTimeComparisons(
	index: string,
	date_start: string | undefined,
	date_end: string | undefined,
	time_start: string | undefined,
	time_end: string | undefined,
	timezone: string,
	compare_basis: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	camera_filter: any[],
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	line_filter: any[]
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	if (!date_start || !date_end) {
		return null;
	}

	// Calculate time ranges
	const currentRange = Time.getSingleTimeRange(
		date_start,
		date_end,
		time_start ?? '00:00',
		time_end ?? '23:59',
		timezone
	);

	const duration = Number(currentRange.lte) - Number(currentRange.gte);

	// Calculate previous period
	const prevEnd = Number(currentRange.gte) - 1;
	const prevStart = prevEnd - duration;

	// Calculate year-over-year if requested
	let yoyStart = 0;
	let yoyEnd = 0;
	if (compare_basis === 'year') {
		yoyStart = Number(currentRange.gte) - 365 * 24 * 3600000;
		yoyEnd = Number(currentRange.lte) - 365 * 24 * 3600000;
	}

	const query = {
		index,
		size: 0,
		query: {
			bool: {
				must: [...camera_filter, ...line_filter]
			}
		},
		aggs: {
			this_period: {
				filter: { range: { timestamp: { gte: currentRange.gte, lte: currentRange.lte } } },
				aggs: {
					entries: { filter: { term: { 'event_type.keyword': 'entry' } } },
					exits: { filter: { term: { 'event_type.keyword': 'exit' } } }
				}
			},
			previous_period: {
				filter: { range: { timestamp: { gte: prevStart, lte: prevEnd } } },
				aggs: {
					entries: { filter: { term: { 'event_type.keyword': 'entry' } } },
					exits: { filter: { term: { 'event_type.keyword': 'exit' } } }
				}
			},
			...(compare_basis === 'year'
				? {
						previous_year: {
							filter: { range: { timestamp: { gte: yoyStart, lte: yoyEnd } } },
							aggs: {
								entries: { filter: { term: { 'event_type.keyword': 'entry' } } },
								exits: { filter: { term: { 'event_type.keyword': 'exit' } } }
							}
						}
					}
				: {})
		}
	};

	try {
		const esRes = await process.esclient.search(query);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const aggs = esRes.aggregations as any;

		const thisEntries = aggs?.this_period?.entries?.doc_count ?? 0;
		const thisExits = aggs?.this_period?.exits?.doc_count ?? 0;
		const prevEntries = aggs?.previous_period?.entries?.doc_count ?? 0;
		const prevExits = aggs?.previous_period?.exits?.doc_count ?? 0;

		const thisTotal = thisEntries + thisExits;
		const prevTotal = prevEntries + prevExits;
		const changePct = prevTotal > 0 ? ((thisTotal - prevTotal) / prevTotal) * 100 : 0;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result: any = {
			this_period: {
				entries: thisEntries,
				exits: thisExits,
				total: thisTotal,
				net: thisEntries - thisExits
			},
			previous_period: {
				entries: prevEntries,
				exits: prevExits,
				total: prevTotal,
				net: prevEntries - prevExits
			},
			change_pct: Math.round(changePct * 100) / 100,
			compare_basis
		};

		if (compare_basis === 'year' && aggs?.previous_year) {
			const yoyEntries = aggs.previous_year.entries?.doc_count ?? 0;
			const yoyExits = aggs.previous_year.exits?.doc_count ?? 0;
			const yoyTotal = yoyEntries + yoyExits;
			const yoyChangePct = yoyTotal > 0 ? ((thisTotal - yoyTotal) / yoyTotal) * 100 : 0;

			result.previous_year = {
				entries: yoyEntries,
				exits: yoyExits,
				total: yoyTotal,
				net: yoyEntries - yoyExits
			};
			result.yoy_change_pct = Math.round(yoyChangePct * 100) / 100;
		}

		return result;
	} catch (err: unknown) {
		if (isIndexNotFoundError(err)) {
			return null;
		}
		throw err;
	}
}

/**
 * POST /color-statistics
 * Get vehicle color statistics within a time range
 *
 * Returns distribution of detected vehicle colors
 */
router.post('/color-statistics', async (req: Request, res, next) => {
	try {
		const { date_start, date_end, time_start, time_end, cameras, limit = 20, timez } = req.body;
		const timezone = timez && timez.trim() !== '' ? timez : 'Asia/Tehran';

		// Build time range constraints
		const time_constraints = buildTimeConstraints(
			date_start,
			date_end,
			time_start,
			time_end,
			timezone,
			req.body.time_filter
		);

		// Build camera access filter
		const camera_filter = buildCameraFilter(req, cameras);

		// Elasticsearch aggregation query
		const query = {
			index: process.env['PLATE_INDEX'] ?? 'plate_log',
			size: 0,
			query: {
				bool: {
					must: [...time_constraints, ...camera_filter, { exists: { field: 'color' } }]
				}
			},
			aggs: {
				colors: {
					terms: {
						field: 'color.keyword',
						size: limit,
						order: { _count: 'desc' }
					}
				}
			}
		};

		let esRes;
		try {
			esRes = await process.esclient.search(query);
		} catch (err: unknown) {
			const error = err as { meta?: { body?: { error?: { type?: string } } }; message?: string };
			if (error.meta?.body?.error?.type === 'index_not_found_exception') {
				return res.status(200).json({
					success: true,
					data: [],
					total: 0,
					message: `Index ${query.index} not found. No data available.`
				});
			}
			throw err;
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const aggregations = esRes.aggregations as any;

		if (!aggregations?.colors?.buckets) {
			return res.status(200).json({
				success: true,
				data: [],
				total: 0
			});
		}

		// Enrich with color names
		const data = await Promise.all(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(aggregations.colors?.buckets ?? []).map(async (bucket: any) => {
				let color = undefined;
				if (isValidObjectId(bucket.key)) {
					color = await CarColor.findById(bucket.key).exec();
				}

				return {
					color_id: bucket.key,
					color_name: color?.name ?? 'Unknown',
					fa_color_name: color?.fa_name ?? 'نامشخص',
					count: bucket.doc_count
				};
			})
		);

		return res.status(200).json({
			success: true,
			data,
			total: data.length
		});
	} catch (err) {
		return next(
			new ApiError(500, 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error'))
		);
	}
});

/**
 * ===================================
 * HELPER FUNCTIONS
 * ===================================
 */

/**
 * Build time range constraints for Elasticsearch query
 */
function buildTimeConstraints(
	date_start: string | undefined,
	date_end: string | undefined,
	time_start: string | undefined,
	time_end: string | undefined,
	timezone: string,
	time_filter: boolean = true
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
	const time_constraints = [];

	if (date_start && date_end) {
		if (time_filter) {
			// Single time range
			const time_range = Time.getSingleTimeRange(
				date_start,
				date_end,
				time_start ?? '00:00',
				time_end ?? '23:59',
				timezone
			);
			time_constraints.push({
				range: { timestamp: { gte: time_range.gte, lte: time_range.lte } }
			});
		} else {
			// Multiple daily time ranges
			const times_epoch = Time.getEpochList(
				date_start,
				date_end,
				(time_start ?? '00:00') as Clock,
				(time_end ?? '23:59') as Clock,
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

	return time_constraints;
}

/**
 * Build camera access filter based on user role and permissions
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCameraFilter(req: Request, cameras?: string[]): any[] {
	const cameraAccess = Array.isArray(req.user.camera_access) ? req.user.camera_access : [];
	const userCameras = cameraAccess.length ? cameraAccess.map((el) => el.toString()) : ["who's daddy"]; // Impossible value to return no results if no access

	// Filter requested cameras to only those user has access to
	const allowedSearchedCameras = cameras
		? cameras.filter((cam: string) => userCameras.includes(cam)).concat(["who's daddy"])
		: ["who's daddy"];

	// Final camera list depends on user role and whether cameras were specified
	const finalCameras =
		req.user.role === 'admin'
			? (cameras ?? []) // Admin can use requested cameras directly
			: cameras?.length
				? allowedSearchedCameras // Non-admin gets filtered list
				: userCameras; // Default to user's access list

	if (!finalCameras || finalCameras.length === 0) {
		return [];
	}

	return [
		{
			bool: {
				should: finalCameras.map((cameraId) => ({
					match: { camera_id: cameraId }
				})),
				minimum_should_match: 1
			}
		}
	];
}

/**
 * Get Elasticsearch indices for analytics query
 * Supports: plate, face, and all
 */
function getIndicesForType(type: string): Array<{ index: string; type: string }> {
	const supportedIndices = [
		{ index: process.env['PLATE_INDEX'] ?? 'plate_log', type: 'plate' },
		{ index: process.env['FACE_INDEX'] ?? 'face_log', type: 'face' }
	];

	if (type === 'all') {
		return supportedIndices;
	}

	const index = supportedIndices.find((idx) => idx.type === type);
	return index ? [index] : supportedIndices;
}

export default router;
