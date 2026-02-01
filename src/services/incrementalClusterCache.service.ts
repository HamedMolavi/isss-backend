import { RedisClientType } from 'redis';
import { Logger } from '../logger';
import { getAnalyticsCacheService } from './analyticsCache.service';
import { Worker } from 'worker_threads';
import * as path from 'path';

/**
 * Cluster state stored in Redis for incremental updates
 */
interface ClusterState {
	clusterId: number;
	centroid: number[]; // Average vector of all faces in cluster
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
	}>; // Store up to 10 sample faces per cluster
}

/**
 * Metadata for incremental refresh tracking
 */
interface IncrementalMetadata {
	lastProcessedTimestamp: string;
	lastRefreshTime: string;
	totalClusters: number;
	totalFacesProcessed: number;
	version: number;
}

/**
 * Face vector data from Elasticsearch
 */
interface FaceVectorData {
	vector: number[];
	_id: string;
	timestamp: string;
	camera_id?: string;
	inner_crop?: string;
	allowed?: boolean;
	personnel_id?: string;
}

export class IncrementalClusterCacheService {
	private logger: Logger;
	private readonly SIMILARITY_THRESHOLD = 0.6; // Cosine similarity threshold for cluster assignment
	private worker: Worker | null = null;

	constructor() {
		this.logger = new Logger({ serviceName: 'IncrementalClusterCache' });
	}

	/**
	 * Initialize worker thread for clustering operations
	 */
	private getWorker(): Worker {
		if (!this.worker) {
			const workerPath = path.join(__dirname, '../workers/clustering.worker.js');
			this.worker = new Worker(workerPath);
			this.logger.info('Clustering worker thread created');
		}
		return this.worker;
	}

	/**
	 * Clean up worker thread
	 */
	async cleanup(): Promise<void> {
		if (this.worker) {
			await this.worker.terminate();
			this.worker = null;
			this.logger.info('Clustering worker thread terminated');
		}
	}

	/**
	 * Generate Redis key for cluster state
	 */
	private getClusterStateKey(endpoint: string, params: Record<string, unknown>): string {
		const paramsString = JSON.stringify(params);
		const paramsHash = Buffer.from(paramsString).toString('base64').substring(0, 32);
		return `cluster_state:${endpoint}:${paramsHash}`;
	}

	/**
	 * Generate Redis key for incremental metadata
	 */
	private getMetadataKey(endpoint: string, params: Record<string, unknown>): string {
		const paramsString = JSON.stringify(params);
		const paramsHash = Buffer.from(paramsString).toString('base64').substring(0, 32);
		return `cluster_metadata:${endpoint}:${paramsHash}`;
	}

	/**
	 * Run clustering in worker thread (non-blocking)
	 */
	private runClusteringInWorker(
		existingClusters: ClusterState[],
		newFaces: FaceVectorData[]
	): Promise<{ clusters: ClusterState[]; newClustersCreated: number; facesAssignedToExisting: number }> {
		return new Promise((resolve, reject) => {
			const worker = this.getWorker();

			const messageHandler = (message: any) => {
				worker.off('message', messageHandler);
				worker.off('error', errorHandler);

				if (message.success) {
					resolve(message.result);
				} else {
					reject(new Error(message.error));
				}
			};

			const errorHandler = (error: Error) => {
				worker.off('message', messageHandler);
				worker.off('error', errorHandler);
				reject(error);
			};

			worker.on('message', messageHandler);
			worker.on('error', errorHandler);

			worker.postMessage({
				type: 'process',
				existingClusters,
				newFaces,
				similarityThreshold: this.SIMILARITY_THRESHOLD
			});
		});
	}

