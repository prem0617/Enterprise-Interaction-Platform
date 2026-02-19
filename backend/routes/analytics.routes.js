import express from "express";
import { verifyToken, requirePermission } from "../middlewares/auth.middleware.js";
import {
  getOverviewStats,
  getMessageActivity,
  getMeetingStats,
  getDepartmentStats,
  getLoginHeatmap,
  getSystemUsageTrends,
  getTopActiveUsers,
  getEmployeeActivityReport,
} from "../controllers/analytics/analytics.controller.js";

const router = express.Router();

// All analytics routes require authentication + analytics:view permission
router.use(verifyToken, requirePermission("analytics:view"));

router.get("/overview", getOverviewStats);
router.get("/messages", getMessageActivity);
router.get("/meetings", getMeetingStats);
router.get("/departments", getDepartmentStats);
router.get("/login-heatmap", getLoginHeatmap);
router.get("/usage-trends", getSystemUsageTrends);
router.get("/top-users", getTopActiveUsers);
router.get("/employee-activity", getEmployeeActivityReport);

export default router;
