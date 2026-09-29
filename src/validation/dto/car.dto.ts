import {
	IsEmail,
	IsString,
	IsDefined,
	MinLength,
	IsBoolean,
	IsArray,
	IsOptional,
	IsObject,
	Validate
} from 'class-validator';
import mongoose, { Schema } from 'mongoose';
import { IsPlateNumber } from '../plate.validation';

export class CreateCarBody {
	@IsString()
	public owner?: mongoose.Types.ObjectId;
	@IsDefined()
	@IsObject()
	@Validate(IsPlateNumber)
	public number_plate?: {
		first: string | number;
		second: string;
		third: string | number;
		fourth: string;
		fifth: string | number;
	};
	@IsString()
	public brand?: mongoose.Types.ObjectId;
	@IsString()
	public color?: mongoose.Types.ObjectId;
	@IsOptional()
	@IsArray()
	public camera_whitelist?: string[];
	@IsOptional()
	@IsArray()
	public section_whitelist?: string[];
	@IsOptional()
	@IsArray()
	public schedule_whitelist?: string[];
	@IsOptional()
	@IsArray()
	public department_whitelist?: string[];
	@IsOptional()
	@IsBoolean()
	public tracked?: boolean;
	@IsOptional()
	@IsObject()
	allowed_pass?: {
		start?: number;
		end?: number;
	};
}

export class CameraInfoBody {
	@IsString()
	public ip?: mongoose.Types.ObjectId;
	@IsString()
	public username?: string;
	@IsString()
	public password?: string;
}
