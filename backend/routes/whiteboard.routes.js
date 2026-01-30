import express from "express";
import {
  createSession,
  getSession,
  getMySessions,
  getAvailableParticipants,
  sendWhiteboardInvite,
  acceptInvitation,
  saveCanvas
} from "../controllers/whiteboard/whiteboard.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Session management
router.post("/sessions", createSession);
router.get("/sessions", getMySessions);
router.get("/sessions/:sessionId", getSession);
router.post("/sessions/:sessionId/accept", acceptInvitation);
router.put("/sessions/:sessionId/canvas", saveCanvas);

// Participants
router.get("/participants", getAvailableParticipants);
router.post("/invite", sendWhiteboardInvite);

export default router;
