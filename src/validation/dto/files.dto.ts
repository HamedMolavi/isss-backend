import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional, Validate, ArrayMaxSize, ArrayMinSize, IsNumber } from "class-validator";
import { FileOrDirExists, IsImageString, Or } from ".";


export class AddPersonImage {
  @IsString()
  @Or("personnel_id", ['person_id'])
  public personnel_id?: string;
  @IsString()
  @Or("person_id", ['personnel_id'])
  public person_id?: string;
  @Validate(IsImageString)
  @IsString()
  public image_str?: string;
  @ArrayMaxSize(512)
  @ArrayMinSize(512)
  @IsNumber({}, { each: true })
  @IsOptional()
  public vector?: Array<number>;
  @IsString()
  @IsOptional()
  public confidence?: string;
};

export class AddHostilePerson {
  @Validate(IsImageString, { each: true })
  @IsString({ each: true })
  public image_str?: Array<string>;
  @IsBoolean()
  @IsOptional()
  public tracked?: boolean;
  @IsBoolean()
  @IsOptional()
  public alert?: boolean;
};

export class AddBatchPersonnel {
  @Validate(FileOrDirExists, [{ prefix: __dirname + '/../../../face_DB' }])
  @IsString()
  public path?: boolean;
};