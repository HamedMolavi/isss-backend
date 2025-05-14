import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional, NotContains, Validate } from "class-validator";
import mongoose, { Schema } from "mongoose";
import { CountLicenseRestricion } from ".";
import Camera from "../../db/mongo/models/camera";


export class CreateCameraBody {
  @Validate(CountLicenseRestricion, [{ model: Camera, env: "MAX_CAMERAS", default: 4 }])
  public _?: any;
  public section_id?: mongoose.Types.ObjectId;
  @IsString()
  public network?: string;
  @IsString()
  public nvr?: string;
  @IsString()
  @NotContains(" ")
  public ip?: string;
  @IsString()
  public name?: string;
  @IsOptional()
  @IsString()
  @NotContains(" ")
  public url?: string;
  @IsString()
  @NotContains(" ")
  public username?: string;
  @IsString()
  @NotContains(" ")
  public password?: string;
  @IsOptional()
  @IsBoolean()
  public is_enabled?: boolean;
  @IsOptional()
  @IsString()
  public camera_type?: any; // CameraTypes
};

export class UpdateCameraBody {
  @IsOptional()
  public section_id?: mongoose.Types.ObjectId;
  @IsOptional()
  @IsString()
  public network?: string;
  @IsOptional()
  @IsString()
  public nvr?: string;
  @IsOptional()
  @IsString()
  public ip?: string;
  @IsOptional()
  @IsString()
  public url?: string;
  @IsOptional()
  @IsString()
  public name?: string;
  @IsOptional()
  @IsString()
  public username?: string;
  @IsOptional()
  @IsString()
  public password?: string;
  @IsOptional()
  @IsBoolean()
  public is_enabled?: boolean;
  @IsOptional()
  @IsBoolean()
  public damaged?: boolean;
  @IsOptional()
  @IsString()
  public camera_type?: any; // CameraTypes
};

export class CameraInfoBody {
  @IsString()
  public ip?: mongoose.Types.ObjectId;
  @IsString()
  public username?: string;
  @IsString()
  public password?: string;
  @IsString()
  public url?: string;
};