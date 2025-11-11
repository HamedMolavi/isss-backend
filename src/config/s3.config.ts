import { S3 } from '@aws-sdk/client-s3';
import { Logger } from '../logger';

class S3Client {
	private static _instance: S3;

	private constructor() {
		try {
			const accessKeyId = process.env.MINIO_ROOT_USER;
			const secretAccessKey = process.env.MINIO_ROOT_PASSWORD;
			const endpoint = process.env.MINIO_ENDPOINT;

			if (!accessKeyId || !secretAccessKey || !endpoint) {
				throw new Error(
					'Missing required MinIO environment variables: MINIO_ROOT_USER, MINIO_ROOT_PASSWORD, MINIO_ENDPOINT'
				);
			}

			S3Client._instance = new S3({
				credentials: {
					accessKeyId,
					secretAccessKey
				},
				region: 'default',
				forcePathStyle: true,
				endpoint
			});

			Logger.info(' minio client connected');
		} catch (e) {
			Logger.error('error in MinioClient', {
				error: e instanceof Error ? e.message : String(e)
			});
		}
	}

	public static instance(): S3 {
		if (!S3Client._instance) {
			new S3Client();
		}

		return S3Client._instance;
	}
}

export default S3Client;
