import {
	IsArray,
	IsOptional,
	IsString,
	IsBoolean,
	IsMongoId,
	IsDefined,
	MaxLength,
	MinLength,
	IsNotEmpty
} from 'class-validator';
import { Schema } from 'mongoose';

export class CreateUserBody {
	@IsOptional()
	@IsMongoId({ message: 'Access level id must be a valid Mongo id' })
	public access_level?: Schema.Types.ObjectId;

	@IsOptional()
	@IsString({ message: 'Role must be a string' })
	@MaxLength(100, { message: 'Role is too long' })
	public role?: string;

	@IsDefined({ message: 'Username is required' })
	@IsString({ message: 'Username must be a string' })
	@IsNotEmpty({ message: 'Username cannot be empty' })
	@MinLength(1, { message: 'Username is too short' })
	@MaxLength(100, { message: 'Username is too long' })
	public username!: string;

	@IsDefined({ message: 'Password is required' })
	@IsString({ message: 'Password must be a string' })
	@IsNotEmpty({ message: 'Password cannot be empty' })
	@MinLength(8, { message: 'Password is too short' })
	@MaxLength(128, { message: 'Password is too long' })
	public password!: string;

	@IsOptional()
	@IsString({ message: 'Phone number must be a string' })
	@MaxLength(32, { message: 'Phone number is too long' })
	public phone_number?: string;

	@IsOptional()
	@IsArray({ message: 'Camera access must be an array' })
	@IsMongoId({ each: true, message: 'Camera access ids must be valid Mongo ids' })
	public camera_access?: Schema.Types.ObjectId[];

	@IsOptional()
	@IsBoolean({ message: 'is_active must be a boolean' })
	public is_active?: boolean;
}

export class UpdateUserBody {
	@IsOptional()
	@IsMongoId({ message: 'Access level id must be a valid Mongo id' })
	public access_level?: Schema.Types.ObjectId;

	@IsOptional()
	@IsString({ message: 'Role must be a string' })
	@MaxLength(100, { message: 'Role is too long' })
	public role?: string;

	@IsOptional()
	@IsString({ message: 'Username must be a string' })
	@IsNotEmpty({ message: 'Username cannot be empty' })
	@MinLength(1, { message: 'Username is too short' })
	@MaxLength(100, { message: 'Username is too long' })
	public username?: string;

	@IsOptional()
	@IsString({ message: 'Password must be a string' })
	@IsNotEmpty({ message: 'Password cannot be empty' })
	@MinLength(8, { message: 'Password is too short' })
	@MaxLength(128, { message: 'Password is too long' })
	public password?: string;

	@IsOptional()
	@IsString({ message: 'Phone number must be a string' })
	@MaxLength(32, { message: 'Phone number is too long' })
	public phone_number?: string;

	@IsOptional()
	@IsArray({ message: 'Camera access must be an array' })
	@IsMongoId({ each: true, message: 'Camera access ids must be valid Mongo ids' })
	public camera_access?: Schema.Types.ObjectId[];

	@IsOptional()
	@IsBoolean({ message: 'is_active must be a boolean' })
	public is_active?: boolean;
}

export class UpdatePasswordBody {
	@IsDefined({ message: 'Current password is required' })
	@IsString({ message: 'Current password must be a string' })
	@IsNotEmpty({ message: 'Current password cannot be empty' })
	@MinLength(8, { message: 'Current password is too short' })
	@MaxLength(128, { message: 'Current password is too long' })
	public current_password!: string;

	@IsDefined({ message: 'New password is required' })
	@IsString({ message: 'New password must be a string' })
	@IsNotEmpty({ message: 'New password cannot be empty' })
	@MinLength(8, { message: 'New password is too short' })
	@MaxLength(128, { message: 'New password is too long' })
	public new_password!: string;
}

export class ResetPasswordBody {
	@IsDefined({ message: 'New password is required' })
	@IsString({ message: 'New password must be a string' })
	@IsNotEmpty({ message: 'New password cannot be empty' })
	@MinLength(8, { message: 'New password is too short' })
	@MaxLength(128, { message: 'New password is too long' })
	public new_password!: string;
}
