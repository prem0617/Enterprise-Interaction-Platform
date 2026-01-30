import express from "express";
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  updateOwnProfile,
  getOwnProfile,
} from "../controllers/employee/employee.controller.js";
import { verifyToken, isAdmin, isHR } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Profile routes (for logged-in user) - must be before /:id routes
router.get("/profile/me", getOwnProfile);
router.put("/profile/me", updateOwnProfile);

// Create employee (Admin or HR only)
router.post("/", isHR, createEmployee);

// Get all employees
router.get("/", getAllEmployees);

// Get employee by ID
router.get("/:id", getEmployeeById);

// Update employee (Admin or HR only)
router.put("/:id", isHR, updateEmployee);

// Delete employee (Admin only)
router.delete("/:id", isAdmin, deleteEmployee);

export default router;
