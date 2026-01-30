import express from "express";
import {
  getAvailableParticipants,
  sendWhiteboardInvite
} from "../controllers/whiteboard/whiteboard.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get available participants for whiteboard
router.get("/participants", getAvailableParticipants);

// Send whiteboard invitation
router.post("/invite", sendWhiteboardInvite);

export default router;
