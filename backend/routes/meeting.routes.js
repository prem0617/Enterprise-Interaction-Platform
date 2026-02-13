import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import {
  createMeeting,
  getMyMeetings,
  getMeetingById,
  getMeetingByCode,
  updateMeeting,
  cancelMeeting,
} from "../controllers/meeting/meeting.controller.js";

const router = express.Router();

router.post("/", verifyToken, createMeeting);
router.get("/", verifyToken, getMyMeetings);
router.get("/code/:code", verifyToken, getMeetingByCode);
router.get("/join", verifyToken, getMeetingByCode);
router.get("/:id", verifyToken, getMeetingById);
router.put("/:id", verifyToken, updateMeeting);
router.delete("/:id", verifyToken, cancelMeeting);

export default router;

