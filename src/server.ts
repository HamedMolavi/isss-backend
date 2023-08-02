//initial file .env
import extraEnvConfigs from "./config/env.config";
extraEnvConfigs();
const { OPTIONS, PORT_HTTPS, PORT_HTTP, HOST, MONGODB_URL, REDIS_URL } = process.env;
//imports
import http from "http";
import https from "https";
import { setExceptionHandler } from "./error/process.handler";
import app from "./apps/app.Application";
import { setupRooms } from "./setups/rooms.setup";
import { setupInteractive } from "./setups/interactiveShell.setup";
import { MediaServer } from "./apps/kafka.Application";
import connectToDBs from "./db/index.database";
import ioServer from "./apps/socket.Application";

setExceptionHandler();

export const serversPromise =
  setupInteractive() // Interactive Sehll
    .then(async _ => await connectToDBs({ mongo: MONGODB_URL, redis: REDIS_URL })) // returns {mongo, redis} in case you need it
    .then(async _ => await setupRooms()) // returns the rooms if you need it in future
    .then(async () => {
      //                             SETUP YOUR SERVERS
      ////////////////////////////////////////////////////////////////////////////
      // run https server on port PORT_HTTPS
      const httpsServer = https.createServer(JSON.parse(OPTIONS as string), app).listen(PORT_HTTPS, () => {
        console.log(`Server is running on https://${HOST}:${PORT_HTTPS}`);
      }).on('error', errorHandler);

      // run http server on port PORT_HTTP
      const httpServer = http.createServer(app).listen(PORT_HTTP, () => {
        console.log(`Server is running on http://${HOST}:${PORT_HTTP}`);
      }).on('error', errorHandler);

      // run socket.io server on httpServer
      const io = await ioServer(httpServer);

      // run Media Server
      const mediaServer = new MediaServer(io);
      ////////////////////////////////////////////////////////////////////////////
      return { io, httpServer, mediaServer, httpsServer };
    })
    .catch((err) => {
      console.error("Error making the main server...");
      console.error(err);
      process.exit(1);
    });


function errorHandler(error: { syscall: string, code: string }) {
  if (error.syscall !== 'listen') throw error; // handeling only listen errors
  const bind = typeof PORT_HTTPS === 'string'
    ? 'Pipe ' + PORT_HTTPS
    : 'Port ' + PORT_HTTPS;
  switch (error.code) { // handle errors properly
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
    default:
      console.error(error);
  }
  process.exit(1);
};