import { IncomingMessage } from "http";



export default async function allowRequest(req: IncomingMessage, callback: (err: string | null | undefined, success: boolean) => void): Promise<void> {
  if (!req.headers.authorization) return callback("Bad request!", false);
  return callback(null, true);
};