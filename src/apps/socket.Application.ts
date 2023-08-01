import http from "http";
import { Server, Socket } from "socket.io";
import allowRequest from "../authentication/socketCheck.auth";
import setupNewSocket from "../setups/socket.setup";
import passport from "passport";
import { sessionMiddleware } from "./app.Application";
import { passportGate } from "../authentication/authorize.auth";
const wrapMiddlewareForSocketIo = (middleware: Function) => (socket: Socket, next: Function) => middleware(socket.request, {}, next);


export default async function ioServer(httpServer: http.Server) {
  // run http websocket
  const io = new Server(httpServer, {
    // path: "/my-custom-path/",
    cors: {
      origin: "*",
      // allowedHeaders: ["my-custom-header"],
      // credentials: true
    },
    allowRequest, // session is not initialized yet, just check requirements.
    // allowUpgrades,
    // initialPacket,
    // transports:["polling","websocket"],

  });

  //authorize user
  io.use(wrapMiddlewareForSocketIo(passport.initialize()));
  io.use(wrapMiddlewareForSocketIo(sessionMiddleware));
  io.use(wrapMiddlewareForSocketIo(passport.session()));
  io.use(wrapMiddlewareForSocketIo(passportGate));

  io.on("connection", setupNewSocket);
  return io;
};