// hooks/useSocket.ts
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export const createSocketConnection = (userId) => {
  if (!userId) return null;

  const socket = io("http://localhost:8000", {
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
