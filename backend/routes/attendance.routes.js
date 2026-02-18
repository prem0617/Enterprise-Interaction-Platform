import express from "express";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";
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

// ─── Admin routes ───
router.get("/all", verifyToken, isAdmin, getAllAttendance);
router.post("/mark", verifyToken, isAdmin, adminMarkAttendance);
router.get("/summary", verifyToken, isAdmin, getAttendanceSummary);
router.post("/holidays", verifyToken, isAdmin, createHoliday);
router.put("/holidays/:id", verifyToken, isAdmin, updateHoliday);
router.delete("/holidays/:id", verifyToken, isAdmin, deleteHoliday);

export default router;
