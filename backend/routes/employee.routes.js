import express from "express";
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  adminResetPasswordToTemp,
  adminChangePassword,
} from "../controllers/employee/employee.controller.js";
import Employee from "../models/Employee.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Lookup by emp_code (e.g. GET /api/employees/code/EIP-0001)
router.get("/code/:empCode", async (req, res) => {
  try {
    const emp = await Employee.findOne({ emp_code: req.params.empCode.toUpperCase() })
      .populate("user_id", "first_name last_name email profile_picture country phone")
      .populate("department", "name code color")
      .populate({ path: "team_lead_id", populate: { path: "user_id", select: "first_name last_name email" } });
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    res.json({ employee: emp });
  } catch (error) {
    res.status(500).json({ error: "Failed to lookup employee" });
  }
});

// Create employee (Admin only)
router.post("/", isAdmin, createEmployee);

// Get all employees
router.get("/", getAllEmployees);

// Get employee by ID
router.get("/:id", getEmployeeById);

// Update employee (Admin only)
router.put("/:id", isAdmin, updateEmployee);

// Admin password reset: temp password + email
router.post("/:id/admin-reset-password", isAdmin, adminResetPasswordToTemp);

// Admin change password directly
router.put("/:id/admin-change-password", isAdmin, adminChangePassword);

// Delete employee (Admin only)
router.delete("/:id", isAdmin, deleteEmployee);


export default router;
