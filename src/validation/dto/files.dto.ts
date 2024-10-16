import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional, Validate, ArrayMaxSize, ArrayMinSize, IsNumber, IsEnum, IsArray, IsNotEmpty } from "class-validator";
import { FileOrDirExists, IsImageString, Or } from ".";

enum ClientType {
  CLIENT_BUYE = "client_buyer",
  CLIENT_SELL = "client_seller",
}

export class AddClient {
  @IsNotEmpty()
  @IsString()
  first_name?: string;
  @IsNotEmpty()
  @IsString()
  last_name?: string;
  @IsEnum(ClientType)
  @IsDefined()
  client_type?: ClientType;
  @IsString()
  @IsOptional()
  product_name?: string;
  @Validate(IsImageString, { each: true })
  @IsString({ each: true })
  @ArrayMinSize(1)
  @IsArray()
  product_images?: string;
  @IsString()
  face_log_id?: string;
};

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