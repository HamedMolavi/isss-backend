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

function parseTimestampToMs(timestamp: unknown): number {
	if (typeof timestamp === 'number') {
		return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
	}

	if (typeof timestamp !== 'string') return 0;
	const trimmed = timestamp.trim();
	if (!trimmed) return 0;

	const numericTimestamp = Number(trimmed);
	if (Number.isFinite(numericTimestamp) && numericTimestamp > 0) {
		return numericTimestamp;
	}

	const parsed = new Date(trimmed).getTime();
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function deduplicateFacesByLogId(faces: FaceVectorData[]): FaceVectorData[] {
	const uniqueFaces = new Map<string, FaceVectorData>();

	for (const face of faces) {
		const current = uniqueFaces.get(face._id);
		if (!current) {
			uniqueFaces.set(face._id, face);
			continue;
		}

		// Keep the newest document per log_id when duplicates appear.
		if (parseTimestampToMs(face.timestamp) >= parseTimestampToMs(current.timestamp)) {
			uniqueFaces.set(face._id, face);
		}
	}

	return Array.from(uniqueFaces.values());
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

		const baseClusters: ClusterState[] = [];

		const indexName = process.env['FACE_INDEX'] ?? 'face_log';
		const BATCH_SIZE = 10000;
		const newFaces: FaceVectorData[] = [];
		const queryMust: any[] = [{ exists: { field: 'vector' } }];
		console.log('[Worker] Fetch mode: full_rebuild (all matching documents)');

		let totalFetched = 0;
		let scrollId: string | undefined;

		try {
			const searchParams: any = {
				index: indexName,
				size: BATCH_SIZE,
				scroll: '2m',
				body: {
					query: {
						bool: {
							must: queryMust,
							should: [
								{ term: { 'personnel_id.keyword': 'unknown' } },
								{ bool: { must_not: [{ exists: { field: 'personnel_id' } }] } }
							],
							minimum_should_match: 1
						}
					},
					// Use _doc sort for efficient scroll pagination (no _id fielddata needed).
					sort: [{ _doc: { order: 'asc' } }],
					_source: ['vector', 'timestamp', 'camera_id', 'inner_crop', 'allowed', 'personnel_id']
				}
			};
			let searchResult: any = await esClient.search(searchParams);

			scrollId = searchResult._scroll_id as string | undefined;
			let hits = (searchResult.hits?.hits ?? []) as any[];

			while (hits.length > 0) {
				for (const hit of hits) {
					const source = hit._source;

					if (source?.vector && Array.isArray(source.vector) && source.vector.length > 0) {
						const isValidVector = source.vector.every((v: number) => typeof v === 'number' && !isNaN(v));

						if (isValidVector) {
							const timestampMs = parseTimestampToMs(source.timestamp);
							newFaces.push({
								vector: source.vector,
								_id: hit._id,
								timestamp: timestampMs > 0 ? new Date(timestampMs).toISOString() : new Date().toISOString(),
								camera_id: source.camera_id,
								inner_crop: source.inner_crop,
								allowed: source.allowed,
								personnel_id: source.personnel_id
							});
						}
					}
				}

				totalFetched += hits.length;
				console.log(
					`[Worker] Fetched batch: ${hits.length}, total: ${totalFetched}, valid faces: ${newFaces.length}`
				);

				if (!scrollId) {
					break;
				}

				searchResult = await esClient.scroll({
					scroll_id: scrollId,
					scroll: '2m'
				});
				scrollId = searchResult._scroll_id as string | undefined;
				hits = (searchResult.hits?.hits ?? []) as any[];
			}
		} finally {
			if (scrollId) {
				try {
					await esClient.clearScroll({ scroll_id: scrollId });
				} catch (clearErr) {
					console.warn('[Worker] Failed to clear scroll context:', clearErr);
				}
			}
		}

		console.log(`[Worker] Total faces fetched: ${newFaces.length}`);
		const uniqueNewFaces = deduplicateFacesByLogId(newFaces);
		const duplicateCount = newFaces.length - uniqueNewFaces.length;
		const uniqueLogIdsCount = new Set(uniqueNewFaces.map((face) => face._id)).size;
		const hasUniqueLogIds = uniqueLogIdsCount === uniqueNewFaces.length;
		if (duplicateCount > 0) {
			console.log(
				`[Worker] Removed duplicate faces by log_id: ${duplicateCount} duplicates (unique: ${uniqueNewFaces.length})`
			);
		}
		console.log(
			`[Worker] Unique log_id check: ${hasUniqueLogIds ? 'PASS' : 'FAIL'} (${uniqueLogIdsCount}/${uniqueNewFaces.length})`
		);

		// Process clustering
		const { clusters, newClustersCreated, facesAssignedToExisting } = processClustering(
			baseClusters,
			uniqueNewFaces
		);

		console.log(`[Worker] Clustering complete: ${clusters.length} clusters (${newClustersCreated} new)`);

		// Update metadata
		const defaultTimestamp = new Date().toISOString();
		let latestTimestamp = defaultTimestamp;

		if (uniqueNewFaces.length > 0) {
			const latestTimestampMs = uniqueNewFaces.reduce(
				(max, face) => Math.max(max, parseTimestampToMs(face.timestamp)),
				0
			);
			if (latestTimestampMs > 0) {
				latestTimestamp = new Date(latestTimestampMs).toISOString();
			}
		} else if (existingMetadata?.lastProcessedTimestamp) {
			const previousTimestampMs = parseTimestampToMs(existingMetadata.lastProcessedTimestamp);
			if (previousTimestampMs > 0) {
				latestTimestamp = new Date(previousTimestampMs).toISOString();
			}
		}

		const metadata: IncrementalMetadata = {
			lastProcessedTimestamp: latestTimestamp,
			lastRefreshTime: new Date().toISOString(),
			totalClusters: clusters.length,
			totalFacesProcessed: uniqueNewFaces.length,
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
				newFacesProcessed: uniqueNewFaces.length,
				duplicateLogIdsSkipped: duplicateCount,
				uniqueLogIds: uniqueLogIdsCount,
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
