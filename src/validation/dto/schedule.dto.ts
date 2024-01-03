import { Type } from "class-transformer";
import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional, IsArray, IsNumber, IsObject, ValidateNested, IsNotEmpty, ArrayNotEmpty } from "class-validator";
import mongoose, { Schema } from "mongoose";

class LogConfig {
  @IsString()
  public log_type?: Schema.Types.ObjectId
  @IsString()
  public log_name?: Schema.Types.ObjectId
  @IsString()
  public log_level?: string
}
class Operation {
  @IsOptional()
  @IsNumber()
  public timeDuplicationDiagnoses?: number;
  @IsOptional()
  @IsNumber()
  public threshold?: number;
  @IsOptional()
  @IsNumber()
  public min_people?: number;
  @IsOptional()
  @IsNumber()
  public max_people?: number;
  @IsOptional()
  @IsArray()
  public zone?: [number, number, number, number] | [];
  // @Type(() => LogConfig)
  @ArrayNotEmpty()
  @IsArray()
  // @ValidateNested({each: true})
  public logs?: LogConfig[]
}
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
  // @Type(() => Operation)
  @IsArray()
  // @ValidateNested()
  public operations?: Operation[]
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
