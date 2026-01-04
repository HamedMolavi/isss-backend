import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class ReportPlateBody {
	@IsString()
	time_start?: string;
	@IsString()
	time_end?: string;
	@IsOptional()
	@IsString()
	date_start?: string;
	@IsOptional()
	@IsString()
	date_end?: string;
	@IsOptional()
	@IsArray()
	brand?: string[] | null;
	@IsOptional()
	@IsArray()
	car_type?: string[] | null;
	@IsOptional()
	@IsArray()
	color?: string[] | null;
	@IsOptional()
	@IsArray()
	owner?: string[];
	@IsOptional()
	@IsBoolean()
	allowed?: boolean;
	@IsOptional()
	@IsArray()
	cameras?: string[];
	@IsOptional()
	@IsArray()
	angle?: string[];
	plate?: Plate;
}

export class Plate {
	@IsString()
	first?: string;
	@IsString()
	second?: string;
	@IsString()
	third?: string;
	@IsString()
	fourth?: string;
	@IsString()
	fifth?: string;
}

export class ReportFaceBody {
	@IsString()
	time_start?: string;
	@IsString()
	time_end?: string;
	@IsOptional()
	@IsString()
	date_start?: string;
	@IsOptional()
	@IsString()
	date_end?: string;
	@IsOptional()
	@IsArray()
	personnels?: string[] | null;
	@IsOptional()
	@IsBoolean()
	allowed?: boolean;
	@IsOptional()
	@IsArray()
	cameras?: string[];
}

export class ReportHumanBody {
	@IsString()
	time_start?: string;
	@IsString()
	time_end?: string;
	@IsOptional()
	@IsString()
	date_start?: string;
	@IsOptional()
	@IsString()
	date_end?: string;
	@IsOptional()
	@IsArray()
	human_count?: string[] | null;
	@IsOptional()
	//  @IsBoolean()
	allowed?: boolean | null;
	@IsOptional()
	@IsArray()
	cameras?: string[];
}

export class AnalyticsBody {
	@IsString()
	time_start?: string;
	@IsString()
	time_end?: string;
	@IsOptional()
	@IsString()
	date_start?: string;
	@IsOptional()
	@IsString()
	date_end?: string;
	@IsOptional()
	@IsArray()
	cameras?: string[];
	@IsOptional()
	@IsNumber()
	limit?: number;
	@IsOptional()
	@IsString()
	timez?: string;
	@IsOptional()
	@IsString()
	index_type?: string;
	@IsOptional()
	@IsBoolean()
	time_filter?: boolean;
	@IsOptional()
	@IsString()
	sort_by?: string;
}

export class ReportObjectBody {
	@IsString()
	time_start?: string;
	@IsString()
	time_end?: string;
	@IsOptional()
	@IsString()
	date_start?: string;
	@IsOptional()
	@IsString()
	date_end?: string;
	@IsOptional()
	allowed?: boolean | null;
	@IsOptional()
	@IsArray()
	cameras?: string[];
}
