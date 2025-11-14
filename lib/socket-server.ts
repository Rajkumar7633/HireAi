import type { Server as IOServer } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var __io: IOServer | undefined;
}

export function setIO(io: IOServer) {
  global.__io = io;
}

export function getIO(): IOServer | undefined {
  return global.__io;
}

export function emitSocial(event: string, payload: any) {
  try {
    const io = getIO();
    if (io) io.emit(event, payload);
  } catch { }
}
