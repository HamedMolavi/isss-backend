import { Session, SessionData } from "express-session";
import { IncomingMessage } from "http";


declare module "http" {
  interface IncomingMessage {
    cookieHolder?: string | undefined | string[];
    session: Session & Partial<SessionData>;
    user: any;
    cookeis: { [key: string]: string | undefined | string[] };
  }
}

export default async function allowRequest(req: IncomingMessage, callback: (err: string | null | undefined, success: boolean) => void): Promise<void> {
  console.log("Attempt: auth header", !!req.headers.authorization, "roomid", !!req.headers.roomid);
  if (!req.headers.roomid || !req.headers.authorization) return callback("Bad request!", false);
  return callback(null, true);
};