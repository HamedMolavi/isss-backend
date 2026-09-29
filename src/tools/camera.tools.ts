import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ICameraInfo } from '../types/interfaces/camera.interface';
import { ApiError } from '../types/classes/error.class';
import { getStreamUriStrategy } from '../types/classes/camera.class';
import { cameraInfo } from './takeSnaphsot';
import axios from 'axios';
import { CameraInfoBody } from '../validation/dto/camera.dto';
import { isValidRtspUrl } from '../validation/rtsp-url.validation';

export function getStreamUri(camInfo: ICameraInfo): RequestHandler {
	// TODO: update link stream fetching mechanism
	return async function middleware(req: Request, res: Response, next: NextFunction): Promise<void> {
		// setting up camInfo based on body
		for (const key in camInfo)
			if (Object.prototype.hasOwnProperty.call(req.body, key)) camInfo[key] = req.body[key];
		let uri: string | undefined = await new getStreamUriStrategy({
			zeros: req.body['url'],
			first: camInfo,
			second: camInfo.nvr,
			error: next
		}).do();
		if (!!uri && isValidRtspUrl(uri)) {
			req.body.url = uri;
			next();
		} else {
			req.flash('error', 'valid rtsp link not found');
			return next(new ApiError(400, 'valid rtsp link not found'));
		}
	};
}

// TODO: clean this up as above
const onvif = require('node-onvif');
async function oldGetStreamUri(camInfo: cameraInfo): Promise<string | undefined> {
	try {
		if (!camInfo.ip || !camInfo.username || !camInfo.password || !camInfo.nvr) {
			return; // input verify
		}
		//create new device for camera on type onvif
		var device = new onvif.OnvifDevice({
			xaddr: 'http://' + camInfo.ip + ':80/onvif/device_service',
			user: camInfo.username,
			pass: camInfo.password
		});
		await device.init(); //initial device
		let url: string = device.getUdpStreamUrl();
		url = url.replace(
			/\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
			'{username}:{password}@{ip}'
		);
		return url;
	} catch (error) {
		const SAMPLE_STREAM_URI = process.env['SAMPLE_STREAM_URI'];
		const WORD_BEFORE_REPLACE_STREAM = process.env['WORD_BEFORE_REPLACE_STREAM'] ?? 'c';
		const WORD_AFTER_REPLACE_STREAM = process.env['WORD_AFTER_REPLACE_STREAM'] ?? 'c1';
		let url_nvr = SAMPLE_STREAM_URI?.replace(
			/\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
			'{username}:{password}@{ip}'
		);
		url_nvr = url_nvr?.replace(WORD_BEFORE_REPLACE_STREAM, WORD_AFTER_REPLACE_STREAM + camInfo.nvr);
		return url_nvr;
	}
}

async function testCamera(cam: CameraInfoBody, streamUri: string) {
	//send request to back RTSPtoWEBRTC api for send ip and get id
	const response = await axios.post(
		process.env['WEB_STREAM'],
		{
			ip: cam.ip,
			username: cam.username,
			password: cam.password,
			url: streamUri
		},
		{
			headers: {
				'Content-Type': 'application/json'
			}
		}
	);
	if (response.status === 200 && response.data != '') {
		//send response to client with camera
		return {
			success: true,
			data: response.data
		};
	} else {
		//send response to client with camera
		return {
			success: false,
			data: 'Not Found'
		};
	}
}

export async function testCameraMiddleware(req: Request, res: Response, next: NextFunction) {
	try {
		//get jason from body request
		let cam_test = req.body; //cameraInfo
		let stream_uri: string = '';
		if (!cam_test.url) {
			//get live stream uri(rtsp link from camera)
			stream_uri = (await oldGetStreamUri(cam_test)) || '';
			if (!stream_uri) {
				req.flash('error', 'rtsp link not found');
				return next(new ApiError(400, 'rtsp link not found'));
			}
		} else {
			stream_uri = cam_test.url;
		}

		if (!isValidRtspUrl(stream_uri)) {
			req.flash('error', 'valid rtsp link not found');
			return next(new ApiError(400, 'valid rtsp link not found'));
		}

		const result = await testCamera(cam_test, stream_uri);
		return res.status(!!result.success ? 200 : 404).json(result);
	} catch (err: any) {
		return next(new ApiError(500, 'internal server error , ' + err.message));
	}
}

/**
 * Generate RTSP URL based on NVR type and parameters
 * @param nvrType - Type of NVR (hikvision, dahua, etc.)
 * @param ip - IP address of the camera/NVR
 * @param username - Username for authentication
 * @param password - Password for authentication
 * @param nvr - NVR/channel number
 * @param startDate - Start date for playback (optional)
 * @param endDate - End date for playback (optional)
 * @returns RTSP URL string
 */
export function generateRTSPUrl(
	nvrType: string,
	ip: string,
	username: string,
	password: string,
	nvr: string,
	startDate?: Date,
	endDate?: Date
): string {
	const port = 554; // Default RTSP port
	const channel = nvr || 1;

	// Format dates if provided (for playback)
	let timeParams = '';
	if (startDate && endDate) {
		const startTime = formatDateToRTSP(startDate);
		const endTime = formatDateToRTSP(endDate);
		timeParams = `?starttime=${startTime}&endtime=${endTime}`;
	}

	switch (nvrType.toLowerCase()) {
		case 'hikvision': {
			if (startDate && endDate) {
				// Playback URL

				return `rtsp://${username}:${password}@${ip}:${port}/Streaming/tracks/${channel}${timeParams}`;
			} else {
				// Live stream URL

				return `rtsp://${username}:${password}@${ip}:${port}/Streaming/Channels/${channel}`;
			}
		}

		case 'dahua':
			if (startDate && endDate) {
				return `rtsp://${username}:${password}@${ip}:${port}/cam/playback?channel=${channel}&subtype=0&starttime=${formatDateToRTSP(startDate)}&endtime=${formatDateToRTSP(endDate)}`;
			} else {
				return `rtsp://${username}:${password}@${ip}:${port}/cam/realmonitor?channel=${channel}&subtype=0`;
			}

		default:
			// Generic RTSP format
			if (startDate && endDate) {
				return `rtsp://${username}:${password}@${ip}:${port}/playback/stream${channel}${timeParams}`;
			} else {
				return `rtsp://${username}:${password}@${ip}:${port}/stream${channel}`;
			}
	}
}

/**
 * Format date to RTSP time format (YYYYMMDDTHHMMSSZ)
 * @param date - Date object
 * @returns Formatted time string
 */
function formatDateToRTSP(date: Date): string {
	const year = date.getUTCFullYear();
	const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
	const day = date.getUTCDate().toString().padStart(2, '0');
	const hour = date.getUTCHours().toString().padStart(2, '0');
	const minute = date.getUTCMinutes().toString().padStart(2, '0');
	const second = date.getUTCSeconds().toString().padStart(2, '0');

	return `${year}${month}${day}T${hour}${minute}${second}Z`;
}
