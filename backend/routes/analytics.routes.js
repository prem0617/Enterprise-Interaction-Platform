import express from "express";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";
import {
  getAnalyticsOverview,
  getMyStats,
  getMyAttendanceTrend,
} from "../controllers/analytics/analytics.controller.js";

const router = express.Router();

// ─── Admin analytics (admin only) ───
router.get("/overview", verifyToken, isAdmin, getAnalyticsOverview);

// ─── Employee personal stats (any authenticated user) ───
router.get("/my-stats", verifyToken, getMyStats);

// ─── Employee personal attendance trend (7 days) ───
router.get("/my-attendance-trend", verifyToken, getMyAttendanceTrend);

export default router;
