import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import {
  createWhiteboard,
  getMyWhiteboards,
  getWhiteboardById,
  getWhiteboardVersions,
  getWhiteboardVersionSnapshot,
  createWhiteboardVersion,
  createWhiteboardVersionSnapshot,
  renameWhiteboardVersion,
  joinByCode,
  updateWhiteboard,
  saveContent,
  saveVersionContent,
  archiveWhiteboard,
  deleteWhiteboard,
} from "../controllers/whiteboard/whiteboard.controller.js";

const router = Router();
router.use(verifyToken);

router.post("/", createWhiteboard);
router.get("/", getMyWhiteboards);
router.get("/join/:code", joinByCode);
router.get("/:id/versions", getWhiteboardVersions);
router.get("/:id/versions/:versionNumber", getWhiteboardVersionSnapshot);
router.post("/:id/versions", createWhiteboardVersion);
router.post("/:id/versions/snapshot", createWhiteboardVersionSnapshot);
router.patch("/:id/versions/:versionNumber", renameWhiteboardVersion);
router.put("/:id/versions/:versionNumber/content", saveVersionContent);
router.get("/:id", getWhiteboardById);
router.put("/:id", updateWhiteboard);
router.put("/:id/content", saveContent);
router.patch("/:id/archive", archiveWhiteboard);
router.delete("/:id", deleteWhiteboard);

export default router;
