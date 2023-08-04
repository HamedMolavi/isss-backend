import { Consumer } from "kafkajs";
import { IUser } from "../models/user";

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

