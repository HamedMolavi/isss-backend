import { IncomingMessage } from "http";
import { IUserDocument } from "./interfaces/user.interface";
import { Types } from "mongoose";
export { }

declare module 'http' {
  export interface IncomingMessage {
    user: (IUserDocument & { _id: Types.ObjectId; })
  }
}