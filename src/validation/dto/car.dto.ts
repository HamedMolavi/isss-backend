import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsArray, IsOptional, IsObject } from "class-validator";
import mongoose, { Schema } from "mongoose";


export class CreateCarBody {
  @IsString()
  public owner?: mongoose.Types.ObjectId;
  public number_plate?: string;
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
};

export class CameraInfoBody {
  @IsString()
  public ip?: mongoose.Types.ObjectId;
  @IsString()
  public username?: string;
  @IsString()
  public password?: string;
};