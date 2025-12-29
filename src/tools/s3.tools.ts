import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import S3Client from '../config/s3.config';
import { BaseConfig } from '../config/base.config';

/**
 * Download a file from S3 and convert it to base64
 * @param fileKey - The S3 file key (e.g., "images/personnel/uuid.jpeg")
 * @returns Base64 encoded string of the file content
 */
export const downloadS3FileAsBase64 = async (fileKey: string): Promise<string> => {
	const command = new GetObjectCommand({
		Bucket: BaseConfig.BUCKET_NAME,
		Key: fileKey
	});

	const response = await S3Client.instance().send(command);

	if (!response.Body) {
		throw new Error('Failed to download file from S3');
	}

	// Convert stream to buffer
	const stream = response.Body as Readable;
	const chunks: Uint8Array[] = [];

	for await (const chunk of stream) {
		chunks.push(chunk);
	}

	const buffer = Buffer.concat(chunks);
	return buffer.toString('base64');
};

/**
 * Construct S3 URL from file key
 * @param fileKey - The S3 file key
 * @returns Full S3 URL
 */
export const getFileUrl = (fileKey: string): string => {
	return `${BaseConfig.BUCKET_NAME}/${fileKey}`;
};
