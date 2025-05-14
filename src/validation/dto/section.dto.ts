import { IsString, IsBoolean, IsOptional } from "class-validator";

export class CreateSectionBody {
  @IsString()
  public name?: string;
  @IsString()
  public department_id?: string;
  @IsOptional()
  @IsBoolean()
  public is_enabled?: string;
};