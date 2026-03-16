import express from "express";
import { createReview, createBulkReviews, getAllReviews, getMyReviews, submitSelfReview, submitManagerReview, getReviewById } from "../controllers/performance/performance.controller.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(verifyToken);

// Employee
router.get("/my", getMyReviews);
router.put("/:id/self-review", submitSelfReview);

// Admin
router.get("/", isAdmin, getAllReviews);
router.post("/", isAdmin, createReview);
router.post("/bulk", isAdmin, createBulkReviews);
router.put("/:id/manager-review", isAdmin, submitManagerReview);

// Shared
router.get("/:id", getReviewById);

export default router;
