import { parentPort } from 'worker_threads';
import { Client } from '@elastic/elasticsearch';
import { createClient } from 'redis';

/**
 * Worker thread for complete incremental refresh cycle
 * Handles: ES fetching, Redis get/set, clustering, formatting
 * Runs completely independently from main thread to prevent blocking
 */

interface RefreshRequest {
	type: 'refresh';
	esConfig: {
		node: string;
		auth?: { username: string; password: string };
	};
	redisConfig: {
		url: string;
	};
	params: {
		endpoint: string;
		cacheParams: Record<string, unknown>;
		timezone: string;
	};
}

interface ClusterState {
	clusterId: number;
	centroid: number[];
	memberCount: number;
	firstSeen: string;
	lastSeen: string;
	representativeFaceId: string;
	representativeData: {
		inner_crop?: string;
		camera_id?: string;
		timestamp?: string;
		allowed?: boolean;
	};
	sampleFaces: Array<{
		log_id: string;
		inner_crop?: string;
		timestamp?: string;
		camera_id?: string;
	}>;
}

interface IncrementalMetadata {
	lastProcessedTimestamp: string;
	lastRefreshTime: string;
	totalClusters: number;
	totalFacesProcessed: number;
	version: number;
}

interface FaceVectorData {
	vector: number[];
	_id: string;
	timestamp: string;
	camera_id?: string;
	inner_crop?: string;
	allowed?: boolean;
	personnel_id?: string;
}

/**
 * Parse and validate clustering config from environment variables
 */
function getClusteringConfig(): { similarityThreshold: number; minPts: number } {
	// Parse similarity threshold (default 0.6, clamp between 0 and 1)
	let similarityThreshold = 0.6;
	const envThreshold = process.env['FACE_CLUSTER_SIMILARITY_THRESHOLD'];
	if (envThreshold) {
		const parsed = parseFloat(envThreshold);
		if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
			similarityThreshold = parsed;
		}
	}

	// Parse minPts (default 1, minimum 1)
	let minPts = 1;
	const envMinPts = process.env['FACE_CLUSTER_MIN_PTS'];
	if (envMinPts) {
		const parsed = parseInt(envMinPts, 10);
		if (!isNaN(parsed) && parsed >= 1) {
			minPts = parsed;
		}
	}

	return { similarityThreshold, minPts };
}

// Load config once at worker startup
const clusteringConfig = getClusteringConfig();
const SIMILARITY_THRESHOLD = clusteringConfig.similarityThreshold;
const MIN_PTS = clusteringConfig.minPts;

console.log(`[Worker] Clustering config: similarityThreshold=${SIMILARITY_THRESHOLD}, minPts=${MIN_PTS}`);

function cosineSimilarity(vec1: number[], vec2: number[]): number {
	if (vec1.length !== vec2.length) return 0;

	let dotProduct = 0;
	let norm1 = 0;
	let norm2 = 0;

	for (let i = 0; i < vec1.length; i++) {
		dotProduct += vec1[i] * vec2[i];
		norm1 += vec1[i] * vec1[i];
		norm2 += vec2[i] * vec2[i];
	}

	const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
	return denominator === 0 ? 0 : dotProduct / denominator;
}

function assignToCluster(
	faceData: FaceVectorData,
	existingClusters: ClusterState[],
	nextClusterId: number
): { cluster: ClusterState; isNew: boolean } {
	let bestMatch: ClusterState | null = null;
	let bestSimilarity = 0;

	for (const cluster of existingClusters) {
		const similarity = cosineSimilarity(faceData.vector, cluster.centroid);
		if (similarity > bestSimilarity && similarity >= SIMILARITY_THRESHOLD) {
			bestSimilarity = similarity;
			bestMatch = cluster;
		}
	}

	if (bestMatch) {
		const oldCount = bestMatch.memberCount;
		const newCount = oldCount + 1;

		for (let i = 0; i < bestMatch.centroid.length; i++) {
			bestMatch.centroid[i] = (bestMatch.centroid[i] * oldCount + faceData.vector[i]) / newCount;
		}

		bestMatch.memberCount = newCount;
		bestMatch.lastSeen = faceData.timestamp;

		if (bestMatch.sampleFaces.length < 10) {
			bestMatch.sampleFaces.push({
				log_id: faceData._id,
				inner_crop: faceData.inner_crop,
				timestamp: faceData.timestamp,
				camera_id: faceData.camera_id
			});
		}

		return { cluster: bestMatch, isNew: false };
	}

	const newCluster: ClusterState = {
		clusterId: nextClusterId,
		centroid: [...faceData.vector],
		memberCount: 1,
		firstSeen: faceData.timestamp,
		lastSeen: faceData.timestamp,
		representativeFaceId: faceData._id,
		representativeData: {
			inner_crop: faceData.inner_crop,
			camera_id: faceData.camera_id,
			timestamp: faceData.timestamp,
			allowed: faceData.allowed
		},
		sampleFaces: [
			{
				log_id: faceData._id,
				inner_crop: faceData.inner_crop,
				timestamp: faceData.timestamp,
				camera_id: faceData.camera_id
			}
		]
	};

	return { cluster: newCluster, isNew: true };
}

