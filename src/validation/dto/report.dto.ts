import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";


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
    color?: string[] | null;
    @IsOptional()
    @IsArray()
    owner?: string[];
    @IsOptional()
    @IsBoolean()
    allowed?: boolean
    @IsOptional()
    @IsArray()
    cameras?: string[]
    plate?: string
};


export class ReportFaceBody{
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
    allowed?: boolean
    @IsOptional()
    @IsArray()
    cameras?: string[]
}


export class ReportHumanBody{
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
    allowed?: boolean | null
    @IsOptional()
    @IsArray()
    cameras?: string[]
}

export class ReportObjectBody{
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
    allowed?: boolean | null
    @IsOptional()
    @IsArray()
    cameras?: string[]
}