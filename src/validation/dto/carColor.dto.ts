import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsArray, IsOptional } from "class-validator";
import mongoose, { Schema } from "mongoose";


export class CreateCarColorBody {
  @IsString()
  name?: string;
};