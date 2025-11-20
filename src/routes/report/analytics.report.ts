import { Request, Router } from 'express';
import { dtoValidationMiddleware } from '../../validation/dto';
import { AnalyticsBody } from '../../validation/dto/report.dto';
import Time from '../../tools/time.tools';
import { ApiError } from '../../types/classes/error.class';
import Camera from '../../db/mongo/models/camera';
import Personnel from '../../db/mongo/models/personnel';
import CarBrand from '../../db/mongo/models/carBrand';
import CarColor from '../../db/mongo/models/carColor';
import { isValidObjectId } from 'mongoose';
import { stringPlateToJson } from '../../tools/plate.tools';
import { Clock } from '../../types/interfaces/time.interface';
import { cosineSimilarity } from '../../tools/utils.tools';

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

/**
 * ===================================
 * HELPER FUNCTIONS
 * ===================================
 */

/**
 * DBSCAN clustering algorithm for face vectors
 * Groups similar face vectors together based on cosine similarity
 *
 * @param vectors - Array of face vectors with metadata
 * @param eps - Maximum distance threshold (1 - cosine similarity)
 * @param minPts - Minimum points to form a cluster
 * @returns Array of clusters, each containing similar faces
 */
function dbscanClustering(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	vectors: Array<{ vector: number[]; data: any }>,
	eps = 0.4,
	minPts = 1
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Array<any[]> {
	if (!Array.isArray(vectors) || vectors.length === 0) {
		return [];
	}
	const n = vectors.length;
	const visited = new Array(n).fill(false);
	const clusters: number[][] = [];
	const noise: number[] = [];

	// Calculate cosine distance (1 - cosine similarity)
	const distance = (i: number, j: number): number => {
		return 1 - cosineSimilarity(vectors[i].vector, vectors[j].vector);
	};

	// Find neighbors within eps distance
	const regionQuery = (pointIdx: number): number[] => {
		const neighbors: number[] = [];
		for (let i = 0; i < n; i++) {
			if (distance(pointIdx, i) <= eps) {
				neighbors.push(i);
			}
		}
		return neighbors;
	};

	// Expand cluster from seed point
	const expandCluster = (pointIdx: number, neighbors: number[], cluster: number[]): boolean => {
		cluster.push(pointIdx);

		for (let i = 0; i < neighbors.length; i++) {
			const neighborIdx = neighbors[i];

			if (!visited[neighborIdx]) {
				visited[neighborIdx] = true;
				const newNeighbors = regionQuery(neighborIdx);

				if (newNeighbors.length >= minPts) {
					neighbors.push(...newNeighbors.filter((n) => !neighbors.includes(n)));
				}
			}

			// Add to cluster if not already in any cluster
			if (!clusters.some((c) => c.includes(neighborIdx)) && !cluster.includes(neighborIdx)) {
				cluster.push(neighborIdx);
			}
		}

		return true;
	};

	// Main DBSCAN loop
	for (let i = 0; i < n; i++) {
		if (visited[i]) continue;

		visited[i] = true;
		const neighbors = regionQuery(i);

		if (neighbors.length < minPts) {
			noise.push(i);
		} else {
			const cluster: number[] = [];
			expandCluster(i, neighbors, cluster);
			clusters.push(cluster);
		}
	}

	// Convert cluster indices to actual data
	return clusters.map((clusterIndices) => clusterIndices.map((idx) => vectors[idx].data));
}

/**
 * ===================================
 * INPUT VALIDATION
 * ===================================
 */

/**
 * POST /most-repeated-plates
 * POST /most-repeated-known-faces
 * POST /most-repeated-unknown-faces
 * POST /most-active-cameras
 * POST /brand-statistics
 * POST /color-statistics
 *
 * Validate request body for analytics endpoints
 */
router.post(
	'/:type(most-repeated-plates|most-repeated-known-faces|most-repeated-unknown-faces|most-active-cameras|brand-statistics|color-statistics|plate-statistics-by-camera)',
	dtoValidationMiddleware(AnalyticsBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all required fields'
	}),
	// Validate that start time is before stop time
	Time.compareTimeMiddleware('start', 'stop')
);

/**
 * ===================================
 * ANALYTICS ENDPOINTS
 * ===================================
 */

/**
 * POST /most-repeated-plates
 * Get the most frequently detected license plates within a time range
 *
 * Returns:
 * - plate_number: License plate
 * - count: Number of detections
 * - first_seen: First detection timestamp
 * - last_seen: Last detection timestamp
 * - cameras: List of cameras where detected
 * - owner: Vehicle owner information (if available)
 */
