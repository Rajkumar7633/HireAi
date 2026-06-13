import { io, type Socket } from "socket.io-client"

let testSocket: Socket | null = null

export function getTestSocket(): Socket {
  if (!testSocket) {
    testSocket = io({
      path: "/api/socket",
      transports: ["websocket"],
      autoConnect: true,
      withCredentials: true,
    })
  }
  return testSocket
}
