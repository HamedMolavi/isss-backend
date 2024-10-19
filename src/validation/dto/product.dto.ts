import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional, IsArray, ValidateNested, IsNumber, IsObject, Validate, IsEmpty, isEmpty, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, ValidateIf, ArrayMinSize } from "class-validator";
import mongoose from "mongoose";
import { EndgtrStartValidator, IsImageString, TimeAndDateValidator } from ".";
import { Type } from "class-transformer";

export class CreateProductFeature {
  @IsString()
  name?: string;
  @IsDefined()
  value?: any;
}

export class FilterProductBody {
  @IsString()
  @IsOptional()
  name?: string;
  @IsString({ each: true })
  @IsArray()
  @IsOptional()
  personnels?: mongoose.Types.ObjectId;
  @IsNumber()
  @IsOptional()
  product_weight?: number
  // @IsArray()
  // @IsOptional()
  // product_codes?: string;
  @Validate(EndgtrStartValidator)
  @Validate(TimeAndDateValidator, ['date_start'])
  @IsString()
  @IsOptional()
  time_start?: string;
  @Validate(TimeAndDateValidator, ['time_start'])
  @IsString()
  @IsOptional()
  date_start?: string;
  @Validate(EndgtrStartValidator)
  @Validate(TimeAndDateValidator, ['date_end'])
  @IsString()
  @IsOptional()
  time_end?: string;
  @Validate(TimeAndDateValidator, ['time_end'])
  @IsString()
  @IsOptional()
  date_end?: string;
};

export class CreateProductBody {
  @IsString()
  name?: string;
  @IsString()
  product_code?: string;
  @Validate(IsImageString, { each: true })
  @IsString({ each: true })
  @ArrayMinSize(1)
  @IsArray()
  images?: Array<string>;
  @IsNumber()
  @IsOptional()
  product_weight?: number

  @IsString()
  person_id?: mongoose.Types.ObjectId;
  @IsString()
  face_log_id?: string;
};

export class UpdateProductBody {
  @IsString()
  name?: string;
  @IsString()
  product_code?: string;
  @Validate(IsImageString, { each: true })
  @IsString({ each: true })
  @ArrayMinSize(1)
  @IsArray()
  images?: Array<string>;
};