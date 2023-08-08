import { IUser } from "../db/mongo/models/user";
import { IncomingMessage } from "http";

export { }

declare module 'http' {
  export interface IncomingMessage {
    user: IUser
  };
};