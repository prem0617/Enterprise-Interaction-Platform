import { Server } from "socket.io";
import express from "express";
import { createServer } from "http";
import { FRONTEND_URL } from "../../frontend/config.js";

const app = express();
const server = createServer(app);

// const io = new Server(server, {
//   // cors: {
//   //   origin: ["http://localhost:5173"],
//   //   methods: ["GET", "POST"],
//   //   credentials: true,
//   // },
//   cors:{
//     origin: "*",        // allow all origins
//     credentials: true
//   }
// });
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      FRONTEND_URL    
    ],
    credentials: true,
  },
});
const users = {};

function forwardToUser(eventName, toUserId, payload) {
  const normalizedTo = toUserId?.toString?.() ?? toUserId;
  const socketId = users[normalizedTo];
  console.log(`[SIGNALLING] forward "${eventName}" to userId=${normalizedTo} -> socketId=${socketId || "NOT FOUND"} | users map:`, Object.keys(users));
  if (socketId) {
    io.to(socketId).emit(eventName, payload);
  }
}

io.on("connection", async (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("message", (msg) => {
    console.log("Message received:", msg);
  });

  const userId = socket.handshake.auth.userId;
  const normalizedUserId = userId?.toString?.() ?? userId;
  if (normalizedUserId) {
    users[normalizedUserId] = socket.id;
    socket.userId = normalizedUserId;
    console.log(`[SIGNALLING] user registered: userId=${normalizedUserId} -> socketId=${socket.id}`);
  }

  // ---------- WebRTC Audio Call Signalling ----------
  // Initial call request is sent via HTTP (POST /api/call/request), same as chat - server emits to target socket.
  // Only accept/reject/offer/answer/ice/end use socket here.

  socket.on("audio-call-accept", (data) => {
    const { toUserId } = data;
    console.log("[SIGNALLING] received audio-call-accept", { from: socket.userId, toUserId });
    if (!toUserId || !socket.userId) return;
    forwardToUser("call-accepted", toUserId, {
      fromUserId: socket.userId,
    });
  });

  socket.on("audio-call-reject", (data) => {
    const { toUserId } = data;
    console.log("[SIGNALLING] received audio-call-reject", { from: socket.userId, toUserId });
    if (!toUserId || !socket.userId) return;
    forwardToUser("call-rejected", toUserId, {
      fromUserId: socket.userId,
    });
  });

  socket.on("webrtc-offer", (data) => {
    const { toUserId, sdp } = data;
    console.log("[SIGNALLING] received webrtc-offer", { from: socket.userId, toUserId, hasSdp: !!sdp });
    if (!toUserId || !socket.userId || !sdp) return;
    forwardToUser("webrtc-offer", toUserId, {
      fromUserId: socket.userId,
      sdp,
    });
  });

  socket.on("webrtc-answer", (data) => {
    const { toUserId, sdp } = data;
    console.log("[SIGNALLING] received webrtc-answer", { from: socket.userId, toUserId, hasSdp: !!sdp });
    if (!toUserId || !socket.userId || !sdp) return;
    forwardToUser("webrtc-answer", toUserId, {
      fromUserId: socket.userId,
      sdp,
    });
  });

  socket.on("webrtc-ice", (data) => {
    const { toUserId, candidate } = data;
    console.log("[SIGNALLING] received webrtc-ice", { from: socket.userId, toUserId, hasCandidate: !!candidate });
    if (!toUserId || !socket.userId) return;
    forwardToUser("webrtc-ice", toUserId, {
      fromUserId: socket.userId,
      candidate,
    });
  });

  socket.on("audio-call-end", (data) => {
    const { toUserId } = data;
    console.log("[SIGNALLING] received audio-call-end", { from: socket.userId, toUserId });
    if (!toUserId || !socket.userId) return;
    forwardToUser("call-ended", toUserId, {
      fromUserId: socket.userId,
    });
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id} (userId=${normalizedUserId})`);
    if (normalizedUserId) {
      delete users[normalizedUserId];
    }
  });
});

export const getReceiverSocketId = (receiverId) => {
  const normalized = receiverId?.toString?.() ?? receiverId;
  return users[normalized];
};

export { app, server, io };
