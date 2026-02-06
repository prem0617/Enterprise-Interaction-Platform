import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import connectDB from "./config/database.js";
import authRoutes from "./routes/auth.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import helperRoutes from "./routes/helper.routes.js";
import chatRouter from "./routes/chat.routes.js";
import directChatRouter from "./routes/directChat.routes.js";
import callRoutes from "./routes/call.routes.js";
import { verifyEmailConfig } from "./utils/emailService.js";
import { server, app } from "./socket/socketServer.js";
import { FRONTEND_URL } from "../frontend/config.js";
// Load environment variables
dotenv.config();

// const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
// app.use(cors({
//   origin: "*",        // allow all origins
//   credentials: true
// }));


const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  FRONTEND_URL,
  "https://unsigned-vocals-induction-closing.trycloudflare.com",
  "https://lift-python-lines-separately.trycloudflare.com",
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));



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
      helper: "/api/helper",
      chat: "/api/chat",
      direct_chat: "/api/direct_chat",
      call: "/api/call",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/helper", helperRoutes);
app.use("/api/chat", chatRouter);
app.use("/api/direct_chat", directChatRouter);
app.use("/api/call", callRoutes);

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

server.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`Server running on port ${PORT}`);
  console.log(`HTTP: http://localhost:${PORT}`);
  console.log(`Socket.IO: ws://localhost:${PORT}`);
  console.log(`=================================`);
});

export default app;
