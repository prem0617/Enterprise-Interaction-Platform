import express from "express";
import { uploadSharedFile, getSharedFiles, deleteSharedFile } from "../controllers/sharedfile/sharedfile.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();
router.use(verifyToken);

router.get("/", getSharedFiles);
router.post("/", upload.single("file"), uploadSharedFile);
router.delete("/:id", deleteSharedFile);

export default router;
