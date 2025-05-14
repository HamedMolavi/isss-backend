import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional } from 'class-validator';

export class CreateJobTitleBody {
	@IsString()
	public name?: string;
}

export class UpdateJobTitleBody {
	@IsOptional()
	@IsString()
	public name?: string;
}
