import { IncomingMessage } from "http";



export default async function allowRequest(req: IncomingMessage, callback: (err: string | null | undefined, success: boolean) => void): Promise<void> {
  console.log("Attempt: auth header", !!req.headers.authorization, "roomid", !!req.headers.roomid);
  if (!req.headers.roomid || !req.headers.authorization) return callback("Bad request!", false);
  return callback(null, true);
};