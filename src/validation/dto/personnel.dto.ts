import {
	IsString,
	IsBoolean,
	IsOptional,
	IsArray,
	Validate,
	ValidatorConstraint,
	ValidatorConstraintInterface,
	IsDefined
} from 'class-validator';
import mongoose from 'mongoose';
import { EndgtrStartValidator, TimeAndDateValidator } from '.';

@ValidatorConstraint({ name: 'customEmail', async: false })
export class CustomEmailValidator implements ValidatorConstraintInterface {
	validate(email: string) {
		// Allow empty strings
		if (email === '') {
			return true;
		}
		// Use regex or a library to validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	defaultMessage() {
		return 'email must be a valid email format or an empty string';
	}
}

@ValidatorConstraint({ name: 'customObjectId', async: false })
export class CustomObjectIdValidator implements ValidatorConstraintInterface {
	validate(value: string) {
		// Allow empty strings (will be converted to null by model)
		if (value === '') {
			return true;
		}
		// Validate ObjectId format
		return mongoose.Types.ObjectId.isValid(value);
	}

	defaultMessage() {
		return 'must be a valid ObjectId or an empty string';
	}
}

export class CreatePersonnelBody {
	@IsString()
	@IsOptional()
	public first_name?: string;

	@IsString()
	@IsOptional()
	public last_name?: string;

	@IsString()
	@IsOptional()
	public national_code?: string;

	@Validate(CustomEmailValidator)
	@IsOptional()
	public email?: string;

	@IsString()
	@IsOptional()
	public phone_number?: string;

	@Validate(CustomObjectIdValidator)
	@IsOptional()
	public job_id?: string;

	@IsBoolean()
	@IsOptional()
	public tracked?: boolean;

	@IsString()
	@IsDefined({ message: 'personnel_code is needed' })
	public personnel_code?: string;

	@IsArray()
	@IsOptional()
	public camera_whitelist?: string[];

	@IsArray()
	@IsOptional()
	public department_whitelist?: string[];

	@IsArray()
	@IsOptional()
	public section_whitelist?: string[];

	@IsArray()
	@IsOptional()
	public schedule_whitelist?: string[];

	@IsBoolean()
	@IsOptional()
	public alert?: boolean;

	@Validate(EndgtrStartValidator)
	@Validate(TimeAndDateValidator, ['date_start'])
	@IsString()
	@IsOptional()
	time_start?: string;

	@Validate(TimeAndDateValidator, ['time_start'])
	@IsString()
	@IsOptional()
	date_start?: string;

	@Validate(EndgtrStartValidator)
	@Validate(TimeAndDateValidator, ['date_end'])
	@IsString()
	@IsOptional()
	time_end?: string;

	@Validate(TimeAndDateValidator, ['time_end'])
	@IsString()
	@IsOptional()
	date_end?: string;
}

export class UpdatePersonnelBody {
	@IsString()
	@IsOptional()
	public first_name?: string;

	@IsString()
	@IsOptional()
	public last_name?: string;

	@IsString()
	@IsOptional()
	public national_code?: string;

	@Validate(CustomEmailValidator)
	@IsOptional()
	public email?: string;

	@IsString()
	@IsOptional()
	public phone_number?: string;

	@Validate(CustomObjectIdValidator)
	@IsOptional()
	public job_id?: string;

	@IsBoolean()
	@IsOptional()
	public tracked?: boolean;

	@IsString()
	@IsOptional()
	public personnel_code?: string;

	@IsArray()
	@IsOptional()
	public camera_whitelist?: string[];

	@IsArray()
	@IsOptional()
	public department_whitelist?: string[];

	@IsArray()
	@IsOptional()
	public section_whitelist?: string[];

	@IsArray()
	@IsOptional()
	public schedule_whitelist?: string[];

	@Validate(EndgtrStartValidator)
	@Validate(TimeAndDateValidator, ['date_start'])
	@IsString()
	@IsOptional()
	time_start?: string;

	@Validate(TimeAndDateValidator, ['time_start'])
	@IsString()
	@IsOptional()
	date_start?: string;

	@Validate(EndgtrStartValidator)
	@Validate(TimeAndDateValidator, ['date_end'])
	@IsString()
	@IsOptional()
	time_end?: string;

	@Validate(TimeAndDateValidator, ['time_end'])
	@IsString()
	@IsOptional()
	date_end?: string;
}
