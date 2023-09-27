import { IsEmail, IsString, IsDefined, MinLength, IsBoolean } from "class-validator";
import mongoose, { Schema } from "mongoose";


export class CreateDepartmentBody {
  @IsString()
  public name?: string;
  @IsString()
  public created_date?: string;
};
