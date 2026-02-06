import express from "express";
import {
  createMeeting,
  getMyMeetings,
  getUpcomingMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  getAvailableParticipants
} from "../controllers/meeting/meeting.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Meeting CRUD
router.post("/", createMeeting);
router.get("/", getMyMeetings);
router.get("/upcoming", getUpcomingMeetings);
router.get("/participants", getAvailableParticipants);
router.get("/:id", getMeeting);
router.put("/:id", updateMeeting);
router.delete("/:id", deleteMeeting);

export default router;
