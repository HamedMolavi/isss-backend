import { IsString } from "class-validator";
import { Plate } from "./report.dto";


export class CreatePlateLogBody {
  @IsString()
  public color?: string;
  @IsString()
  public brand?: string;
  @IsString()
  public camera_id?: string;

  public plate_number?: Plate;
};


