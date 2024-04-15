import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional, NotContains } from "class-validator";
import mongoose, { Schema } from "mongoose";


export class CreateCameraBody {
  public section_id?: mongoose.Types.ObjectId;
  @IsString()
  public network?: string;
  @IsString()
  public nvr?: string;
  @IsString()
  @NotContains(" ")
  @NotContains("_")
  public ip?: string;
  @IsString()
  public name?: string;
  @IsOptional()
  @IsString()
  @NotContains(" ")
  @NotContains("_")
  public url?: string;
  @IsString()
  @NotContains(" ")
  @NotContains("_")
  public username?: string;
  @IsString()
  @NotContains(" ")
  @NotContains("_")
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