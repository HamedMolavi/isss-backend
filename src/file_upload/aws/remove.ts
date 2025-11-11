import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import S3Client from '../../config/s3.config';
import { Logger } from '../../logger';
import { BaseConfig } from '../../config/base.config';

export const remove_file = async (file_key: string) => {
	try {
		const params = {
			Bucket: BaseConfig.BUCKET_NAME,
			Key: file_key
		};
		const command = new DeleteObjectCommand(params);
		return await S3Client.instance().send(command);
	} catch (e) {
		Logger.error('Error in file_upload', {
			error: e instanceof Error ? e.message : String(e)
		});
		return null;
	}
};
