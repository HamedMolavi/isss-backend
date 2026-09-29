import { IsBoolean, IsDefined, IsObject, IsOptional, IsString, Validate } from 'class-validator';
import { Plate } from './report.dto';
import { IsPlateNumber } from '../plate.validation';

export class CreatePlateLogBody {
	@IsBoolean()
	@IsOptional()
	is_correct?: boolean;
	@IsString()
	color?: string;
	@IsString()
	brand?: string;
	@IsString()
	camera_id?: string;
	@IsString()
	owner?: string;
	@IsDefined()
	@IsObject()
	@Validate(IsPlateNumber)
	plate_number?: Plate;
}
