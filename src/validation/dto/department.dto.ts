import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional } from "class-validator";
import mongoose, { Schema } from "mongoose";


export class CreateDepartmentBody {
  @IsString()
  public name?: string;
  @IsOptional()
  @IsBoolean()
  public is_enabled?: string;
  @IsOptional()
  @IsString()
  public created_date?: string;
};


export class UpdateDepartmentBody {
  @IsOptional()
  @IsString()
  public name?: string;
  @IsOptional()
  @IsBoolean()
  public is_enabled?: string;
};
