import { SupportTicket } from "../../models/SupportTicket.js";
import { Customer } from "../../models/Customer.js";
import { TicketMessage } from "../../models/TicketMessage.js";
import User from "../../models/User.js";
import Employee from "../../models/Employee.js";

// Generate unique ticket number
function generateTicketNumber() {
  const prefix = "TKT";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Create a new ticket (customer)
export const createTicket = async (req, res) => {
  try {
    const { title, description, priority, category, country } = req.body;
    const userId = req.user._id;

    const customer = await Customer.findOne({ user_id: userId });
    if (!customer) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    const ticket = new SupportTicket({
      ticket_number: generateTicketNumber(),
      customer_id: customer._id,
      title,
      description,
      priority: priority || "medium",
      category,
      country: country || req.user.country,
      status: "pending",
    });

    await ticket.save();

    // Create a system message
    await TicketMessage.create({
      ticket_id: ticket._id,
      sender_id: userId,
      content: "Ticket created. Waiting for an agent to be assigned.",
      message_type: "system",
    });

    res.status(201).json({
      message: "Ticket created successfully",
      ticket,
    });
  } catch (error) {
    console.error("Create ticket error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get tickets for customer
export const getMyTickets = async (req, res) => {
  try {
    const userId = req.user._id;
    const customer = await Customer.findOne({ user_id: userId });
    if (!customer) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    const tickets = await SupportTicket.find({ customer_id: customer._id })
      .populate({
        path: "assigned_agent_id",
        populate: { path: "user_id", select: "first_name last_name email" },
      })
      .sort({ created_at: -1 });

    res.json({ tickets });
  } catch (error) {
    console.error("Get my tickets error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all tickets (admin)
export const getAllTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate({
        path: "customer_id",
        populate: { path: "user_id", select: "first_name last_name email" },
      })
      .populate({
        path: "assigned_agent_id",
        populate: { path: "user_id", select: "first_name last_name email" },
      })
      .sort({ created_at: -1 });

    res.json({ tickets });
  } catch (error) {
    console.error("Get all tickets error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get single ticket
export const getTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await SupportTicket.findById(ticketId)
      .populate({
        path: "customer_id",
        populate: { path: "user_id", select: "first_name last_name email" },
      })
      .populate({
        path: "assigned_agent_id",
        populate: { path: "user_id", select: "first_name last_name email" },
      });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.json({ ticket });
  } catch (error) {
    console.error("Get ticket error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Assign ticket to an internal employee (admin)
export const assignTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { employee_id } = req.body;

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const employee = await Employee.findById(employee_id).populate(
      "user_id",
      "first_name last_name"
    );
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    ticket.assigned_agent_id = employee._id;
    ticket.status = "open";
    await ticket.save();

    // System message
    const agentName = `${employee.user_id.first_name} ${employee.user_id.last_name}`;
    await TicketMessage.create({
      ticket_id: ticket._id,
      sender_id: req.user._id,
      content: `Ticket assigned to ${agentName}. You can now chat to resolve this issue.`,
      message_type: "system",
    });

    const updatedTicket = await SupportTicket.findById(ticketId)
      .populate({
        path: "customer_id",
        populate: { path: "user_id", select: "first_name last_name email" },
      })
      .populate({
        path: "assigned_agent_id",
        populate: { path: "user_id", select: "first_name last_name email" },
      });

    res.json({
      message: "Ticket assigned successfully",
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Assign ticket error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update ticket status
export const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    ticket.status = status;
    if (status === "resolved") {
      ticket.resolved_at = new Date();
    }
    await ticket.save();

    // System message
    await TicketMessage.create({
      ticket_id: ticket._id,
      sender_id: req.user._id,
      content: `Ticket status changed to "${status}".`,
      message_type: "system",
    });

    res.json({ message: "Ticket status updated", ticket });
  } catch (error) {
    console.error("Update ticket status error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get internal_team employees for assignment (admin)
export const getInternalEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ employee_type: "internal_team", is_active: true })
      .populate("user_id", "first_name last_name email");

    res.json({ employees });
  } catch (error) {
    console.error("Get internal employees error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get tickets assigned to current employee
export const getAssignedTickets = async (req, res) => {
  try {
    const userId = req.user._id;
    const employee = await Employee.findOne({ user_id: userId });
    if (!employee) {
      return res.status(404).json({ error: "Employee profile not found" });
    }

    const tickets = await SupportTicket.find({ assigned_agent_id: employee._id })
      .populate({
        path: "customer_id",
        populate: { path: "user_id", select: "first_name last_name email" },
      })
      .sort({ created_at: -1 });

    res.json({ tickets });
  } catch (error) {
    console.error("Get assigned tickets error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Send ticket message
export const sendTicketMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // Verify sender is related to ticket
    const customer = await Customer.findOne({ user_id: userId });
    const employee = await Employee.findOne({ user_id: userId });
    const isAdmin = req.user.user_type === "admin";

    const isCustomerOwner = customer && ticket.customer_id.toString() === customer._id.toString();
    const isAssignedAgent = employee && ticket.assigned_agent_id?.toString() === employee._id.toString();

    if (!isCustomerOwner && !isAssignedAgent && !isAdmin) {
      return res.status(403).json({ error: "Not authorized to send messages in this ticket" });
    }

    // Update ticket status to in_progress if it was open
    if (ticket.status === "open") {
      ticket.status = "in_progress";
      await ticket.save();
    }

    const message = await TicketMessage.create({
      ticket_id: ticketId,
      sender_id: userId,
      content,
      message_type: "text",
    });

    const populatedMessage = await TicketMessage.findById(message._id).populate(
      "sender_id",
      "first_name last_name user_type profile_picture"
    );

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    console.error("Send ticket message error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get ticket messages
export const getTicketMessages = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const messages = await TicketMessage.find({ ticket_id: ticketId })
      .populate("sender_id", "first_name last_name user_type profile_picture")
      .sort({ created_at: 1 });

    res.json({ messages });
  } catch (error) {
    console.error("Get ticket messages error:", error);
    res.status(500).json({ error: error.message });
  }
};
