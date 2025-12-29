import {
	IsEmail,
	IsString,
	IsDefined,
	MinLength,
	IsBoolean,
	IsArray,
	IsOptional,
	IsEnum
} from 'class-validator';
import mongoose, { Schema } from 'mongoose';

export enum CarType {
	SUV = 'suv',
	BUS = 'bus',
	TRUCK = 'truck',
	UNKNOWN = 'unknown'
}

export class CreateCarBrandBody {
	@IsString()
	name?: string;

	@IsEnum(CarType)
	@IsOptional()
	car_type?: CarType;
}

export class UpdateCarBrandBody {
	@IsString()
	@IsOptional()
	name?: string;

	@IsEnum(CarType)
	@IsOptional()
	car_type?: CarType;
}
