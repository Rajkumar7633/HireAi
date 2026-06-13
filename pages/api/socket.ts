import type { NextApiRequest, NextApiResponse } from "next";
import { Server as NetServer } from "http";
import { Server as IOServer } from "socket.io";
import { setIO } from "@/lib/socket-server";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const anyRes = res as any;
  if (!anyRes.socket.server.io) {
    const httpServer: NetServer = anyRes.socket.server as any;
    const io = new IOServer(httpServer, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: { origin: true, credentials: true },
    });
    anyRes.socket.server.io = io;
    setIO(io);

    io.on("connection", (socket) => {
      socket.on("meeting:join", ({ roomId, name, userId }: { roomId?: string; name?: string; userId?: string }) => {
        if (!roomId) return
        socket.join(`meeting:${roomId}`)
        socket.data.meetingRoom = roomId
        socket.data.meetingName = name || "Guest"
        socket.data.meetingUserId = userId || socket.id
        const room = io.sockets.adapter.rooms.get(`meeting:${roomId}`)
        const count = room?.size ?? 0
        io.to(`meeting:${roomId}`).emit("meeting:participants", { roomId, count })
      })

      socket.on("meeting:leave", ({ roomId }: { roomId?: string }) => {
        const rid = roomId || socket.data.meetingRoom
        if (!rid) return
        socket.leave(`meeting:${rid}`)
        socket.data.meetingRoom = undefined
        const room = io.sockets.adapter.rooms.get(`meeting:${rid}`)
        const count = room?.size ?? 0
        io.to(`meeting:${rid}`).emit("meeting:participants", { roomId: rid, count })
      })

      socket.on(
        "meeting:signal",
        ({ roomId, signal }: { roomId?: string; signal?: Record<string, unknown> }) => {
          if (!roomId || !signal?.type) return
          socket.broadcast.to(`meeting:${roomId}`).emit("meeting:signal", { roomId, signal })
        },
      )

      socket.on("disconnect", () => {
        const rid = socket.data.meetingRoom as string | undefined
        if (!rid) return
        const room = io.sockets.adapter.rooms.get(`meeting:${rid}`)
        const count = room?.size ?? 0
        io.to(`meeting:${rid}`).emit("meeting:participants", { roomId: rid, count })
      })
    })
  }
  res.end();
}
