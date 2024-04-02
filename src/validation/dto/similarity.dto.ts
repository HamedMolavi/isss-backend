import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional, IsArray, ValidateNested, IsNumber, IsObject, Validate, IsEmpty, isEmpty, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, ArrayMaxSize, ArrayMinSize, ValidateIf, ValidationOptions } from "class-validator";
import mongoose, { Schema } from "mongoose";
import { Comparison, Or } from ".";


export class ReadSimilarVectorsBody {
  @ArrayMaxSize(512)
  @ArrayMinSize(512)
  @IsNumber({}, { each: true })
  @Or("vector", ['log_id'])
  vector?: Array<number>;
  @IsString()
  @Or("log_id", ['vector'])
  log_id?: string;
  @Validate(Comparison, ["gte", 0])
  @Validate(Comparison, ["lse", 100])
  @IsNumber()
  threshold?: number
  @IsString()
  @IsOptional()
  date_start?: string;
  @IsString()
  @IsOptional()
  date_end?: string;
};
