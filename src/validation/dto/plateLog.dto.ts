import { IsString } from "class-validator";
import { Plate } from "./report.dto";


export class CreatePlateLogBody {
  @IsString()
  color?: string;
  @IsString()
  brand?: string;
  @IsString()
  camera_id?: string;
  @IsString()
  owner?: string;
  plate_number?: Plate;
};


