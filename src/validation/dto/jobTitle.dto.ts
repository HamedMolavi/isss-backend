import { IsEmail, IsString, IsDefined, MinLength, IsBoolean } from "class-validator";


export class CreateJobTitleBody {
  @IsString()
  public name?: string;
};