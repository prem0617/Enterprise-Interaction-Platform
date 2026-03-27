import express from "express";
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getOrgTree,
  assignDepartmentHead,
  getDepartmentMembers,
  assignTeamMembers,
} from "../controllers/department/department.controller.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", getAllDepartments);
router.get("/org-tree", getOrgTree);
router.get("/:id", getDepartmentById);
router.get("/:id/members", getDepartmentMembers);
router.post("/", isAdmin, createDepartment);
router.put("/:id", isAdmin, updateDepartment);
router.put("/:id/head", isAdmin, assignDepartmentHead);
router.put("/:id/members", isAdmin, assignTeamMembers);
router.delete("/:id", isAdmin, deleteDepartment);

export default router;
