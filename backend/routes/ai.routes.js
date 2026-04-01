import express from "express";

import { verifyToken } from "../middlewares/auth.middleware.js";
import { chatSummary, documentQA, documentEdit, whiteboardDiagram } from "../controllers/ai/ai.controller.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

router.get("/chatsummary/:channel_id", chatSummary);
router.post("/documents/:document_id/qa", documentQA);
router.post("/documents/:document_id/edit", documentEdit);
router.post("/whiteboards/:whiteboard_id/diagram", whiteboardDiagram);

export default router;
