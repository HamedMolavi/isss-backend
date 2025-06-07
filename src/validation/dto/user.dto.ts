import { IsArray, IsOptional, IsString } from 'class-validator';
import { Schema } from 'mongoose';

export class CreateUserBody {
	@IsString()
	public access_level?: Schema.Types.ObjectId;
	@IsString()
	@IsOptional()
	public role?: string;
	@IsString()
	public username?: string;
	@IsString()
	public password?: string;
	@IsString()
	public phone_number?: string;
	@IsArray()
	@IsOptional()
	public camera_access?: Schema.Types.ObjectId[];
}

export class UpdateUserBody {
	@IsOptional()
	@IsString()
	public access_level?: Schema.Types.ObjectId;
	@IsString()
	@IsOptional()
	public role?: string;
	@IsString()
	@IsOptional()
	public username?: string;
	@IsString()
	@IsOptional()
	public password?: string;
	@IsString()
	@IsOptional()
	public phone_number?: string;
	@IsArray()
	@IsOptional()
	public camera_access?: Schema.Types.ObjectId[];
}

export class UpdatePasswordBody {
	@IsString()
	public current_password?: string;
	@IsString()
	public new_password?: string;
}
