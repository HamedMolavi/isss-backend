import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional, IsArray } from "class-validator";
import mongoose from "mongoose";


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
};