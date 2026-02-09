import express from "express";
import {
  adminSignup,
  adminLogin,
  employeeLogin,
  changePassword,
  requestPasswordReset,
  resetPassword,
  getProfile,
  updateProfile,
} from "../controllers/auth/auth.controller.js";
import { verifyToken, isAdmin, isHR } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Admin routes
router.post("/admin/signup", adminSignup);
router.post("/admin/login", adminLogin);

// Employee routes
router.post("/employee/login", employeeLogin);

// Protected routes
router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);
router.post("/change-password", verifyToken, changePassword);
router.post("/request-reset", requestPasswordReset);
router.post("/reset-password/:token", resetPassword);

export default router;
