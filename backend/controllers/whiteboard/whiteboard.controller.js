import User from "../../models/User.js";
import Employee from "../../models/Employee.js";
import WhiteboardSession from "../../models/WhiteboardSession.js";
import { sendEmail } from "../../config/email.js";
import crypto from "crypto";

// Generate unique session ID
const generateSessionId = () => {
  return crypto.randomBytes(8).toString("hex");
};

// Create a new whiteboard session
export const createSession = async (req, res) => {
  try {
    const { name } = req.body;
    const hostId = req.user._id;

    const sessionId = generateSessionId();

    const session = await WhiteboardSession.create({
      session_id: sessionId,
      name: name || "Untitled Whiteboard",
      host_id: hostId,
      participants: [],
      is_active: true
    });

    res.status(201).json({
      sessionId: session.session_id,
      name: session.name,
      message: "Whiteboard session created"
    });
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get session details
export const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await WhiteboardSession.findOne({ session_id: sessionId })
      .populate("host_id", "first_name last_name email")
      .populate("participants.user_id", "first_name last_name email");

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({
      sessionId: session.session_id,
      name: session.name,
      host: {
        id: session.host_id._id,
        name: `${session.host_id.first_name} ${session.host_id.last_name}`,
        email: session.host_id.email
      },
      participants: session.participants.map(p => ({
        userId: p.user_id?._id,
        name: p.user_id ? `${p.user_id.first_name} ${p.user_id.last_name}` : "Unknown",
        email: p.user_id?.email,
        status: p.status,
        joinedAt: p.joined_at
      })),
      canvasData: session.canvas_data,
      isActive: session.is_active,
      createdAt: session.createdAt
    });
  } catch (error) {
    console.error("Get session error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get user's sessions (hosted and participated)
export const getMySessions = async (req, res) => {
  try {
    const userId = req.user._id;

    const sessions = await WhiteboardSession.find({
      $or: [
        { host_id: userId },
        { "participants.user_id": userId }
      ],
      is_active: true
    })
      .populate("host_id", "first_name last_name")
      .sort({ updatedAt: -1 })
      .limit(20);

    res.json({
      sessions: sessions.map(s => ({
        sessionId: s.session_id,
        name: s.name,
        isHost: s.host_id._id.toString() === userId.toString(),
        hostName: `${s.host_id.first_name} ${s.host_id.last_name}`,
        participantCount: s.participants.length,
        updatedAt: s.updatedAt
      }))
    });
  } catch (error) {
    console.error("Get my sessions error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all users for participant selection
export const getAvailableParticipants = async (req, res) => {
  try {
    const currentUserId = req.user._id.toString();
    
    const employees = await Employee.find({})
      .populate({
        path: "user_id",
        select: "first_name last_name email"
      })
      .select("user_id department position is_active");

    const participants = employees
      .filter(emp => {
        if (!emp.user_id) return false;
        if (emp.user_id._id.toString() === currentUserId) return false;
        return true;
      })
      .map(emp => ({
        _id: emp._id,
        userId: emp.user_id._id,
        name: `${emp.user_id.first_name} ${emp.user_id.last_name}`,
        email: emp.user_id.email,
        department: emp.department || "General",
        position: emp.position || "Employee"
      }));

    res.json({ participants });
  } catch (error) {
    console.error("Get participants error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Send whiteboard invitation
export const sendWhiteboardInvite = async (req, res) => {
  try {
    const { participantIds, sessionId, boardName } = req.body;
    const inviterUserId = req.user._id;

    // Get or create session
    let session = await WhiteboardSession.findOne({ session_id: sessionId });
    
    if (!session) {
      session = await WhiteboardSession.create({
        session_id: sessionId,
        name: boardName || "Whiteboard Session",
        host_id: inviterUserId,
        participants: [],
        is_active: true
      });
    }

    const inviter = await User.findById(inviterUserId);
    if (!inviter) {
      return res.status(404).json({ error: "Inviter not found" });
    }

    const inviterName = `${inviter.first_name} ${inviter.last_name}`;

    const employees = await Employee.find({ _id: { $in: participantIds } })
      .populate("user_id", "first_name last_name email");

    if (employees.length === 0) {
      return res.status(404).json({ error: "No participants found" });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const whiteboardUrl = `${frontendUrl}/whiteboard/${sessionId}`;

    // Add participants to session
    for (const emp of employees) {
      const existingParticipant = session.participants.find(
        p => p.user_id?.toString() === emp.user_id._id.toString()
      );
      
      if (!existingParticipant) {
        session.participants.push({
          user_id: emp.user_id._id,
          employee_id: emp._id,
          status: "pending"
        });
      }
    }
    await session.save();

    const invitedParticipants = employees.map(emp => ({
      _id: emp._id,
      userId: emp.user_id._id,
      name: `${emp.user_id.first_name} ${emp.user_id.last_name}`,
      email: emp.user_id.email
    }));

    // Send emails
    let emailsSent = 0;
    let emailError = null;

    try {
      const emailPromises = employees.map(async (emp) => {
        const participantName = emp.user_id.first_name;
        const participantEmail = emp.user_id.email;

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <div style="display: inline-block; background-color: #3b82f6; width: 50px; height: 50px; border-radius: 12px; line-height: 50px;">
                    <span style="color: white; font-size: 24px; font-weight: bold;">EP</span>
                  </div>
                </div>
                
                <h1 style="color: #1f2937; font-size: 24px; font-weight: 600; margin-bottom: 16px; text-align: center;">
                  Whiteboard Invitation
                </h1>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                  Hi ${participantName},
                </p>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                  <strong>${inviterName}</strong> has invited you to collaborate on a whiteboard session: <strong>${boardName || "Whiteboard Session"}</strong>.
                </p>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                  Click the button below to accept and join the whiteboard in real-time.
                </p>
                
                <div style="text-align: center; margin-bottom: 32px;">
                  <a href="${whiteboardUrl}?action=accept" style="display: inline-block; background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin-right: 10px;">
                    Accept & Join
                  </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                  Session ID: <code style="background: #f3f4f6; padding: 2px 8px; border-radius: 4px;">${sessionId}</code>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
                
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                  Enterprise Platform - Collaborative Whiteboard
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        return sendEmail({
          to: participantEmail,
          subject: `${inviterName} invited you to collaborate on Whiteboard`,
          html: emailHtml
        });
      });

      await Promise.all(emailPromises);
      emailsSent = employees.length;
    } catch (err) {
      console.error("Email sending failed:", err.message);
      emailError = "Email service not configured";
    }

    res.json({ 
      message: emailsSent > 0 
        ? `Invitation sent to ${emailsSent} participant(s)` 
        : `Added ${employees.length} participant(s) (email notifications disabled)`,
      sessionId,
      invitedCount: employees.length,
      emailsSent,
      participants: invitedParticipants,
      warning: emailError
    });
  } catch (error) {
    console.error("Send whiteboard invite error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Accept invitation
export const acceptInvitation = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await WhiteboardSession.findOne({ session_id: sessionId });
    
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Find participant and update status
    const participant = session.participants.find(
      p => p.user_id?.toString() === userId.toString()
    );

    if (participant) {
      participant.status = "accepted";
      participant.joined_at = new Date();
      await session.save();
    } else {
      // Add as new participant if not found
      session.participants.push({
        user_id: userId,
        status: "accepted",
        joined_at: new Date()
      });
      await session.save();
    }

    res.json({ 
      message: "Invitation accepted",
      sessionId: session.session_id
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Save canvas state
export const saveCanvas = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { canvasData } = req.body;

    await WhiteboardSession.findOneAndUpdate(
      { session_id: sessionId },
      { canvas_data: canvasData }
    );

    res.json({ message: "Canvas saved" });
  } catch (error) {
    console.error("Save canvas error:", error);
    res.status(500).json({ error: error.message });
  }
};
