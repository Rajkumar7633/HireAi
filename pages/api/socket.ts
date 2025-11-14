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
      // Namespace for social events
      socket.on("disconnect", () => {});
    });
  }
  res.end();
}
