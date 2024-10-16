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
  // @ValidateNested({ each: true })
  // @Type(() => CreateProductFeature)
  // @IsArray()
  // features?: Array<{ name: string, value: any }>
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
  // @ValidateNested({ each: true })
  // @Type(() => CreateProductFeature)
  // @IsArray()
  // features?: Array<{ name: string, value: any }>
};