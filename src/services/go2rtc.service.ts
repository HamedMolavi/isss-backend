import axios, { AxiosInstance } from 'axios';
import { Logger } from '../logger';

/**
 * Interface for go2rtc stream configuration
 */
interface StreamConfig {
	[streamName: string]: string[];
}

/**
 * Interface for go2rtc configuration update
 */
interface Go2RTCConfig {
	streams: StreamConfig;
}

/**
 * Interface for stream access URLs
 */
interface StreamAccessUrls {
	webrtc: string;
	hls: string;
	mjpeg: string;
	mp4: string;
	flv: string;
	rtsp: string;
}

/**
 * Go2RTC Service for managing RTSP streams through go2rtc proxy
 * Handles stream creation, updates, deletion and provides access URLs
 */
export class Go2RTCService {
	private axiosInstance: AxiosInstance;
	private logger: Logger;
	private baseUrl: string;
	private rtspPort: string;

	constructor() {
		this.baseUrl = process.env.GO2RTC_BASE_URL || 'http://localhost:1984';
		this.rtspPort = process.env.GO2RTC_RTSP_PORT || '8554';
		this.logger = new Logger({ serviceName: 'Go2RTCService' });

		this.axiosInstance = axios.create({
			baseURL: this.baseUrl,
			timeout: 30000,
			headers: {
				'Content-Type': 'application/json'
			}
		});

		// Add request/response interceptors for logging
		this.axiosInstance.interceptors.request.use(
			(config) => {
				this.logger.info(`Making request to go2rtc: ${config.method?.toUpperCase()} ${config.url}`);
				return config;
			},
			(error) => {
				this.logger.error('Request error:', error);
				return Promise.reject(error);
			}
		);

		this.axiosInstance.interceptors.response.use(
			(response) => {
				this.logger.info(`go2rtc response: ${response.status} ${response.statusText}`);
				return response;
			},
			(error) => {
				this.logger.error('Response error:', error.response?.data || error.message);
				return Promise.reject(error);
			}
		);
	}

	/**
	 * Create a new temporary stream for playback
	 * @param streamName - Unique name for the stream
	 * @param rtspUrl - RTSP URL with playback parameters
	 * @returns Promise resolving to stream access URLs
	 */
	async createTemporaryStream(streamName: string, rtspUrl: string): Promise<StreamAccessUrls> {
		try {
			const config: Go2RTCConfig = {
				streams: {
					[streamName]: [rtspUrl]
				}
			};

			await this.axiosInstance.patch('/api/config', config);
			this.logger.info(`Created temporary stream: ${streamName}`);

			// Send restart request after creating the stream
			await this.restartGo2RTC();

			return this.getStreamAccessUrls(streamName);
		} catch (error) {
			this.logger.error('Failed to create temporary stream', {
				streamName,
				error: error instanceof Error ? error.message : String(error)
			});
			throw error;
		}
	}

	/**
	 * Restart go2rtc service
	 * Sends a POST request to /api/restart endpoint
	 */
	async restartGo2RTC(): Promise<void> {
		try {
			await this.axiosInstance.post('/api/restart');
			this.logger.info('go2rtc restart request sent successfully');
		} catch (error) {
			this.logger.error('Failed to restart go2rtc', {
				error: error instanceof Error ? error.message : String(error)
			});
			// Don't throw error here as stream creation was successful
			// Just log the restart failure
		}
	}

	/**
	 * Check if a stream is available in go2rtc
	 * @param streamName - Name of the stream to check
	 * @returns Promise resolving to boolean indicating availability
	 */
	async isStreamAvailable(streamName: string): Promise<boolean> {
		try {
			const response = await this.axiosInstance.get('/api/streams');
			const streams = response.data;

			// Check if the stream exists and is active
			return streams && typeof streams === 'object' && streamName in streams;
		} catch (error) {
			this.logger.error('Failed to check stream availability', {
				streamName,
				error: error instanceof Error ? error.message : String(error)
			});
			return false;
		}
	}

