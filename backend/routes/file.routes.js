import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { extractFileContent } from "../controllers/file/filemessage.controller.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Create employee (Admin or HR only)
router.get("/:fileId/content", extractFileContent);

export default router;
