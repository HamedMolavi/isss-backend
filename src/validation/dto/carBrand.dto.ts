import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsArray, IsOptional } from "class-validator";
import mongoose, { Schema } from "mongoose";


export class CreateCarBrandBody {
  @IsString()
  name?: string;
};

export class UpdateCarBrandBody {
  @IsString()
  @IsOptional()
  name?: string;
};