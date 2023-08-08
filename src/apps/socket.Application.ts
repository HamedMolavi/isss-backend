import http from "http";
import { Server, Socket } from "socket.io";
import allowRequest from "../authentication/socketCheck.auth";
import passport from "passport";
import { sessionMiddleware } from "./app.Application";
import { authHeaderExtraction, passportGate } from "../authentication/authorize.auth";
import { wrapMiddlewareForSocketIo } from "../tools/socket.tools";
import { SocketDisconnectReason } from "../interfaces/enums/socket.enum";

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
  io.use(wrapMiddlewareForSocketIo(authHeaderExtraction))
  io.use(wrapMiddlewareForSocketIo(passport.initialize()));
  io.use(wrapMiddlewareForSocketIo(sessionMiddleware));
  io.use(wrapMiddlewareForSocketIo(passport.session()));
  io.use(wrapMiddlewareForSocketIo(passportGate));

  // TODO: setuping new socket connection
  io.on("connection", async function setupNewSocket(socket: Socket) {
    joinRoom(socket);
    socket.on("disconnect", disconnect);
  });


  return io;
};



async function joinRoom(socket: Socket): Promise<void> {
  if (socket.request.headers.roomid) { // join single room, mostly to get stream data
    const roomId = socket.request.headers.roomid as string;
    await socket.join(roomId);
  } else { // join all rooms user has access to, mostly to get alerts
    console.log(typeof socket.request.user.camera_access);
    console.log(socket.request.user.camera_access);

    for (const cam_id of socket.request.user.camera_access ?? []) {
      const roomId = cam_id.toString();
      await socket.join(roomId);
    };
  };
  return;
};
async function disconnect(reason: string) {
  // (SocketDisconnectReason as any)[reason];
};