	/**
	 * Get stream access URLs for all supported protocols
	 * @param streamName - Name of the stream
	 * @returns Object containing URLs for different protocols
	 */
	getStreamAccessUrls(streamName: string): StreamAccessUrls {
		const encodedStreamName = encodeURIComponent(streamName);
		return {
			webrtc: `ws://${this.baseUrl.replace('http://', '').replace('https://', '')}/api/ws?src=${encodedStreamName}`,
			hls: `${this.baseUrl}/api/hls?src=${encodedStreamName}`,
			mjpeg: `${this.baseUrl}/api/frame.mjpeg?src=${encodedStreamName}`,
			mp4: `${this.baseUrl}/api/mp4?src=${encodedStreamName}`,
			flv: `${this.baseUrl}/api/flv?src=${encodedStreamName}`,
			rtsp: `rtsp://${this.baseUrl.replace('http://', '').replace('https://', '').replace(/:\d+$/, '')}:${this.rtspPort}/${encodedStreamName}`
		};
	}

	/**
	 * Delete a single stream
	 * @param streamName - Name of stream to delete
	 */
	async deleteStream(streamName: string): Promise<void> {
		try {
			await this.axiosInstance.delete(`/api/streams?src=${encodeURIComponent(streamName)}`);
			this.logger.info(`Deleted stream: ${streamName}`);
		} catch (error) {
			this.logger.error('Failed to delete stream', {
				streamName,
				error: error instanceof Error ? error.message : String(error)
			});
			throw error;
		}
	}

	/**
	 * Delete multiple streams in batch
	 * @param streamNames - Array of stream names to delete
	 */
	async deleteBatchStreams(streamNames: string[]): Promise<void> {
		try {
			const deletePromises = streamNames.map((streamName) =>
				this.axiosInstance.delete(`/api/streams?src=${encodeURIComponent(streamName)}`)
			);

			await Promise.allSettled(deletePromises);
			this.logger.info(`Deleted ${streamNames.length} streams in batch`);
		} catch (error) {
			this.logger.error('Failed to delete batch streams', {
				streamCount: streamNames.length,
				error: error instanceof Error ? error.message : String(error)
			});
			throw error;
		}
	}

	/**
	 * Schedule automatic cleanup of temporary streams
	 * @param streamNames - Array of stream names to cleanup
	 * @param delayMs - Delay in milliseconds before cleanup (default: 30 minutes)
	 */
	scheduleStreamCleanup(streamNames: string[], delayMs: number = 30 * 60 * 1000): void {
		setTimeout(async () => {
			try {
				await this.deleteBatchStreams(streamNames);
				this.logger.info(`Auto-cleaned up ${streamNames.length} temporary streams`);
			} catch (error) {
				this.logger.error('Failed to auto-cleanup streams', {
					streamCount: streamNames.length,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}, delayMs);
	}

	/**
	 * Generate unique stream name for playback sessions
	 * @param prefix - Prefix for the stream name
	 * @param reportId - Optional report ID
	 * @returns Unique stream name
	 */
	generateStreamName(prefix: string = 'playback', reportId?: string): string {
		const timestamp = Date.now();
		return reportId ? `${prefix}_${reportId}_${timestamp}` : `${prefix}_${timestamp}`;
	}
}

// Export singleton instance
export const go2rtcService = new Go2RTCService();

/**
 * Helper function to create playback stream from camera data
 * @param cameraData - Camera configuration data
 * @param startDate - Playback start time
 * @param endDate - Playback end time
 * @param reportId - Optional report ID for stream naming
 * @returns Promise resolving to stream access URLs
 */
export async function createPlaybackStream(
	cameraData: {
		nvr_type: string;
		ip: string;
		username: string;
		password: string;
		nvr: string;
	},
	startDate: Date,
	endDate: Date,
	reportId?: string
): Promise<{ streamName: string; urls: StreamAccessUrls }> {
	// Import the generateRTSPUrl function
	const { generateRTSPUrl } = await import('../tools/camera.tools');

	// Generate RTSP URL with playback parameters
	const rtspUrl = generateRTSPUrl(
		cameraData.nvr_type,
		cameraData.ip,
		cameraData.username,
		cameraData.password,
		cameraData.nvr,
		startDate,
		endDate
	);

	// Create unique stream name
	const streamName = go2rtcService.generateStreamName('playback', reportId);

	// Create the stream in go2rtc
	const urls = await go2rtcService.createTemporaryStream(streamName, rtspUrl);

	// Schedule cleanup after 30 minutes
	go2rtcService.scheduleStreamCleanup([streamName], 30 * 60 * 1000);

	return { streamName, urls };
}
