import {
  IsEmail,
  IsString,
  IsDefined,
  MinLength,
  IsBoolean,
} from "class-validator";

export class LoginBodyDto {
  @IsString()
  @IsDefined({ message: "username is needed" })
  public username?: string;

  @IsString()
  @IsDefined({ message: "password is needed" })
  public password?: string;

  //@IsString()
  public is_remember?: string | boolean;
}
