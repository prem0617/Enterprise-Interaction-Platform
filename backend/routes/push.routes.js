import express from "express";
import {
  getVapidPublic,
  subscribe,
  unsubscribe,
  subscribeFcm,
  unsubscribeFcm,
  verifyCallToken,
  postCallResponse,
} from "../controllers/push/push.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/vapid-public", getVapidPublic);
router.post("/verify-call-token", verifyCallToken);
router.post("/call-response", postCallResponse);

router.post("/subscribe", verifyToken, subscribe);
router.post("/unsubscribe", verifyToken, unsubscribe);

// ─── FCM (Firebase Cloud Messaging) ─────────────────────────────
router.post("/subscribe-fcm", verifyToken, subscribeFcm);
router.post("/unsubscribe-fcm", verifyToken, unsubscribeFcm);

export default router;
