export const MAX_UPLOAD_FILE_SIZE_MB = 15;
export const MAX_UPLOAD_FILE_SIZE_BYTES = MAX_UPLOAD_FILE_SIZE_MB * 1024 * 1024;
export const MAX_UPLOAD_BODY_SIZE = `${MAX_UPLOAD_FILE_SIZE_MB}mb`;

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const IMAGE_UPLOAD_POLICY = {
	maxFileSizeMB: MAX_UPLOAD_FILE_SIZE_MB,
	maxFileSizeBytes: MAX_UPLOAD_FILE_SIZE_BYTES,
	allowedMimeTypes: [...ALLOWED_IMAGE_MIME_TYPES],
	allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
	fieldNames: {
		single: 'image',
		multiple: 'images'
	},
	rules: [
		`حداکثر حجم مجاز برای هر فایل ${MAX_UPLOAD_FILE_SIZE_MB} مگابایت است.`,
		'فرمت‌های مجاز تصویر JPG، JPEG، PNG و WEBP هستند.',
		'نوع فایل براساس محتوای واقعی آن بررسی می‌شود؛ تغییر پسوند فایل قابل قبول نیست.',
		'فایل باید از طریق multipart/form-data ارسال شود.'
	]
} as const;
