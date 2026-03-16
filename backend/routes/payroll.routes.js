import express from "express";
import { upsertPayroll, getAllPayroll, processPayroll, getMyPayroll, getPayrollStats, deletePayroll, getEmployeesForPayroll } from "../controllers/payroll/payroll.controller.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(verifyToken);

// Employee
router.get("/my", getMyPayroll);

// Admin
router.get("/stats", isAdmin, getPayrollStats);
router.get("/employees", isAdmin, getEmployeesForPayroll);
router.get("/", isAdmin, getAllPayroll);
router.post("/", isAdmin, upsertPayroll);
router.put("/:id/process", isAdmin, processPayroll);
router.delete("/:id", isAdmin, deletePayroll);

export default router;
