import { Socket } from "socket.io";

export default async function setupNewSocket(socket: Socket) {
  console.log(socket.id, "connected");
  joinRoom(socket);
  // TODO: setup event handlers
  socket.on("disconnect", disconnect);
};
async function joinRoom(socket: Socket): Promise<void> {
  const roomId = `cam_${socket.request.headers.roomid as string}`;
  await socket.join(roomId);
  console.log("joined to room:", roomId);
  return;
};
async function disconnect() {
  // TODO: logic for disconnection.
};


