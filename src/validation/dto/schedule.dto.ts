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
  @Type(() => LogConfig)
  @ValidateNested({each: true})
  @ArrayNotEmpty()
  @IsArray()
  public logs?: LogConfig[]
}
export class CreateScheduleBody {
  @IsString()
  public start?: string;
  @IsString()
  public stop?: string;
  @IsArray()
  public dayOfWeek?: string[];
  @IsString()
  public camera_id?: Schema.Types.ObjectId;
  @IsString()
  public model_id?: Schema.Types.ObjectId;
  @Type(() => Operation)
  @ValidateNested({each: true})
  @IsArray()
  public operations?: Operation[]
};


export class UpdateScheduleBody {
  @IsOptional()
  @IsString()
  public start?: string;
  @IsOptional()
  @IsString()
  public stop?: string;
  @IsOptional()
  @IsArray()
  public dayOfWeek?: string;
  @IsOptional()
  @IsString()
  public camera_id?: Schema.Types.ObjectId;
  @IsOptional()
  @IsString()
  public model_id?: Schema.Types.ObjectId;
  @IsOptional()
  // @Type(() => Operation)
  @IsArray()
  // @ValidateNested()
  public operations?: Operation[]
};
