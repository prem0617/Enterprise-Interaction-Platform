import express from "express";
import { requestCall } from "../controllers/call/call.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/request", verifyToken, requestCall);

export default router;
