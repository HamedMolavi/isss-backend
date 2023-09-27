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
  @IsString()
  public email?: string;
  @IsString()
  public phone_number?: string;
  @IsOptional()
  public job_id?: mongoose.Types.ObjectId | undefined;
  @IsOptional()
  public section_id?: mongoose.Types.ObjectId | undefined;
  @IsBoolean()
  public tracked?: boolean;
  @IsString()
  public personnel_code?: string;
  @IsArray()
  public camera_whitelist?: string[];
  @IsBoolean()
  public is_active?: boolean;
  @IsBoolean()
  public is_employee?: boolean;
  @IsBoolean()
  public is_dismissed?: boolean;
};