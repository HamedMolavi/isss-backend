import {
	IsString,
	IsDefined,
	IsBoolean,
	IsOptional,
	MaxLength,
	MinLength,
	IsNotEmpty
} from 'class-validator';

export class LoginBodyDto {
	@IsDefined({ message: 'Username is required' })
	@IsString({ message: 'Username must be a string' })
	@IsNotEmpty({ message: 'Username cannot be empty' })
	@MinLength(1, { message: 'Username is too short' })
	@MaxLength(100, { message: 'Username is too long' })
	public username!: string;

	@IsDefined({ message: 'Password is required' })
	@IsString({ message: 'Password must be a string' })
	@IsNotEmpty({ message: 'Password cannot be empty' })
	@MinLength(8, { message: 'Password is too short' })
	@MaxLength(128, { message: 'Password is too long' })
	public password!: string;

	@IsOptional()
	@IsBoolean({ message: 'is_remember must be a boolean' })
	is_remember?: boolean;

	@IsOptional()
	@IsString({ message: 'OTP token must be a string' })
	@MaxLength(10, { message: 'OTP token is too long' })
	otp_token?: string;

	@IsDefined({ message: 'Captcha id is required' })
	@IsString({ message: 'Captcha id must be a string' })
	@MaxLength(64, { message: 'Captcha id is too long' })
	captcha_id!: string;

	@IsDefined({ message: 'Captcha value is required' })
	@IsString({ message: 'Captcha value must be a string' })
	@MaxLength(10, { message: 'Captcha value is too long' })
	captcha_value!: string;
}
