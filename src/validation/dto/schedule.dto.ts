import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional, IsArray, IsNumber } from "class-validator";
import mongoose, { Schema } from "mongoose";


export class CreateScheduleBody {
  @IsString()
  public start?: string;
  @IsString()
  public stop?: string;
  @IsArray()
  public dayOfWeek?: string;
  @IsString()
  public camera_id?: Schema.Types.ObjectId;
  @IsString()
  public model_id?: Schema.Types.ObjectId;
};

export class UpdateScheduleBody {
  @IsOptional()
  @IsString()
  start?: string;
  @IsOptional()
  @IsString()
  stop?: string;
  @IsOptional()
  @IsString()
  model_id?: string;
  @IsOptional()
  @IsString()
  camera_id?: string;
  @IsOptional()
  @IsBoolean()
  montionDetection?: boolean;
  @IsOptional()
  @IsNumber()
  timeDuplicationDiagnoses?: number;
  @IsOptional()
  @IsNumber()
  threshold?: number;
  @IsOptional()
  @IsArray()
  dayOfWeek?: string[];
  @IsOptional()
  @IsArray()
  zones?: [[number, number, number, number]];
  @IsOptional()
  @IsNumber()
  min_people?: number;
  @IsOptional()
  @IsNumber()
  max_people?: number;
};