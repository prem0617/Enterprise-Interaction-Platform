import express from "express";
import { getDirectory, getOrgTree } from "../controllers/employee/directory.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(verifyToken);

router.get("/", getDirectory);
router.get("/org-tree", getOrgTree);

export default router;
