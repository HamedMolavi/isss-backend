import { IsString, IsDefined, IsOptional } from 'class-validator';

/**
 * DTO for uploading image with buffer data
 * Client should send multipart/form-data with image file
 */
export class UploadImageDto {
	@IsString()
	@IsDefined({ message: 'person_id is required' })
	public person_id!: string;

	@IsString()
	@IsOptional()
	public folder?: string;

	// Note: Image file will be validated via multer middleware
	// The buffer will be accessed through req.file.buffer
}

/**
 * DTO for uploading avatar with personnel data
 */
export class UploadPersonnelAvatarDto {
	@IsString()
	@IsDefined({ message: 'personnel_id is required' })
	public personnel_id!: string;

	// Note: Image file will be validated via multer middleware
	// The buffer will be accessed through req.file.buffer
}
