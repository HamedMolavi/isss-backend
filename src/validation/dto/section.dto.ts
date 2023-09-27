import { IsEmail, IsString, IsDefined, MinLength, IsBoolean } from "class-validator";

export class CreateSectionBody {
  @IsString()
  public name?: string;
  @IsString()
  public department_id?: string;
};