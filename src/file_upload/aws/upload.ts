import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { v4 } from 'uuid';
import S3Client from '../../config/s3.config';
import { BaseConfig } from '../../config/base.config';
import { Logger } from '../../logger';
import { MAX_UPLOAD_FILE_SIZE_BYTES, MAX_UPLOAD_FILE_SIZE_MB } from '../../config/upload.config';

const configure_limits_and_filter = () => ({
	limits: {
		fileSize: MAX_UPLOAD_FILE_SIZE_BYTES
	},
	fileFilter: (req: any, file: any, callback: any) => {
		// Only validate file type, not size (size is handled by limits.fileSize)
		const isImage = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'].includes(file.mimetype);
		const isVideo = file.mimetype === 'video/mp4';
		const isAudio = ['audio/aac', 'audio/mp3', 'audio/mpeg'].includes(file.mimetype);

		if (isImage || isVideo || isAudio) {
			callback(null, true);
		} else {
			callback(
				new Error(
					`Invalid file type: ${file.mimetype}. Only images, videos, and audio files up to ${MAX_UPLOAD_FILE_SIZE_MB}MB are allowed.`
				)
			);
		}
	}
});

/**
 * File upload with support for different image categories
 * @param folder - Optional folder name: 'crop', 'frame', 'inner_crop' (default: root of images/)
 */
export const file_upload = (folder?: 'crop' | 'frame' | 'inner_crop' | 'personnel') => {
	try {
		return multer({
			storage: multerS3({
				s3: S3Client.instance(),
				bucket: BaseConfig.BUCKET_NAME,
				metadata: (req, file, cb) => {
					cb(null, { fieldName: file.fieldname });
				},
				acl: 'public-read',
				cacheControl: 'max-age=31536000',
				key: (req, file, cb) => {
					const ext = path.extname(file.originalname);
					const fileName = `${v4()}${ext}`;

					// Build path: images/{folder}/{filename} or images/{filename}
					const filePath = folder ? `images/${folder}/${fileName}` : `images/${fileName}`;

					cb(null, filePath);
				},
				contentType: multerS3.AUTO_CONTENT_TYPE
			}),
			...configure_limits_and_filter()
		});
	} catch (e) {
		Logger.error('Error in file_upload', {
			error: e instanceof Error ? e.message : String(e)
		});
		return multer({ limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES } });
	}
};
