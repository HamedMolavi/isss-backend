import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional, IsArray, IsNumber, IsObject } from "class-validator";


export class CreateLogTypeBody {
  @IsString()
  public name?: string;
  @IsBoolean()
  @IsOptional()
  public method?: boolean;
  @IsBoolean()
  @IsOptional()
  public user?: boolean;
  @IsBoolean()
  @IsOptional()
  public ip?: boolean;
  @IsBoolean()
  @IsOptional()
  public result?: boolean;
};