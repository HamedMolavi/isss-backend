import { IsEmail, IsString, IsDefined, MinLength, IsBoolean, IsOptional, NotContains } from 'class-validator';
import { Schema } from 'mongoose';

export class ReadTrackBody {
	@IsString()
	@IsOptional()
	public personnel_id?: Schema.Types.ObjectId;
	@IsString()
	@IsOptional()
	public number_plate?: string;
	@IsString()
	@IsOptional()
	date_start?: string;
	@IsString()
	@IsOptional()
	date_end?: string;
}
