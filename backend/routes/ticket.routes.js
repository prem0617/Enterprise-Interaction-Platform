import express from "express";
import {
  createTicket,
  getMyTickets,
  getAllTickets,
  getTicket,
  assignTicket,
  updateTicketStatus,
  getInternalEmployees,
  getAssignedTickets,
  sendTicketMessage,
  getTicketMessages,
} from "../controllers/ticket/ticket.controller.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Customer routes
router.post("/", verifyToken, createTicket);
router.get("/my-tickets", verifyToken, getMyTickets);

// Employee routes (assigned tickets)
router.get("/assigned", verifyToken, getAssignedTickets);

// Admin routes
router.get("/all", verifyToken, isAdmin, getAllTickets);
router.put("/:ticketId/assign", verifyToken, isAdmin, assignTicket);
router.get("/internal-employees", verifyToken, isAdmin, getInternalEmployees);

// Shared routes
router.get("/:ticketId", verifyToken, getTicket);
router.put("/:ticketId/status", verifyToken, updateTicketStatus);

// Ticket chat
router.post("/:ticketId/messages", verifyToken, sendTicketMessage);
router.get("/:ticketId/messages", verifyToken, getTicketMessages);

export default router;
