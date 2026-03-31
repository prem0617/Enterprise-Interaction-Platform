// routes/document.routes.js
import express from "express";
import {
  createDocument,
  listDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  getDocumentVersions,
  getDocumentVersionSnapshot,
  createDocumentVersion,
  saveDocumentVersionContent,
  getCollaborators,
  addCollaborator,
  updateCollaboratorAccess,
  removeCollaborator,
  searchUsers,
  getDocumentByShareToken,
  autoSaveDocument,
} from "../controllers/document/document.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ── Public share-link access (no auth) ────────────────────────────────────────
router.get("/share/:token", getDocumentByShareToken);

// All routes below require authentication
router.use(verifyToken);

// ── User search (must be before /:id to avoid route collision) ────────────────
// GET /documents/search-users?q=john&docId=xxx
router.get("/search-users", searchUsers);

// ── Document CRUD ─────────────────────────────────────────────────────────────
router.get("/",      listDocuments);
router.post("/",     createDocument);
// ── Manual versions (must be before /:id) ────────────────────────────────────
router.get("/:id/versions", getDocumentVersions);
router.get("/:id/versions/:versionNumber", getDocumentVersionSnapshot);
router.post("/:id/versions", createDocumentVersion);
router.put("/:id/versions/:versionNumber/content", saveDocumentVersionContent);
router.get("/:id",   getDocumentById);
router.put("/:id",   updateDocument);
router.patch("/:id", autoSaveDocument);
router.delete("/:id", deleteDocument);

// ── Collaborator management ───────────────────────────────────────────────────
// GET    /documents/:id/collaborators             — list collaborators
// POST   /documents/:id/collaborators             — add collaborator  { userId, access }
// PATCH  /documents/:id/collaborators/:userId     — change access     { access }
// DELETE /documents/:id/collaborators/:userId     — remove collaborator
router.get("/:id/collaborators",              getCollaborators);
router.post("/:id/collaborators",             addCollaborator);
router.patch("/:id/collaborators/:userId",    updateCollaboratorAccess);
router.delete("/:id/collaborators/:userId",   removeCollaborator);

export default router;