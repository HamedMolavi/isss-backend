import Transport from 'winston-transport';
import { LEVEL } from "triple-beam";
import winston, { config as winstonConfig, LoggerOptions } from "winston";
import { MongooseTransport } from "./transports";



export class Logger {
  private static transports: Transport[]
  private static instance: winston.Logger
  constructor(opts: LoggerOptions & { recreate?: boolean } = { recreate: false }) {
    if (!Logger.instance || !!opts.recreate) {
      Logger.instance = winston.createLogger(opts);
      Logger.transports = [opts.transports ?? Logger.transports].flat();
    }
    // @ts-ignore
    return Logger.instance;
  }
  static init(opts: LoggerOptions & { recreate?: boolean } = { recreate: false }) {
    if (!Logger.instance || !!opts.recreate) {
      Logger.instance = winston.createLogger(opts);
      Logger.transports = [opts.transports ?? Logger.transports].flat();
    }
    return Logger.instance;
  }
  static info(message: string, ...args: any[]) { return Logger.instance?.info(message, ...args); }
  info(message: string, ...args: any[]) { return Logger.instance?.info(message, ...args); }
  static error(message: string, ...args: any[]) { return Logger.instance?.error(message, ...args); }
  error(message: string, ...args: any[]) { return Logger.instance?.error(message, ...args); }
  static warn(message: string, ...args: any[]) { return Logger.instance?.warn(message, ...args); }
  warn(message: string, ...args: any[]) { return Logger.instance?.warn(message, ...args); }
  static debug(message: string, ...args: any[]) { return Logger.instance?.debug(message, ...args); }
  debug(message: string, ...args: any[]) { return Logger.instance?.debug(message, ...args); }
  static changeMongoCollectionSize(cappedSize: number) { return MongooseTransport.changeSize(cappedSize) }
  changeMongoCollectionSize(cappedSize: number) { return MongooseTransport.changeSize(cappedSize) }
}











// const info = {
//   level: 'info',                 // Level of the logging message
//   message: 'Hey! Log something?', // Descriptive message being logged.
//   req: {},
// };
// for (let index = 0; index < 10; index++) {
//   logger.info(info)
// }
// await new Promise((resolve) => setTimeout(() => {
//   resolve(1);
// }, 2000))
// MongooseTransport.changeSize(500);
// setTimeout(() => {

//   for (let index = 0; index < 1000; index++) {
//     logger.info(info)
//   }
// }, 5000);

/*
function isLevelEnabledFunctionName(level: string) {
  return 'is' + level.charAt(0).toUpperCase() + level.slice(1) + 'Enabled';
}
class Logger extends winston.Logger {
  private static instance: winston.Logger

  constructor(options: LoggerOptions = {}) {
    options.levels = options.levels || winstonConfig.npm.levels;
    super(options);
    //
    // Define prototype methods for each log level e.g.:
    // logger.log('info', msg) implies these methods are defined:
    // - logger.info(msg)
    // - logger.isInfoEnabled()
    //
    // Remark: to support logger.child this **MUST** be a function
    // so it'll always be called on the instance instead of a fixed
    // place in the prototype chain.
    //
    // Object.keys(options.levels).forEach
    Logger.prototype['info'] = (...args) => {
      switch (args.length) {
        case 1: { // Optimize the hot-path which is the single object.
          const [msg] = args;
          const info = msg && msg.message && msg || { message: msg };
          info.level = info[LEVEL] = 'info';
          if (this.defaultMeta) Object.assign(msg, this.defaultMeta);
          this.write(info);
          return this;
        }
        case 0: {// When provided nothing assume the empty string
          this.log('info', '');
          return this;
        }
        default: {
          // Otherwise build argument list which could potentially conform to
          // either:
          // . v3 API: log(obj)
          // 2. v1/v2 API: log(level, msg, ... [string interpolate], [{metadata}], [callback])
          return this.log('info', ...args);
        }
      }
    }
    Logger.prototype['isInfoEnabled'] = function () {
      return this.isLevelEnabled('info');
    };
  }
}
*/
/*
  // you may also dynamically change the log level of a transport
  transports.console.level = 'info';
  transports.file.level = 'info';
  transports.mongo.level = 'info';
*/
/*
  // both Logger and Transport instances are treated as objectMode streams that accept an info object.
  logger
    .clear()          // Remove all transports
    .add(transports.console)     // Add console transport
    .add(transports.file)       // Add file transport
    .remove(transports.mongo); // Remove console transport
*/
