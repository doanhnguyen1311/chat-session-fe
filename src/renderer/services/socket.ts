import { io, Socket } from "socket.io-client";

const API_URL = import.meta.env.VITE_BACKEND_URL ?? "https://apiprivate.delisocial.id.vn";

export const socket: Socket = io(API_URL, {
  autoConnect: false,
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 800,
  reconnectionDelayMax: 5000
});

export function connectSocket(accountToken?: string): Socket {
  if (accountToken) {
    socket.auth = { accountToken };
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}
