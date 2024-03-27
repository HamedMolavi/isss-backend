import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional, IsArray, ValidateNested, IsNumber, IsObject, Validate, IsEmpty, isEmpty, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, ArrayMaxSize, ArrayMinSize } from "class-validator";
import mongoose, { Schema } from "mongoose";
import { ArrayValidation, Comparison } from "../time";


export class ReadSimilarVectorsBody {
  @ArrayMaxSize(512)
  @ArrayMinSize(512)
  @Validate(ArrayValidation, ["number"])
  vector?: Array<number>;
  @Validate(Comparison, ["gte", 0])
  @Validate(Comparison, ["lse", 100])
  @IsNumber()
  threshold?: number
};
