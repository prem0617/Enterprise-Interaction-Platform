// Load environment variables FIRST (side-effect import for ES modules)
import "dotenv/config";

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/database.js";
import authRoutes from "./routes/auth.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import helperRoutes from "./routes/helper.routes.js";
import whiteboardRoutes from "./routes/whiteboard.routes.js";
import meetingRoutes from "./routes/meeting.routes.js";
import messageRoutes from "./routes/message.routes.js";
import { verifyEmailConfig } from "./utils/emailService.js";
import { setupWhiteboardSocket } from "./sockets/whiteboard.socket.js";
import { setupMessageSocket } from "./sockets/message.socket.js";
import cors from "cors";

const app = express();
const httpServer = createServer(app);

// Socket.IO setup with CORS
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Setup socket handlers
setupWhiteboardSocket(io);
setupMessageSocket(io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS (if needed)
app.use(
  cors({
    origin: "http://localhost:5173", // Your frontend URL
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

// Connect to MongoDB
connectDB();

// Verify email configuration
verifyEmailConfig();

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "API is running",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      employees: "/api/employees",
      whiteboard: "/api/whiteboard",
      meetings: "/api/meetings",
      messages: "/api/messages",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/helper", helperRoutes);
app.use("/api/whiteboard", whiteboardRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/messages", messageRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
