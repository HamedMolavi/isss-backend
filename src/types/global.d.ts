import { Consumer } from "kafkajs";
import { IUser } from "../models/user";
import { IncomingMessage } from "http";

export { }
declare global {
  namespace NodeJS {
    interface Process {
      CONSUMERS: Map<string, Consumer | undefined>;
    }
  };
  namespace Express {
    interface User extends IUser { };
    interface Request {
      session: session.Session & Partial<session.SessionData> & { user: User };
    }
  }
}

declare module 'http' {
  export interface IncomingMessage {
    user: IUser
  }
}