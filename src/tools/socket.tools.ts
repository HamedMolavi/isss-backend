import { Socket } from "socket.io";

export const wrapMiddlewareForSocketIo = (middleware: Function) => (socket: Socket, next: Function) => middleware(socket.request, {}, next);