	/**
	 * Get existing cluster state from Redis
	 */
	async getClusterState(
		endpoint: string,
		params: Record<string, unknown>
	): Promise<{ clusters: ClusterState[]; metadata: IncrementalMetadata | null }> {
		try {
			const cacheService = await getAnalyticsCacheService();
			const client = (cacheService as any).client as RedisClientType;

			if (!client) {
				return { clusters: [], metadata: null };
			}

			const stateKey = this.getClusterStateKey(endpoint, params);
			const metadataKey = this.getMetadataKey(endpoint, params);

			const [stateData, metadataData] = await Promise.all([client.get(stateKey), client.get(metadataKey)]);

			const clusters = stateData ? JSON.parse(stateData) : [];
			const metadata = metadataData ? JSON.parse(metadataData) : null;

			// Migration: Add sampleFaces to existing clusters that don't have it
			for (const cluster of clusters) {
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

			this.logger.info('Retrieved cluster state', {
				endpoint,
				clusterCount: clusters.length,
				hasMetadata: !!metadata
			});

			return { clusters, metadata };
		} catch (error) {
			this.logger.error('Failed to get cluster state', { error });
			return { clusters: [], metadata: null };
		}
	}

	/**
	 * Save cluster state to Redis
	 */
	async saveClusterState(
		endpoint: string,
		params: Record<string, unknown>,
		clusters: ClusterState[],
		metadata: IncrementalMetadata,
		ttlSeconds: number = 86400 // 24 hours
	): Promise<void> {
		try {
			const cacheService = await getAnalyticsCacheService();
			const client = (cacheService as any).client as RedisClientType;

			if (!client) {
				this.logger.warn('Redis client not available');
				return;
			}

			const stateKey = this.getClusterStateKey(endpoint, params);
			const metadataKey = this.getMetadataKey(endpoint, params);

			await Promise.all([
				client.setEx(stateKey, ttlSeconds, JSON.stringify(clusters)),
				client.setEx(metadataKey, ttlSeconds, JSON.stringify(metadata))
			]);

			this.logger.info('Saved cluster state', {
				endpoint,
				clusterCount: clusters.length,
				totalFaces: metadata.totalFacesProcessed
			});
		} catch (error) {
			this.logger.error('Failed to save cluster state', { error });
		}
	}

	/**
	 * Process new faces incrementally and update cluster state
	 */
	async processIncrementalUpdate(
		endpoint: string,
		params: Record<string, unknown>,
		newFaces: FaceVectorData[]
	): Promise<{ clusters: ClusterState[]; metadata: IncrementalMetadata }> {
		const startTime = Date.now();

		// Get existing state
		const { clusters: existingClusters, metadata: existingMetadata } = await this.getClusterState(
			endpoint,
			params
		);

		this.logger.info('Starting incremental update (Worker Thread)', {
			endpoint,
			existingClusters: existingClusters.length,
			newFaces: newFaces.length
		});

		// Run clustering in worker thread (non-blocking)
		const { clusters, newClustersCreated, facesAssignedToExisting } = await this.runClusteringInWorker(
			existingClusters,
			newFaces
		);

		// Update metadata
		// Validate timestamps to prevent storing invalid values that cause ES query errors
		const defaultTimestamp = new Date().toISOString();
		let latestTimestamp = defaultTimestamp;

		if (newFaces.length > 0) {
			// Find the max timestamp from new faces, validating each one
			const validTimestamps = newFaces
				.map((face) => face.timestamp)
				.filter((ts) => ts && typeof ts === 'string' && !isNaN(new Date(ts).getTime()));

			if (validTimestamps.length > 0) {
				latestTimestamp = validTimestamps.reduce((max, ts) => (ts > max ? ts : max), validTimestamps[0]);
			}
		} else if (existingMetadata?.lastProcessedTimestamp) {
			// Validate existing metadata timestamp
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

		const duration = Date.now() - startTime;

		this.logger.info('Incremental update completed', {
			endpoint,
			duration,
			newFacesProcessed: newFaces.length,
			newClustersCreated,
			facesAssignedToExisting,
			totalClusters: clusters.length,
			totalFacesProcessed: metadata.totalFacesProcessed
		});

		// Save updated state
		await this.saveClusterState(endpoint, params, clusters, metadata);

		return { clusters, metadata };
	}

	/**
	 * Convert cluster state to API response format
	 */
	formatClustersForResponse(clusters: ClusterState[], timezone: string = 'Asia/Tehran'): any[] {
		return clusters
			.sort((a, b) => b.memberCount - a.memberCount) // Sort by cluster size
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

	/**
	 * Clear cluster state (for testing or reset)
	 */
	async clearClusterState(endpoint: string, params: Record<string, unknown>): Promise<void> {
		try {
			const cacheService = await getAnalyticsCacheService();
			const client = (cacheService as any).client as RedisClientType;

			if (!client) {
				return;
			}

			const stateKey = this.getClusterStateKey(endpoint, params);
			const metadataKey = this.getMetadataKey(endpoint, params);

			await Promise.all([client.del(stateKey), client.del(metadataKey)]);

			this.logger.info('Cleared cluster state', { endpoint });
		} catch (error) {
			this.logger.error('Failed to clear cluster state', { error });
		}
	}
}

export const getIncrementalClusterCache = () => new IncrementalClusterCacheService();
