import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional, IsArray, IsNumber, IsObject, Validate, validateOrReject } from "class-validator";
import mongoose, { Schema } from "mongoose";
import { Comparison, CountLicenseRestricion } from ".";
import Schedule from "../../db/mongo/models/schedule";
import Model from "../../db/mongo/models/model";
import ModelToCamera from "../../db/mongo/models/modelToCamera";
import { readById } from "../../db/mongo/read.database";


export class CreateScheduleBody {
  @Validate(CountLicenseRestricion, [{
    model: Schedule,
    env: async (object: any) => "MAX_" + (await readById(Model, object.model_id)).category.toUpperCase() + "S",
    pipelines: async (object: any) => [
      'model_camera_id',
      'model_camera_id.model_id',
      { 'model_camera_id.model_id.category': (await readById(Model, object.model_id)).category }
    ]
  }])
  @Validate(Comparison, ["gte", 0])
  @Validate(Comparison, ["lse", 100])
  @IsNumber()
  threshold?: number
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
  @IsString()
  public description?: string;
  @IsArray()
  public users_alert?: Array<Schema.Types.ObjectId>;
  @IsObject()
  public sms?: object;
  @IsObject()
  public alert?: object;
  @IsBoolean()
  @IsOptional()
  public justHuman?: boolean;
  @IsBoolean()
  @IsOptional()
  public with_full_frame?: boolean;
  @IsBoolean()
  @IsOptional()
  public update_full_frame?: boolean;
  @IsString()
  public state?: string;
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
	@Validate(Comparison, ['gte', 0])
	@Validate(Comparison, ['lse', 100])
	@IsNumber()
	threshold?: number;
	@IsOptional()
	@IsArray()
	dayOfWeek?: string[];
	@IsOptional()
	@IsArray()
	zones?: Array<[[number, number], [number, number], [number, number], [number, number]]>;
	@IsOptional()
	@IsNumber()
	min_people?: number;
	@IsOptional()
	@IsNumber()
	max_people?: number;
	@IsOptional()
	@IsString()
	public description?: string;
	@IsOptional()
	@IsArray()
	public users_alert?: Array<Schema.Types.ObjectId>;
	@IsOptional()
	public sms?: object;
	@IsOptional()
	public alert?: object;
	@IsBoolean()
	@IsOptional()
	public justHuman?: boolean;
	@IsString()
	public state?: string;
	@IsBoolean()
	@IsOptional()
	public with_full_frame?: boolean;
	@IsBoolean()
	@IsOptional()
	public update_full_frame?: boolean;
}

export class UpdateActiveScheduleBody {
	@IsOptional()
	public sms?: object;
	@IsOptional()
	public alert?: object;
	@IsArray()
	public schedules?: Array<Schema.Types.ObjectId>;
	// @IsString()
	// public state?: string;
}
