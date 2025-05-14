import { IsString, IsArray } from 'class-validator';

export class AddNotifPersonnelBody {
	@IsString()
	public person_id?: string;
	@IsString()
	public image_str?: string;
	@IsString()
	public confidence?: string;
	@IsArray()
	public vector?: Array<Number>;
}
