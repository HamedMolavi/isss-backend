import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional } from "class-validator";
import mongoose, { Schema } from "mongoose";


export class CreateDepartmentBody {
  @IsString()
  public name?: string;
  @IsBoolean()
  public is_enabled?: string;
  @IsOptional()
  @IsString()
  public created_date?: string;
};
