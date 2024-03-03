import { Type } from "class-transformer";
import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional, IsArray, ValidateNested, IsNumber, IsObject, Validate, IsEmpty, isEmpty, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from "class-validator";
import mongoose from "mongoose";
import { EndgtrStartValidator, TimeAndDateValidator } from "../time";



@ValidatorConstraint({ name: 'customEmail', async: false })
export class CustomEmailValidator implements ValidatorConstraintInterface {
    validate(email: string, args: ValidationArguments) {
        // Allow empty strings
        if (email === '') {
            return true;
        }
        // Use regex or a library to validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    defaultMessage(args: ValidationArguments) {
        return 'email must be a valid email format or an empty string';
    }
}



export class CreatePersonnelBody {
  @IsString()
  public first_name?: string;
  @IsString()
  public last_name?: string;
  @IsString()
  public national_code?: string;
  @Validate(CustomEmailValidator)
  @IsOptional()
  public email?: string |  null
  @IsString()
  public phone_number?: string| null;
  @IsOptional()
  public job_id?: mongoose.Types.ObjectId;
  @IsOptional()
  public section_id?: mongoose.Types.ObjectId| null;
  @IsBoolean()
  @IsOptional()
  public tracked?: boolean| null;
  @IsString()
  public personnel_code?: string| null;
  @IsArray()
  @IsOptional()
  public camera_whitelist?: string[]| null;
  @IsArray()
  @IsOptional()
  public department_whitelist?: string[]| null;
  @IsArray()
  @IsOptional()
  public section_whitelist?: string[]| null;
  @IsArray()
  @IsOptional()
  public schedule_whitelist?: string[]| null;
  @IsBoolean()
  public is_active?: boolean| null;
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
};

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
  @IsEmail()
  @IsString()
  @IsOptional()
  public email?: string;
  @IsString()
  @IsOptional()
  public phone_number?: string;
  @IsOptional()
  public job_id?: mongoose.Types.ObjectId;
  @IsOptional()
  public section_id?: mongoose.Types.ObjectId;
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
  @IsBoolean()
  @IsOptional()
  public is_active?: boolean;
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
};