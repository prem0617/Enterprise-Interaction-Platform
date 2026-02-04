import { Server } from "socket.io";
import express from "express";
import { createServer } from "http";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://sticker-genesis-deeper-cheque.trycloudflare.com",
    ],
    credentials: true,
  },
});

const users = {};
const onlineUsers = new Set(); // Track online users

function forwardToUser(eventName, toUserId, payload) {
  const normalizedTo = toUserId?.toString?.() ?? toUserId;
  const socketId = users[normalizedTo];
  console.log(
    `[SIGNALLING] forward "${eventName}" to userId=${normalizedTo} -> socketId=${
      socketId || "NOT FOUND"
    } | users map:`,
    Object.keys(users)
  );
  if (socketId) {
    io.to(socketId).emit(eventName, payload);
  }
}

// Broadcast online users to all connected clients
function broadcastOnlineUsers() {
  const onlineUsersList = Array.from(onlineUsers);
  io.emit("online-users-updated", { onlineUsers: onlineUsersList });
  console.log(`[ONLINE STATUS] Broadcasting online users:`, onlineUsersList);
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

    // Add user to online set
    onlineUsers.add(normalizedUserId);
    console.log(
      `[SIGNALLING] user registered: userId=${normalizedUserId} -> socketId=${socket.id}`
    );
    console.log(`[ONLINE STATUS] User came online: ${normalizedUserId}`);

    // Broadcast updated online users list
    broadcastOnlineUsers();
  }

  // ---------- WebRTC Audio Call Signalling ----------
  socket.on("audio-call-request", (data) => {
    const { toUserId, fromUserName } = data;
    console.log("[SIGNALLING] received audio-call-request", {
      from: socket.userId,
      toUserId,
      fromUserName,
    });
    if (!toUserId || !socket.userId) return;
    forwardToUser("incoming-audio-call", toUserId, {
      fromUserId: socket.userId,
      fromUserName: fromUserName || "Someone",
    });
  });

  socket.on("audio-call-accept", (data) => {
    const { toUserId } = data;
    console.log("[SIGNALLING] received audio-call-accept", {
      from: socket.userId,
      toUserId,
    });
    if (!toUserId || !socket.userId) return;
    forwardToUser("call-accepted", toUserId, {
      fromUserId: socket.userId,
    });
  });

  socket.on("audio-call-reject", (data) => {
    const { toUserId } = data;
    console.log("[SIGNALLING] received audio-call-reject", {
      from: socket.userId,
      toUserId,
    });
    if (!toUserId || !socket.userId) return;
    forwardToUser("call-rejected", toUserId, {
      fromUserId: socket.userId,
    });
  });

  socket.on("webrtc-offer", (data) => {
    const { toUserId, sdp } = data;
    console.log("[SIGNALLING] received webrtc-offer", {
      from: socket.userId,
      toUserId,
      hasSdp: !!sdp,
    });
    if (!toUserId || !socket.userId || !sdp) return;
    forwardToUser("webrtc-offer", toUserId, {
      fromUserId: socket.userId,
      sdp,
    });
  });

  socket.on("webrtc-answer", (data) => {
    const { toUserId, sdp } = data;
    console.log("[SIGNALLING] received webrtc-answer", {
      from: socket.userId,
      toUserId,
      hasSdp: !!sdp,
    });
    if (!toUserId || !socket.userId || !sdp) return;
    forwardToUser("webrtc-answer", toUserId, {
      fromUserId: socket.userId,
      sdp,
    });
  });

  socket.on("webrtc-ice", (data) => {
    const { toUserId, candidate } = data;
    console.log("[SIGNALLING] received webrtc-ice", {
      from: socket.userId,
      toUserId,
      hasCandidate: !!candidate,
    });
    if (!toUserId || !socket.userId) return;
    forwardToUser("webrtc-ice", toUserId, {
      fromUserId: socket.userId,
      candidate,
    });
  });

  socket.on("audio-call-end", (data) => {
    const { toUserId } = data;
    console.log("[SIGNALLING] received audio-call-end", {
      from: socket.userId,
      toUserId,
    });
    if (!toUserId || !socket.userId) return;
    forwardToUser("call-ended", toUserId, {
      fromUserId: socket.userId,
    });
  });

  socket.on("disconnect", () => {
    console.log(
      `Socket disconnected: ${socket.id} (userId=${normalizedUserId})`
    );
    if (normalizedUserId) {
      delete users[normalizedUserId];

      // Remove user from online set
      onlineUsers.delete(normalizedUserId);
      console.log(`[ONLINE STATUS] User went offline: ${normalizedUserId}`);

      // Broadcast updated online users list
      broadcastOnlineUsers();
    }
  });
});

export const getReceiverSocketId = (receiverId) => {
  const normalized = receiverId?.toString?.() ?? receiverId;
  return users[normalized];
};

export const getOnlineUsers = () => {
  return Array.from(onlineUsers);
};

export { app, server, io };
