import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";


export class ReportPlateBody {
    @IsString()
    public time_start?: string;
    @IsString()
    public time_end?: string;
    @IsOptional()
    @IsString()
    public date_start?: string;
    @IsOptional()
    @IsString()
    public date_end?: string;
    @IsOptional()
    @IsArray()
    public brand?: string[] | null;
    @IsOptional()
    @IsArray()
    public color?: string[] | null;
    @IsOptional()
    @IsArray()
    public owner?: string[];
    @IsOptional()
    @IsBoolean()
    public allowed?: boolean
    @IsOptional()
    @IsArray()
    public cameras?: string[]
    public plate?: Plate
};


export class Plate {
    @IsString()
    public first?: string
    @IsString()
    public second?: string
    @IsString()
    public third?: string
    @IsString()
    public fourth?: string
    @IsString()
    public fifth?: string
}


export class ReportFaceBody{
    @IsString()
    public time_start?: string;
    @IsString()
    public time_end?: string;
    @IsOptional()
    @IsString()
    public date_start?: string;
    @IsOptional()
    @IsString()
    public date_end?: string;
    @IsOptional()
    @IsArray()
    public personnels?: string[] | null;
    @IsOptional()
  //  @IsBoolean()
    public allowed?: boolean | null
    @IsOptional()
    @IsArray()
    public cameras?: string[]
}