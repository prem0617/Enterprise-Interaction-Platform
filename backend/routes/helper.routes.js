import express from "express";
import { isAdmin, verifyToken } from "../middlewares/auth.middleware.js";

import { getTeamLead } from "../controllers/helper/getTeamLead.controller.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get team leads (Admin only)
router.get("/getTeamLead", isAdmin, getTeamLead);

export default router;