function processClustering(
	existingClusters: ClusterState[],
	newFaces: FaceVectorData[]
): {
	clusters: ClusterState[];
	newClustersCreated: number;
	facesAssignedToExisting: number;
} {
	const clusters = [...existingClusters];
	let nextClusterId =
		existingClusters.length > 0 ? Math.max(...existingClusters.map((c) => c.clusterId)) + 1 : 1;

	let newClustersCreated = 0;
	let facesAssignedToExisting = 0;

	for (const face of newFaces) {
		const { cluster, isNew } = assignToCluster(face, clusters, nextClusterId);

		if (isNew) {
			clusters.push(cluster);
			nextClusterId++;
			newClustersCreated++;
		} else {
			facesAssignedToExisting++;
		}
	}

	return { clusters, newClustersCreated, facesAssignedToExisting };
}

function formatClustersForResponse(clusters: ClusterState[], timezone: string): any[] {
	// Filter clusters by minPts before formatting
	const filteredClusters = clusters.filter((cluster) => cluster.memberCount >= MIN_PTS);

	return filteredClusters
		.sort((a, b) => b.memberCount - a.memberCount)
		.map((cluster, index) => ({
			personnel_id: 'unknown',
			personnel_code: '',
			name: `Unknown Person #${index + 1}`,
			count: cluster.memberCount,
			first_seen: new Date(cluster.firstSeen).toLocaleString('en-US', { timeZone: timezone }),
			last_seen: new Date(cluster.lastSeen).toLocaleString('en-US', { timeZone: timezone }),
			first_seen_timestamp: new Date(cluster.firstSeen).getTime(),
			last_seen_timestamp: new Date(cluster.lastSeen).getTime(),
			camera_ids: cluster.representativeData.camera_id ? [cluster.representativeData.camera_id] : [],
			cameras: cluster.representativeData.camera_id
				? [{ camera_id: cluster.representativeData.camera_id, camera_name: 'Unknown' }]
				: [],
			allowed: cluster.representativeData.allowed ?? null,
			is_recognized: false,
			inner_crop: cluster.representativeData.inner_crop ?? null,
			cluster_id: cluster.clusterId,
			crops: cluster.sampleFaces || []
		}));
}

