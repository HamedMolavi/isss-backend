import Transport from 'winston-transport';
import { ILog } from "../types/interfaces/secLog.interface";
import { LOG_TYPE_KEYS } from "../types/enums/logType.enum";
import { Request } from "express";
import { ILogType } from '../types/interfaces/logType.interface';
import { DEFAULT_LOG_TYPE, LogType } from '../db/mongo/models/logType';
import { Log } from '../db/mongo/models/secLog';
import { appendFileSync } from 'fs';
import mongoose from 'mongoose';

export class MongooseTransport extends Transport {
  buffer: Array<ILog>;
  bufferLimit: number;
  flushInterval: number;
  interval: NodeJS.Timer;
  handlers: Record<LOG_TYPE_KEYS, Function> = {
    method: (req: Request) => { return req.method },
    ip: (req: Request) => { return req.ip },
    user: (req: Request) => { return req.user.username },
    result: (req: Request) => { return req.res?.statusCode },
  };
  // [key in keyof typeof LOG_TYPE_KEYS]: Function;
  public static logType: ILogType = DEFAULT_LOG_TYPE;
  constructor(options?: Transport.TransportStreamOptions & { bufferLimit?: number, flushInterval?: number }) {
    super(options);
    this.level = options?.level || 'info';
    this.buffer = []; // Buffer to store log entries
    this.bufferLimit = options?.bufferLimit || 100; // Max number of logs before flushing
    this.flushInterval = options?.flushInterval || 1000; // Interval to flush logs (ms)
    // Set up periodic flushing
    this.interval = setInterval(() => this.flushBuffer(), this.flushInterval);
    LogType.findOne({})
      .sort({ ts: -1 })
      .exec((err, doc) => {
        if (err) {
          console.error("Error in fetching default log type:\n", err);
          process.exit(1);
        } else {
          MongooseTransport.logType = doc?.toJSON() ?? DEFAULT_LOG_TYPE;
        }
      });
  }

  flushBuffer() {
    if (this.buffer.length > 0) {
      const logsToInsert = this.buffer.splice(0, this.buffer.length);
      Log.insertMany(logsToInsert)
        .then((docs) => { console.log("saved", docs[0]) })
        .catch((err) => {
          console.error('Error flushing logs to MongoDB:', err);
          appendFileSync('fallback-logs.json', JSON.stringify(logsToInsert) + '\n');
        });
    }
  }

  log(infoAndReq: ILog & { req: Request }, callback: () => void) { // req: Request
    const info = new Log(infoAndReq);
    // info.meta = this.prepareMeta(infoAndReq.req);
    setImmediate(() => this.emit('logged', info));
    // Add log entry to the buffer
    this.buffer.push(info);
    // Flush if buffer limit is reached
    if (this.buffer.length >= this.bufferLimit) {
      this.flushBuffer();
    }
    callback();
  }

  prepareMeta(req: Request) {
    let meta: Partial<Record<LOG_TYPE_KEYS, boolean>> = {};
    for (const key of Object.keys(LOG_TYPE_KEYS) as Array<LOG_TYPE_KEYS>) {
      if (MongooseTransport.logType[key])
        meta[key] = this.handlers[key].call(this, req);
    }
    return meta;
  }

  close() {
    clearInterval(this.interval); // Clear the interval on transport close
    this.flushBuffer(); // Flush remaining logs
  }

  static changeSize(cappedSize: number) {
    return mongoose.connection.db.command({ buildInfo: 1 })
      .then(res => parseInt(res.version) >= 6)
      .then(res => res ? mongoose.connection.db.command({ collMod: Log.collection.name, cappedSize }) : new Error("Mongoose doesn't support changing capped collection size!"))
      .catch(console.error);
  }
};