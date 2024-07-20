import { IsBoolean, IsOptional, IsString } from "class-validator";

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
  @IsString()
  plate_number?: string;
  @IsString()
  plate_type?: string;
};