async function performRefresh(request: RefreshRequest): Promise<any> {
	const startTime = Date.now();
	let esClient: Client | null = null;
	let redisClient: any = null;

	try {
		// Connect to Elasticsearch
		esClient = new Client(request.esConfig);

		// Connect to Redis
		redisClient = createClient({ url: request.redisConfig.url });
		await redisClient.connect();

		// Generate Redis keys
		const paramsString = JSON.stringify(request.params.cacheParams);
		const paramsHash = Buffer.from(paramsString).toString('base64').substring(0, 32);
		const stateKey = `cluster_state:${request.params.endpoint}:${paramsHash}`;
		const metadataKey = `cluster_metadata:${request.params.endpoint}:${paramsHash}`;

		// Get existing cluster state from Redis
		const [stateData, metadataData] = await Promise.all([
			redisClient.get(stateKey),
			redisClient.get(metadataKey)
		]);

		const existingClusters: ClusterState[] = stateData ? JSON.parse(stateData) : [];
		const existingMetadata: IncrementalMetadata | null = metadataData ? JSON.parse(metadataData) : null;

		// Migration: Add sampleFaces to existing clusters
		for (const cluster of existingClusters) {
			if (!cluster.sampleFaces) {
				cluster.sampleFaces = [
					{
						log_id: cluster.representativeFaceId,
						inner_crop: cluster.representativeData?.inner_crop,
						timestamp: cluster.representativeData?.timestamp,
						camera_id: cluster.representativeData?.camera_id
					}
				];
			}
		}

		console.log(`[Worker] Retrieved cluster state: ${existingClusters.length} clusters`);

		// Fetch faces from Elasticsearch (24-hour rolling window)
		const now = Date.now();
		const windowStart = now - 24 * 60 * 60 * 1000;
		const windowStartEpoch = String(windowStart);
		const windowEndEpoch = String(now);

		const indexName = process.env['FACE_INDEX'] ?? 'face_log';
		const BATCH_SIZE = 10000;
		const newFaces: FaceVectorData[] = [];

		let searchAfter: any[] | undefined = undefined;
		let hasMore = true;
		let totalFetched = 0;

		while (hasMore) {
			const searchParams: any = {
				index: indexName,
				size: BATCH_SIZE,
				body: {
					query: {
						bool: {
							must: [
								{
									range: {
										timestamp: {
											gte: windowStartEpoch,
											lte: windowEndEpoch
										}
									}
								},
								{ exists: { field: 'vector' } }
							],
							should: [
								{ term: { 'personnel_id.keyword': 'unknown' } },
								{ bool: { must_not: [{ exists: { field: 'personnel_id' } }] } }
							],
							minimum_should_match: 1
						}
					},
					sort: [{ timestamp: { order: 'asc' } }],
					_source: ['vector', 'timestamp', 'camera_id', 'inner_crop', 'allowed', 'personnel_id']
				}
			};

			if (searchAfter) {
				searchParams.body.search_after = searchAfter;
			}

			const searchResult = await esClient.search(searchParams);
			const hits = searchResult.hits?.hits || [];

			if (hits.length === 0) {
				hasMore = false;
				break;
			}

			for (const hit of hits as any[]) {
				const source = hit._source;

				if (source?.vector && Array.isArray(source.vector) && source.vector.length > 0) {
					const isValidVector = source.vector.every((v: number) => typeof v === 'number' && !isNaN(v));

					if (isValidVector) {
						newFaces.push({
							vector: source.vector,
							_id: hit._id,
							timestamp: source.timestamp || new Date().toISOString(),
							camera_id: source.camera_id,
							inner_crop: source.inner_crop,
							allowed: source.allowed,
							personnel_id: source.personnel_id
						});
					}
				}
			}

			totalFetched += hits.length;
			const lastHit = hits[hits.length - 1];
			searchAfter = lastHit.sort;

			if (hits.length < BATCH_SIZE) {
				hasMore = false;
			}

			console.log(
				`[Worker] Fetched batch: ${hits.length}, total: ${totalFetched}, valid faces: ${newFaces.length}`
			);
		}

		console.log(`[Worker] Total faces fetched: ${newFaces.length}`);

		// Process clustering
		const { clusters, newClustersCreated, facesAssignedToExisting } = processClustering(
			existingClusters,
			newFaces
		);

		console.log(`[Worker] Clustering complete: ${clusters.length} clusters (${newClustersCreated} new)`);

		// Update metadata
		const defaultTimestamp = new Date().toISOString();
		let latestTimestamp = defaultTimestamp;

		if (newFaces.length > 0) {
			const validTimestamps = newFaces
				.map((face) => face.timestamp)
				.filter((ts) => ts && typeof ts === 'string' && !isNaN(new Date(ts).getTime()));

			if (validTimestamps.length > 0) {
				latestTimestamp = validTimestamps.reduce((max, ts) => (ts > max ? ts : max), validTimestamps[0]);
			}
		} else if (existingMetadata?.lastProcessedTimestamp) {
			const parsedDate = new Date(existingMetadata.lastProcessedTimestamp);
			if (!isNaN(parsedDate.getTime()) && existingMetadata.lastProcessedTimestamp.trim() !== '') {
				latestTimestamp = existingMetadata.lastProcessedTimestamp;
			}
		}

		const metadata: IncrementalMetadata = {
			lastProcessedTimestamp: latestTimestamp,
			lastRefreshTime: new Date().toISOString(),
			totalClusters: clusters.length,
			totalFacesProcessed: (existingMetadata?.totalFacesProcessed || 0) + newFaces.length,
			version: (existingMetadata?.version || 0) + 1
		};

		// Save to Redis
		const ttlSeconds = 86400; // 24 hours
		await Promise.all([
			redisClient.setEx(stateKey, ttlSeconds, JSON.stringify(clusters)),
			redisClient.setEx(metadataKey, ttlSeconds, JSON.stringify(metadata))
		]);

		console.log(`[Worker] Saved cluster state to Redis`);

		// Format response
		const data = formatClustersForResponse(clusters, request.params.timezone);

		const duration = Date.now() - startTime;
		console.log(`[Worker] Refresh completed in ${duration}ms`);

		return {
			data,
			total: data.length,
			stats: {
				durationMs: duration,
				newFacesProcessed: newFaces.length,
				totalClusters: clusters.length,
				newClustersCreated,
				facesAssignedToExisting,
				totalFacesProcessed: metadata.totalFacesProcessed,
				version: metadata.version
			}
		};
	} finally {
		// Cleanup connections
		if (redisClient) {
			await redisClient.quit();
		}
		if (esClient) {
			await esClient.close();
		}
	}
}

// Handle messages from parent thread
if (parentPort) {
	parentPort.on('message', async (request: RefreshRequest) => {
		try {
			if (request.type === 'refresh') {
				const result = await performRefresh(request);
				parentPort!.postMessage({ success: true, result });
			}
		} catch (error) {
			console.error('[Worker] Refresh failed:', error);
			parentPort!.postMessage({
				success: false,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	});
}
