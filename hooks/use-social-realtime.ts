"use client";
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

function getSocket(): Socket {
  if (socket) return socket;
  socket = io({ path: "/api/socket", transports: ["websocket"], autoConnect: true, withCredentials: true });
  return socket;
}

export function useSocialRealtime(
  handlers: {
    onLike?: (payload: { postId: string; likes: number }) => void;
    onComment?: (payload: { postId: string; comment: any; commentsCount: number }) => void;
    onConnection?: (payload: { type: string; users?: string[] }) => void;
  } = {},
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const s = getSocket();
    const like = (p: any) => handlersRef.current.onLike?.(p);
    const comment = (p: any) => handlersRef.current.onComment?.(p);
    const conn = (p: any) => handlersRef.current.onConnection?.(p);
    s.on("post:like", like);
    s.on("post:comment", comment);
    s.on("connection:update", conn);
    return () => {
      s.off("post:like", like);
      s.off("post:comment", comment);
      s.off("connection:update", conn);
    };
  }, []);
}
