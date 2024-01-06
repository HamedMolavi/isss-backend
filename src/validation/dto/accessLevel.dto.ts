import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional, IsArray, IsNumber } from "class-validator";
import mongoose from "mongoose";


export class CreateAccessLevelBody {
  @IsString()
  public name?: string
  @IsNumber()
  @IsOptional()
  public camera?: number
  @IsNumber()
  @IsOptional()
  public car?: number
  @IsNumber()
  @IsOptional()
  public color?: number
  @IsNumber()
  @IsOptional()
  public brand?: number
  @IsNumber()
  @IsOptional()
  public section?: number
  @IsNumber()
  @IsOptional()
  public department?: number
  @IsNumber()
  @IsOptional()
  public job?: number
  @IsNumber()
  @IsOptional()
  public personnel?: number
  @IsNumber()
  @IsOptional()
  public schedule?: number
  @IsNumber()
  @IsOptional()
  public user?: number
  @IsNumber()
  @IsOptional()
  public typeName?: number
  @IsNumber()
  @IsOptional()
  public systemLog?: number
};