router.post('/most-repeated-plates', async (req: Request, res, next) => {
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

		// Elasticsearch aggregation query for most repeated plates
		// Exclude masked plates (containing * or _)
		const query = {
			index: process.env['PLATE_INDEX'] ?? 'plate_log',
			size: 0,
			query: {
				bool: {
					must: [...time_constraints, ...camera_filter],
					must_not: [
						{ wildcard: { 'plate_number.keyword': '*\\**' } }, // Exclude plates with asterisks
						{ wildcard: { 'plate_number.keyword': '*_*' } }, // Exclude plates with underscores
						{ regexp: { 'plate_number.keyword': '.*[_*].*' } } // Exclude any plate containing _ or *
					]
				}
			},
			aggs: {
				repeated_plates: {
					terms: {
						field: 'plate_number.keyword',
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
						owner: {
							terms: {
								field: 'owner.keyword',
								size: 1
							}
						},
						sample: {
							top_hits: {
								size: 1,
								_source: ['plate_number', 'owner', 'brand', 'color', 'allowed', 'crop', 'inner_crop']
							}
						},
						crops: {
							top_hits: {
								size: 10,
								_source: ['crop', 'inner_crop', 'timestamp', 'camera_id'],
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

		if (!aggregations?.repeated_plates?.buckets) {
			return res.status(200).json({
				success: true,
				data: [],
				total: 0
			});
		}

		// Collect all unique IDs first to batch fetch
		const allPersonnelIds = new Set<string>();
		const allCameraIds = new Set<string>();
		const allBrandIds = new Set<string>();
		const allColorIds = new Set<string>();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(aggregations.repeated_plates?.buckets ?? []).forEach((bucket: any) => {
			const sample = bucket.sample?.hits?.hits?.[0]?._source;
			const owner = bucket.owner?.buckets?.[0]?.key;

			if (owner && isValidObjectId(owner)) {
				allPersonnelIds.add(owner);
			}
			if (sample?.brand && isValidObjectId(sample.brand)) {
				allBrandIds.add(sample.brand);
			}
			if (sample?.color && isValidObjectId(sample.color)) {
				allColorIds.add(sample.color);
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(bucket.cameras?.buckets ?? []).forEach((c: any) => {
				if (isValidObjectId(c.key)) {
					allCameraIds.add(c.key);
				}
			});
		});

		// Batch fetch all data
		const [personnelMap, cameraMap, brandMap, colorMap] = await Promise.all([
			Personnel.find({ _id: { $in: Array.from(allPersonnelIds) } })
				.exec()
				.then((docs) => new Map(docs.map((doc) => [doc._id.toString(), doc]))),
			Camera.find({ _id: { $in: Array.from(allCameraIds) } })
				.exec()
				.then((docs) => new Map(docs.map((doc) => [doc._id.toString(), doc]))),
			CarBrand.find({ _id: { $in: Array.from(allBrandIds) } })
				.exec()
				.then((docs) => new Map(docs.map((doc) => [doc._id.toString(), doc]))),
			CarColor.find({ _id: { $in: Array.from(allColorIds) } })
				.exec()
				.then((docs) => new Map(docs.map((doc) => [doc._id.toString(), doc])))
		]);

		// Process results without nested database calls
		const data = (aggregations.repeated_plates?.buckets ?? [])
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.filter((bucket: any) => {
				// Filter out plates containing underscores or asterisks
				const plateKey = bucket.key;
				return plateKey && !plateKey.includes('_') && !plateKey.includes('*');
			})
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.map((bucket: any) => {
				const sample = bucket.sample?.hits?.hits?.[0]?._source;
				const owner = bucket.owner?.buckets?.[0]?.key;

				// Get data from cache
				const personnel = owner && isValidObjectId(owner) ? personnelMap.get(owner) : undefined;
				const brand = sample?.brand && isValidObjectId(sample.brand) ? brandMap.get(sample.brand) : undefined;
				const color = sample?.color && isValidObjectId(sample.color) ? colorMap.get(sample.color) : undefined;

				// Get camera names from cache
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const cameraIds = (bucket.cameras?.buckets ?? []).map((c: any) => c.key);
				const camerasData = cameraIds.map((cid: string) => {
					const cam = isValidObjectId(cid) ? cameraMap.get(cid) : undefined;
					return { camera_id: cid, camera_name: cam?.name ?? 'Unknown' };
				});

				// Extract crop images
				const crops =
					bucket.crops?.hits?.hits?.map(
						(hit: {
							_id?: string;
							_source?: { crop?: string; inner_crop?: string; timestamp?: string; camera_id?: string };
						}) => ({
							log_id: hit._id ?? null,
							crop: hit._source?.crop ?? null,
							inner_crop: hit._source?.inner_crop ?? null,
							timestamp: hit._source?.timestamp ?? null,
							camera_id: hit._source?.camera_id ?? null
						})
					) ?? [];

				return {
					plate_number: stringPlateToJson(bucket.key),
					plate_number_string: bucket.key,
					count: bucket.doc_count,
					first_seen: new Date(bucket.first_seen.value).toLocaleString('en-US', { timeZone: timezone }),
					last_seen: new Date(bucket.last_seen.value).toLocaleString('en-US', { timeZone: timezone }),
					cameras: camerasData,
					owner: personnel?.toName() ?? 'Unknown',
					owner_id: owner ?? '',
					brand: brand?.name ?? '',
					car_type: brand?.car_type ?? '',
					color: color?.name ?? '',
					fa_color: color?.fa_name ?? '',
					allowed: sample?.allowed ?? null,
					crop: sample?.crop ?? null,
					inner_crop: sample?.inner_crop ?? null,
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
 * POST /most-repeated-unknown-faces
 * Get the most frequently detected unknown/unrecognized faces within a time range
 * Groups unknown faces by their face image to show unique unrecognized individuals
 *
 * Request Parameters:
 * - date_start, date_end: Date range filter
 * - time_start, time_end: Time range filter (optional, for recurring time windows)
 * - cameras: Array of camera IDs to filter (optional, admin only)
 * - camera_ids: Alternative parameter for camera filtering (optional)
 * - limit: Maximum number of clusters to return (default: 10)
 * - timez: Timezone for date formatting (default: Asia/Tehran)
 *
 * Returns:
 * - personnel_id: Always 'unknown'
 * - name: Identifier based on face hash
 * - count: Number of detections
 * - first_seen: First detection timestamp
 * - last_seen: Last detection timestamp
 * - camera_ids: Array of camera IDs where detected
 * - cameras: List of cameras with details (id and name)
 * - inner_crop: Representative face image
 * - crops: Array of crop images (up to 10)
 */
router.post('/most-repeated-unknown-faces', async (req: Request, res, next) => {
	try {
		const { date_start, date_end, time_start, time_end, cameras, camera_ids, limit = 10, timez } = req.body;
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

		// Build camera access filter (supports both 'cameras' and 'camera_ids' parameters)
		const cameraFilter = cameras || camera_ids;
		const camera_filter = buildCameraFilter(req, cameraFilter);

		// Query for unknown faces - fetch with vectors for clustering
		const query = {
			index: process.env['FACE_INDEX'] ?? 'face_log',
			size: 1000, // Fetch more for clustering analysis
			query: {
				bool: {
					must: [
						...time_constraints,
						...camera_filter,
						{ exists: { field: 'vector' } } // Ensure vector exists for clustering
					],
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
		const hits = (esRes.hits?.hits ?? []) as any[];

		if (hits.length === 0) {
			return res.status(200).json({
				success: true,
				data: [],
				total: 0
			});
		}

		// Prepare vectors for clustering
		const faceVectors = hits
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.filter((hit: any) => hit._source?.vector && Array.isArray(hit._source.vector))
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.map((hit: any) => ({
				vector: hit._source.vector,
				data: {
					...hit._source,
					_id: hit._id
				}
			}));

		// Apply DBSCAN clustering with cosine distance
		// eps=0.4 means faces with >60% similarity (1-0.4=0.6) are grouped together
		// minPts=1 allows single detections to form their own cluster
		const clusters = dbscanClustering(faceVectors, 0.4, 1);

		// Sort clusters by size (most detections first) and take top N
		const sortedClusters = clusters.sort((a, b) => b.length - a.length).slice(0, limit);

		// Filter clusters by camera_ids if specified
		let filteredClusters = sortedClusters.filter((cluster) => Array.isArray(cluster) && cluster.length > 0);
		if (camera_ids && Array.isArray(camera_ids) && camera_ids.length > 0) {
			filteredClusters = filteredClusters.filter((clusterLogs) => {
				// Check if cluster has any detections from the specified cameras
				return (
					Array.isArray(clusterLogs) &&
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					clusterLogs.some((log: any) => log?.camera_id && camera_ids.includes(log.camera_id))
				);
			});
		}

		// Collect all unique camera IDs for batch fetching
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

		// Batch fetch all cameras at once
		const cameraMap = await Camera.find({ _id: { $in: Array.from(allCameraIds) } })
			.exec()
			.then((docs) => new Map(docs.map((doc) => [doc._id.toString(), doc])));

		// Process each cluster without nested database calls
		const data = filteredClusters
			.filter((clusterLogs) => Array.isArray(clusterLogs) && clusterLogs.length > 0)
			.map((clusterLogs, clusterIdx: number) => {
				// Get unique cameras from cache
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const cameraSet = new Set(clusterLogs.map((log: any) => log?.camera_id).filter(Boolean));
				const cameraIds = Array.from(cameraSet);

				// Get camera details from cache
				const camerasData = cameraIds.map((cid: string) => {
					const cam = isValidObjectId(cid) ? cameraMap.get(cid) : undefined;
					return { camera_id: cid, camera_name: cam?.name ?? 'Unknown' };
				});

				// Get first and last seen
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const timestamps = clusterLogs.map((log: any) => new Date(log.timestamp).getTime());
				const firstSeen = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : new Date();
				const lastSeen = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();

				// Use the most recent face image as representative
				const representativeFace = clusterLogs[0];

				// Extract up to 10 crop images (raw timestamps for speed)
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
