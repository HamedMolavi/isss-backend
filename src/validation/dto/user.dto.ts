import { IsString} from "class-validator";
import { Schema } from "mongoose";


export class CreateUserBody {
  @IsString()
  public username?: string;
  @IsString()
  public password?: string;
  @IsString()
  public phone_number?: string;
  public event?: boolean;
  public camera?: boolean;
  public report?: boolean;
  public configuration?: boolean;
  public camera_access?: Schema.Types.ObjectId[];
};

export class UpdateUserBody {
  @IsString()
  public username?: string;
  @IsString()
  public password?: string;
  @IsString()
  public phone_number?: string;
  public event?: boolean;
  public camera?: boolean;
  public report?: boolean;
  public configuration?: boolean;
  public camera_access?: Schema.Types.ObjectId[];
};