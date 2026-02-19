import express from "express";
import { verifyToken, requirePermission } from "../middlewares/auth.middleware.js";
import {
  checkIn,
  checkOut,
  getMyAttendanceToday,
  getMyAttendanceHistory,
  getAllAttendance,
  adminMarkAttendance,
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getAttendanceSummary,
} from "../controllers/attendance/attendance.controller.js";

const router = express.Router();

// ─── Employee routes (auth required) ───
router.post("/check-in", verifyToken, checkIn);
router.post("/check-out", verifyToken, checkOut);
router.get("/today", verifyToken, getMyAttendanceToday);
router.get("/history", verifyToken, getMyAttendanceHistory);
router.get("/holidays", verifyToken, getHolidays);

// ─── Admin/HR routes ───
router.get("/all", verifyToken, requirePermission("attendance:read_all"), getAllAttendance);
router.post("/mark", verifyToken, requirePermission("attendance:manage"), adminMarkAttendance);
router.get("/summary", verifyToken, requirePermission("attendance:read_all"), getAttendanceSummary);
router.post("/holidays", verifyToken, requirePermission("attendance:manage"), createHoliday);
router.put("/holidays/:id", verifyToken, requirePermission("attendance:manage"), updateHoliday);
router.delete("/holidays/:id", verifyToken, requirePermission("attendance:manage"), deleteHoliday);

export default router;
