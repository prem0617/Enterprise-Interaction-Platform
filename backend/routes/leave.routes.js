import express from "express";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";
import {
  getMyLeaveBalance,
  requestLeave,
  cancelLeave,
  getMyLeaveRequests,
  getAllLeaveRequests,
  updateLeaveStatus,
  getAllLeaveBalances,
  updateLeaveBalance,
} from "../controllers/leave/leave.controller.js";

const router = express.Router();

// ─── Employee routes ───
router.get("/balance", verifyToken, getMyLeaveBalance);
router.post("/request", verifyToken, requestLeave);
router.put("/cancel/:id", verifyToken, cancelLeave);
router.get("/my-requests", verifyToken, getMyLeaveRequests);

// ─── Admin routes ───
router.get("/all-requests", verifyToken, isAdmin, getAllLeaveRequests);
router.put("/update-status/:id", verifyToken, isAdmin, updateLeaveStatus);
router.get("/all-balances", verifyToken, isAdmin, getAllLeaveBalances);
router.put("/update-balance", verifyToken, isAdmin, updateLeaveBalance);

export default router;
