import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional } from "class-validator";
import mongoose, { Schema } from "mongoose";


export class CreateCameraBody {
  public section_id?: mongoose.Types.ObjectId;
  @IsString()
  public network?: string;
  @IsString()
  public nvr?: string;
  @IsString()
  public ip?: string;
  @IsString()
  public name?: string;
  @IsString()
  public username?: string;
  @IsString()
  public password?: string;
  @IsOptional()
  public is_enabled?: boolean;
  @IsOptional()
  public camera_type?: any; // CameraTypes
};

export class CameraInfoBody {
  @IsString()
  public ip?: mongoose.Types.ObjectId;
  @IsString()
  public username?: string;
  @IsString()
  public password?: string;
};