import { IsString, IsDefined, IsBoolean, IsOptional } from 'class-validator';

export class LoginBodyDto {
	@IsString()
	@IsDefined({ message: 'username is needed' })
	public username?: string;

	@IsString()
	@IsDefined({ message: 'password is needed' })
	public password?: string;

	@IsOptional()
	@IsBoolean()
	is_remember?: boolean;

	@IsOptional()
	@IsString()
	otp_token?: string;
}
