// hooks/useSocket.ts
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { BACKEND_URL } from "../../config";

export const createSocketConnection = (userId) => {
  if (!userId) return null;

  const backendBase = BACKEND_URL.replace("/api", "");

  console.log({ backendBase });

  const socket = io(backendBase, {
    withCredentials: true,
    auth: {
      userId: userId,
    },
  });

  socket.on("connect", () => {
    console.log("✅ Connected:", socket.id);
  });

  return socket;
};
