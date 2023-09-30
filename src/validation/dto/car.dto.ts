import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsArray, IsOptional } from "class-validator";
import mongoose, { Schema } from "mongoose";


export class CreateCarBody {
  @IsString()
  public owner?: mongoose.Types.ObjectId;
  public number_plate?: {
    "first": number,
    "second": string,
    "third": number,
    "fourth": string,
    "fifth": number
  };
  @IsString()
  public brand?: mongoose.Types.ObjectId;
  @IsString()
  public color?: mongoose.Types.ObjectId;
  @IsArray()
  public camera_whitelist?: string[];
  @IsOptional()
  @IsBoolean()
  public tracked?: boolean;
};

export class CameraInfoBody {
  @IsString()
  public ip?: mongoose.Types.ObjectId;
  @IsString()
  public username?: string;
  @IsString()
  public password?: string;
};