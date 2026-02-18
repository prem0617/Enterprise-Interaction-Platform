import express from "express";
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getOrgTree,
  assignDepartmentHead,
} from "../controllers/department/department.controller.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", getAllDepartments);
router.get("/org-tree", getOrgTree);
router.get("/:id", getDepartmentById);
router.post("/", isAdmin, createDepartment);
router.put("/:id", isAdmin, updateDepartment);
router.put("/:id/head", isAdmin, assignDepartmentHead);
router.delete("/:id", isAdmin, deleteDepartment);

export default router;
