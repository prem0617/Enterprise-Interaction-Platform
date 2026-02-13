import { Server } from "socket.io";
import express from "express";
import { createServer } from "http";


const app = express();
const server = createServer(app);

const io = new Server(server, {
       cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    credentials: true,
  },
});

const users = {};
const onlineUsers = new Set(); // Track online users
// Track users in calls: userId -> { inCall: boolean, callType: 'direct' | 'group', otherUserId?: string, channelId?: string }
const userCallStatus = {};
// Track active meeting rooms in memory: meetingId -> { [userId]: { name } }
const activeMeetings = {};

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
  socket.meetingIds = new Set();

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

  // Send current online users to this socket on request
  socket.on("request-online-users", () => {
    const onlineUsersList = Array.from(onlineUsers);
    socket.emit("online-users-updated", { onlineUsers: onlineUsersList });
  });

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
    
    // Mark both users as in a direct call
    const fromIdStr = String(socket.userId);
    const toIdStr = String(toUserId);
    userCallStatus[fromIdStr] = {
      inCall: true,
      callType: "direct",
      otherUserId: toIdStr,
    };
    userCallStatus[toIdStr] = {
      inCall: true,
      callType: "direct",
      otherUserId: fromIdStr,
    };
    
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
    
    // Clear call status for caller (call was rejected, so no call is active)
    const fromIdStr = String(socket.userId);
    delete userCallStatus[fromIdStr];
    
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
    
    // Clear call status for both users
    const fromIdStr = String(socket.userId);
    const toIdStr = String(toUserId);
    delete userCallStatus[fromIdStr];
    delete userCallStatus[toIdStr];
    
    forwardToUser("call-ended", toUserId, {
      fromUserId: socket.userId,
    });
  });

  // ---------- WebRTC Video Call Signalling ----------
  socket.on("video-call-accept", (data) => {
    const { toUserId } = data;
    console.log("[SIGNALLING] received video-call-accept", {
      from: socket.userId,
      toUserId,
    });
    if (!toUserId || !socket.userId) return;
    
    // Mark both users as in a direct call
    const fromIdStr = String(socket.userId);
    const toIdStr = String(toUserId);
    userCallStatus[fromIdStr] = {
      inCall: true,
      callType: "direct",
      otherUserId: toIdStr,
    };
    userCallStatus[toIdStr] = {
      inCall: true,
      callType: "direct",
      otherUserId: fromIdStr,
    };
    
    forwardToUser("video-call-accepted", toUserId, {
      fromUserId: socket.userId,
    });
  });

  socket.on("video-call-reject", (data) => {
    const { toUserId } = data;
    console.log("[SIGNALLING] received video-call-reject", {
      from: socket.userId,
      toUserId,
    });
    if (!toUserId || !socket.userId) return;
    
    // Clear call status for caller (call was rejected, so no call is active)
    const fromIdStr = String(socket.userId);
    delete userCallStatus[fromIdStr];
    
    forwardToUser("video-call-rejected", toUserId, {
      fromUserId: socket.userId,
    });
  });

  socket.on("video-webrtc-offer", (data) => {
    const { toUserId, sdp } = data;
    console.log("[SIGNALLING] received video-webrtc-offer", {
      from: socket.userId,
      toUserId,
      hasSdp: !!sdp,
    });
    if (!toUserId || !socket.userId || !sdp) return;
    forwardToUser("video-webrtc-offer", toUserId, {
      fromUserId: socket.userId,
      sdp,
    });
  });

  socket.on("video-webrtc-answer", (data) => {
    const { toUserId, sdp } = data;
    console.log("[SIGNALLING] received video-webrtc-answer", {
      from: socket.userId,
      toUserId,
      hasSdp: !!sdp,
    });
    if (!toUserId || !socket.userId || !sdp) return;
    forwardToUser("video-webrtc-answer", toUserId, {
      fromUserId: socket.userId,
      sdp,
    });
  });

  socket.on("video-webrtc-ice", (data) => {
    const { toUserId, candidate } = data;
    console.log("[SIGNALLING] received video-webrtc-ice", {
      from: socket.userId,
      toUserId,
      hasCandidate: !!candidate,
    });
    if (!toUserId || !socket.userId) return;
    forwardToUser("video-webrtc-ice", toUserId, {
      fromUserId: socket.userId,
      candidate,
    });
  });

  socket.on("video-call-end", (data) => {
    const { toUserId } = data;
    console.log("[SIGNALLING] received video-call-end", {
      from: socket.userId,
      toUserId,
    });
    if (!toUserId || !socket.userId) return;
    
    // Clear call status for both users
    const fromIdStr = String(socket.userId);
    const toIdStr = String(toUserId);
    delete userCallStatus[fromIdStr];
    delete userCallStatus[toIdStr];
    
    forwardToUser("video-call-ended", toUserId, {
      fromUserId: socket.userId,
    });
  });

  // ---------- Group call WebRTC signalling ----------
  socket.on("group-call-webrtc-offer", (data) => {
    const { toUserId, channelId, sdp } = data;
    if (!toUserId || !socket.userId || !sdp) return;
    console.log("[SIGNALLING] group-call-webrtc-offer", { from: socket.userId, toUserId, channelId });
    forwardToUser("group-call-webrtc-offer", toUserId, {
      fromUserId: socket.userId,
      channelId,
      sdp,
    });
  });

  socket.on("group-call-webrtc-answer", (data) => {
    const { toUserId, channelId, sdp } = data;
    if (!toUserId || !socket.userId || !sdp) return;
    console.log("[SIGNALLING] group-call-webrtc-answer", { from: socket.userId, toUserId, channelId });
    forwardToUser("group-call-webrtc-answer", toUserId, {
      fromUserId: socket.userId,
      channelId,
      sdp,
    });
  });

  socket.on("group-call-webrtc-ice", (data) => {
    const { toUserId, channelId, candidate } = data;
    if (!toUserId || !socket.userId) return;
    console.log("[SIGNALLING] group-call-webrtc-ice", { from: socket.userId, toUserId, channelId });
    forwardToUser("group-call-webrtc-ice", toUserId, {
      fromUserId: socket.userId,
      channelId,
      candidate,
    });
  });

  // ---------- Ephemeral meeting rooms (participants + chat) ----------
  socket.on("meeting-join", (data) => {
    const { meetingId, name } = data || {};
    if (!meetingId || !socket.userId) return;
    const key = String(meetingId);
    if (!activeMeetings[key]) activeMeetings[key] = {};

    activeMeetings[key][socket.userId] = {
      name: name || `User ${socket.userId}`,
    };

    socket.join(`meeting:${key}`);
    socket.meetingIds.add(key);

    const participants = Object.entries(activeMeetings[key]).map(
      ([userId, info]) => ({
        userId,
        name: info.name,
      })
    );

    io.to(`meeting:${key}`).emit("meeting-participants", {
      meetingId: key,
      participants,
    });
  });

  socket.on("meeting-leave", (data) => {
    const { meetingId } = data || {};
    if (!meetingId || !socket.userId) return;
    const key = String(meetingId);
    const room = activeMeetings[key];
    if (!room) return;

    delete room[socket.userId];
    socket.leave(`meeting:${key}`);
    socket.meetingIds.delete(key);

    const participants = Object.entries(room).map(([userId, info]) => ({
      userId,
      name: info.name,
    }));

    if (participants.length === 0) {
      delete activeMeetings[key];
    }

    io.to(`meeting:${key}`).emit("meeting-participants", {
      meetingId: key,
      participants,
    });
  });

  socket.on("meeting-message", (data) => {
    const { meetingId, message } = data || {};
    if (!meetingId || !socket.userId || !message || !message.content) return;
    const key = String(meetingId);
    if (!activeMeetings[key]) return;

    const safeMessage = {
      id: message.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: socket.userId,
      name: message.name || activeMeetings[key][socket.userId]?.name || "User",
      content: String(message.content).slice(0, 1000),
      createdAt: message.createdAt || new Date().toISOString(),
    };

    io.to(`meeting:${key}`).emit("meeting-message", {
      meetingId: key,
      message: safeMessage,
    });
  });

  socket.on("meeting-end", (data) => {
    const { meetingId } = data || {};
    if (!meetingId || !socket.userId) return;
    const key = String(meetingId);
    const room = activeMeetings[key];
    if (!room) return;

    // Broadcast end, then clear room
    io.to(`meeting:${key}`).emit("meeting-ended", { meetingId: key });

    Object.keys(room).forEach((uid) => {
      const socketId = users[uid];
      if (socketId) {
        const s = io.sockets.sockets.get(socketId);
        if (s) {
          s.leave(`meeting:${key}`);
          if (s.meetingIds && s.meetingIds.has(key)) {
            s.meetingIds.delete(key);
          }
        }
      }
    });

    delete activeMeetings[key];
  });

  // ---------- Meeting media-state broadcast (mute / video / hand raise) ----------
  socket.on("meeting-media-state", (data) => {
    const { meetingId, isMuted, isVideoOff } = data || {};
    if (!meetingId || !socket.userId) return;
    const key = String(meetingId);
    const room = activeMeetings[key];
    if (!room || !room[socket.userId]) return;
    // Store the state so late joiners can see it
    room[socket.userId].isMuted = !!isMuted;
    room[socket.userId].isVideoOff = !!isVideoOff;
    // Broadcast to others in the room
    socket.to(`meeting:${key}`).emit("meeting-media-state", {
      meetingId: key,
      userId: socket.userId,
      isMuted: !!isMuted,
      isVideoOff: !!isVideoOff,
    });
  });

  socket.on("meeting-hand-raise", (data) => {
    const { meetingId, raised } = data || {};
    if (!meetingId || !socket.userId) return;
    const key = String(meetingId);
    const room = activeMeetings[key];
    if (!room || !room[socket.userId]) return;
    room[socket.userId].handRaised = !!raised;
    io.to(`meeting:${key}`).emit("meeting-hand-raise", {
      meetingId: key,
      userId: socket.userId,
      raised: !!raised,
    });
  });

  // ---------- Meeting screen sharing ----------
  socket.on("meeting-screen-share-start", (data) => {
    const { meetingId } = data || {};
    if (!meetingId || !socket.userId) return;
    const key = String(meetingId);
    const room = activeMeetings[key];
    if (!room) return;
    room[socket.userId].screenSharing = true;
    io.to(`meeting:${key}`).emit("meeting-screen-share-start", {
      meetingId: key,
      userId: socket.userId,
      name: room[socket.userId]?.name || "User",
    });
  });

  socket.on("meeting-screen-share-stop", (data) => {
    const { meetingId } = data || {};
    if (!meetingId || !socket.userId) return;
    const key = String(meetingId);
    const room = activeMeetings[key];
    if (!room) return;
    if (room[socket.userId]) room[socket.userId].screenSharing = false;
    io.to(`meeting:${key}`).emit("meeting-screen-share-stop", {
      meetingId: key,
      userId: socket.userId,
    });
  });

  // ---------- Meeting WebRTC signalling (mesh, 1:1 between participants) ----------
  socket.on("meeting-webrtc-offer", (data) => {
    const { meetingId, toUserId, sdp } = data;
    if (!toUserId || !socket.userId || !sdp) return;
    forwardToUser("meeting-webrtc-offer", toUserId, {
      fromUserId: socket.userId,
      meetingId,
      sdp,
    });
  });

  socket.on("meeting-webrtc-answer", (data) => {
    const { meetingId, toUserId, sdp } = data;
    if (!toUserId || !socket.userId || !sdp) return;
    forwardToUser("meeting-webrtc-answer", toUserId, {
      fromUserId: socket.userId,
      meetingId,
      sdp,
    });
  });

  socket.on("meeting-webrtc-ice", (data) => {
    const { meetingId, toUserId, candidate } = data;
    if (!toUserId || !socket.userId) return;
    forwardToUser("meeting-webrtc-ice", toUserId, {
      fromUserId: socket.userId,
      meetingId,
      candidate,
    });
  });

  socket.on("disconnect", () => {
    console.log(
      `Socket disconnected: ${socket.id} (userId=${normalizedUserId})`
    );
    if (normalizedUserId) {
      // Only remove from users map if THIS socket is still the registered one.
      // This prevents a reconnecting user's new socket from being deleted
      // when the old socket's disconnect event fires after the new one registered.
      if (users[normalizedUserId] === socket.id) {
        delete users[normalizedUserId];

        // Remove user from online set only if no active socket remains
        onlineUsers.delete(normalizedUserId);
        console.log(`[ONLINE STATUS] User went offline: ${normalizedUserId}`);

        // Clear call status when user disconnects
        delete userCallStatus[normalizedUserId];

        // Remove user from any active meeting rooms
        if (socket.meetingIds && socket.meetingIds.size > 0) {
          socket.meetingIds.forEach((meetingId) => {
            const room = activeMeetings[meetingId];
            if (!room) return;
            delete room[normalizedUserId];
            const participants = Object.entries(room).map(
              ([userId, info]) => ({
                userId,
                name: info.name,
              })
            );
            if (participants.length === 0) {
              delete activeMeetings[meetingId];
            } else {
              io.to(`meeting:${meetingId}`).emit("meeting-participants", {
                meetingId,
                participants,
              });
            }
          });
        }

        // Broadcast updated online users list
        broadcastOnlineUsers();
      } else {
        console.log(
          `[ONLINE STATUS] Stale socket disconnect ignored for ${normalizedUserId} (old=${socket.id}, current=${users[normalizedUserId]})`
        );
      }
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

export const getUserCallStatus = (userId) => {
  const userIdStr = String(userId);
  return userCallStatus[userIdStr] || { inCall: false };
};

export const setUserCallStatus = (userId, status) => {
  const userIdStr = String(userId);
  userCallStatus[userIdStr] = status;
};

export const clearUserCallStatus = (userId) => {
  const userIdStr = String(userId);
  delete userCallStatus[userIdStr];
};

// Broadcast meeting events to all connected clients (for real-time sync)
export function broadcastMeetingEvent(event, meeting) {
  io.emit("meeting-sync", { event, meeting });
}

export { app, server, io };
