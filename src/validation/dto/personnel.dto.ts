import { Type } from "class-transformer";
import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional, IsArray, ValidateNested, IsNumber, IsObject, Validate } from "class-validator";
import mongoose from "mongoose";
import { EndgtrStartValidator, TimeAndDateValidator } from "../time";

export class CreatePersonnelBody {
  @IsString()
  public first_name?: string;
  @IsString()
  public last_name?: string;
  @IsString()
  public national_code?: string;
  @IsEmail()
  @IsOptional()
  @IsString()
  public email?: string;
  @IsString()
  public phone_number?: string;
  @IsOptional()
  public job_id?: mongoose.Types.ObjectId;
  @IsOptional()
  public section_id?: mongoose.Types.ObjectId;
  @IsBoolean()
  @IsOptional()
  public tracked?: boolean;
  @IsString()
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