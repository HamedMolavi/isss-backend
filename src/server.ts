//import this file to correct global and modular types
import { } from "./types/index";
//initial file .env
require("./config/env.config")["default"](); //sync
//process error handling
require("./error/process.handler")["default"](); //sync
//imports
import http from "http";
import https from "https";
import app from "./app/app.Application";
import setup from "./setups/index";


async function main() {
  setup().then(_ => {
    const { PORT_HTTPS, PORT_HTTP, HOST } = process.env;
    //                             SETUP YOUR SERVERS
    ////////////////////////////////////////////////////////////////////////////
    const httpServer = http.createServer(app).listen(PORT_HTTP, () => {
      console.log(`Server is running on http://${HOST}:${PORT_HTTP}`);
    }).on('error', errorHandler);
    ////////////////////////////////////////////////////////////////////////////

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
  })
};
main();