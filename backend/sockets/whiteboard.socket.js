import WhiteboardSession from "../models/WhiteboardSession.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// Track active users per session
const sessionUsers = new Map();

export const setupWhiteboardSocket = (io) => {
  // Auth middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      
      // Get user details for display name
      try {
        const user = await User.findById(decoded.id).select("first_name last_name email");
        if (user) {
          socket.userName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "User";
        } else {
          socket.userName = "User";
        }
      } catch (e) {
        socket.userName = "User";
      }
      
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.userId} (${socket.userName})`);

    // Join a whiteboard session
    socket.on("join-session", async ({ sessionId }) => {
      try {
        if (!sessionId) {
          socket.emit("error", { message: "Session ID required" });
          return;
        }

        socket.join(sessionId);
        socket.currentSession = sessionId;

        // Track user in session
        if (!sessionUsers.has(sessionId)) {
          sessionUsers.set(sessionId, new Map());
        }
        sessionUsers.get(sessionId).set(socket.id, {
          oduserId: socket.userId,
          oduserId: socket.userId,
          userName: socket.userName,
          odisocketId: socket.id
        });

        // Try to get existing session data
        let canvasData = null;
        try {
          const session = await WhiteboardSession.findOne({ session_id: sessionId });
          if (session && session.canvas_data) {
            canvasData = session.canvas_data;
          }
        } catch (err) {
          console.error("Error fetching session:", err);
        }

        // Send session info to the joining user
        socket.emit("session-joined", {
          sessionId,
          canvasData,
          participants: Array.from(sessionUsers.get(sessionId).values())
        });

        // Notify other users in the session
        socket.to(sessionId).emit("user-joined", {
          userName: socket.userName,
          participants: Array.from(sessionUsers.get(sessionId).values())
        });

        console.log(`👤 User ${socket.userName} joined session: ${sessionId}`);
      } catch (error) {
        console.error("Join session error:", error);
        socket.emit("error", { message: "Failed to join session" });
      }
    });

    // Handle drawing a line segment (real-time)
    socket.on("draw-line", (data) => {
      const { sessionId, fromX, fromY, toX, toY, color, width } = data;
      if (!sessionId) return;

      // Broadcast to all other users in the session
      socket.to(sessionId).emit("draw-line", {
        fromX, fromY, toX, toY, color, width
      });
    });

    // Handle drawing a shape (real-time)
    socket.on("draw-shape", (data) => {
      const { sessionId, type, startX, startY, endX, endY, color, width } = data;
      if (!sessionId) return;

      socket.to(sessionId).emit("draw-shape", {
        type, startX, startY, endX, endY, color, width
      });
    });

    // Handle clear canvas
    socket.on("clear-canvas", ({ sessionId }) => {
      if (!sessionId) return;
      socket.to(sessionId).emit("clear-canvas");
    });

    // Save canvas state to database
    socket.on("save-canvas", async ({ sessionId, canvasData }) => {
      if (!sessionId || !canvasData) return;

      try {
        // First try to update existing session
        const existingSession = await WhiteboardSession.findOne({ session_id: sessionId });
        
        if (existingSession) {
          // Update existing session
          existingSession.canvas_data = canvasData;
          await existingSession.save();
        } else {
          // Create new session with proper ObjectId
          const hostId = new mongoose.Types.ObjectId(socket.userId);
          await WhiteboardSession.create({
            session_id: sessionId,
            name: "Whiteboard Session",
            host_id: hostId,
            canvas_data: canvasData,
            is_active: true
          });
        }
      } catch (error) {
        console.error("Save canvas error:", error.message);
      }
    });

    // Request current canvas state (for syncing)
    socket.on("request-canvas", ({ sessionId }) => {
      if (!sessionId) return;
      
      // Ask other users in the session to share their canvas
      socket.to(sessionId).emit("request-canvas-response", {
        requesterId: socket.id
      });
    });

    // Respond with canvas data
    socket.on("send-canvas", ({ targetSocketId, canvasData }) => {
      if (!targetSocketId || !canvasData) return;
      
      io.to(targetSocketId).emit("canvas-update", { canvasData });
    });

    // Cursor position (for showing other users' cursors)
    socket.on("cursor-move", ({ sessionId, x, y }) => {
      if (!sessionId) return;
      
      socket.to(sessionId).emit("cursor-update", {
        oduserId: socket.userId,
        userName: socket.userName,
        x, y
      });
    });

    // Leave session
    socket.on("leave-session", ({ sessionId }) => {
      if (sessionId) {
        leaveSession(socket, sessionId, io);
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.userId}`);
      if (socket.currentSession) {
        leaveSession(socket, socket.currentSession, io);
      }
    });
  });
};

function leaveSession(socket, sessionId, io) {
  socket.leave(sessionId);

  if (sessionUsers.has(sessionId)) {
    sessionUsers.get(sessionId).delete(socket.id);

    // Notify remaining users
    io.to(sessionId).emit("user-left", {
      userName: socket.userName,
      participants: Array.from(sessionUsers.get(sessionId).values())
    });

    // Clean up empty sessions
    if (sessionUsers.get(sessionId).size === 0) {
      sessionUsers.delete(sessionId);
    }
  }

  socket.currentSession = null;
}
