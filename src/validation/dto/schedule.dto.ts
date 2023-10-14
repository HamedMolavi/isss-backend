import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional, IsArray, IsNumber } from "class-validator";
import mongoose, { Schema } from "mongoose";


export class CreateScheduleBody {
  @IsString()
  public start?: string;
  @IsString()
  public stop?: string;
  @IsString()
  public dayOfWeek?: string;
  @IsString()
  public camera_id?: Schema.Types.ObjectId;
  @IsString()
  public model_id?: Schema.Types.ObjectId;
  @IsBoolean()
  public montionDetection?: boolean;
  @IsOptional()
  public threshold?: number;
  @IsArray()
  public zones?: Array<number>;
  @IsNumber()
  public min_people?: number;
  @IsNumber()
  public max_people?: number;
  @IsNumber()
  public timeDuplicationDiagnoses?: number;
};
