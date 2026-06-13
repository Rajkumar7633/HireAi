import { io, type Socket } from "socket.io-client"

let meetingSocket: Socket | null = null

export function getMeetingSocket(): Socket {
  if (!meetingSocket) {
    meetingSocket = io({
      path: "/api/socket",
      transports: ["websocket"],
      autoConnect: true,
      withCredentials: true,
    })
  }
  return meetingSocket
}
