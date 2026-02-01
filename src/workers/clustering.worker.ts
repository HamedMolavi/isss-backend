import { parentPort, workerData } from 'worker_threads';

/**
 * Worker thread for CPU-intensive face clustering operations
 * Runs clustering off the main Node.js event loop to prevent blocking HTTP requests
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

interface ClusteringRequest {
	type: 'process';
	existingClusters: ClusterState[];
	newFaces: FaceVectorData[];
	similarityThreshold: number;
}

interface ClusteringResult {
	clusters: ClusterState[];
	newClustersCreated: number;
	facesAssignedToExisting: number;
}

const SIMILARITY_THRESHOLD = 0.6;

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
	nextClusterId: number,
	similarityThreshold: number
): { cluster: ClusterState; isNew: boolean } {
	let bestMatch: ClusterState | null = null;
	let bestSimilarity = 0;

	// Find nearest cluster
	for (let i = 0; i < existingClusters.length; i++) {
		const cluster = existingClusters[i];
		const similarity = cosineSimilarity(faceData.vector, cluster.centroid);
		if (similarity > bestSimilarity && similarity >= similarityThreshold) {
			bestSimilarity = similarity;
			bestMatch = cluster;
		}
	}

	// Assign to existing cluster
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

	// Create new cluster
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

function processClustering(request: ClusteringRequest): ClusteringResult {
	const clusters = [...request.existingClusters];
	let nextClusterId =
		request.existingClusters.length > 0
			? Math.max(...request.existingClusters.map((c) => c.clusterId)) + 1
			: 1;

	let newClustersCreated = 0;
	let facesAssignedToExisting = 0;

	for (const face of request.newFaces) {
		const { cluster, isNew } = assignToCluster(face, clusters, nextClusterId, request.similarityThreshold);

		if (isNew) {
			clusters.push(cluster);
			nextClusterId++;
			newClustersCreated++;
		} else {
			facesAssignedToExisting++;
		}
	}

	return {
		clusters,
		newClustersCreated,
		facesAssignedToExisting
	};
}

// Handle messages from parent thread
if (parentPort) {
	parentPort.on('message', (request: ClusteringRequest) => {
		try {
			if (request.type === 'process') {
				const result = processClustering(request);
				parentPort!.postMessage({ success: true, result });
			}
		} catch (error) {
			parentPort!.postMessage({
				success: false,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	});
}
