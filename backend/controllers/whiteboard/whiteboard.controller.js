import User from "../../models/User.js";
import Employee from "../../models/Employee.js";
import { sendEmail } from "../../config/email.js";

// Get all users for participant selection
export const getAvailableParticipants = async (req, res) => {
  try {
    const currentUserId = req.user._id.toString();
    
    // Get all employees (both active and inactive for now, or filter as needed)
    const employees = await Employee.find({})
      .populate({
        path: "user_id",
        select: "first_name last_name email"
      })
      .select("user_id department position is_active");

    // Filter out current user and employees without user data
    const participants = employees
      .filter(emp => {
        // Skip if no user data
        if (!emp.user_id) return false;
        // Skip current user
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

// Send whiteboard invitation email
export const sendWhiteboardInvite = async (req, res) => {
  try {
    const { participantIds, boardName, boardId } = req.body;
    const inviterUserId = req.user._id;

    // Get inviter details
    const inviter = await User.findById(inviterUserId);
    if (!inviter) {
      return res.status(404).json({ error: "Inviter not found" });
    }

    const inviterName = `${inviter.first_name} ${inviter.last_name}`;

    // Get participant emails
    const employees = await Employee.find({ _id: { $in: participantIds } })
      .populate("user_id", "first_name last_name email");

    if (employees.length === 0) {
      return res.status(404).json({ error: "No participants found" });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const whiteboardUrl = `${frontendUrl}/whiteboard/${boardId || "session"}`;

    // Get participant details for response
    const invitedParticipants = employees.map(emp => ({
      _id: emp._id,
      name: `${emp.user_id.first_name} ${emp.user_id.last_name}`,
      email: emp.user_id.email
    }));

    // Try to send emails (gracefully handle failures)
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
                  <strong>${inviterName}</strong> has invited you to collaborate on a whiteboard session${boardName ? `: <strong>${boardName}</strong>` : ""}.
                </p>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                  Click the button below to join the whiteboard and start collaborating in real-time.
                </p>
                
                <div style="text-align: center; margin-bottom: 32px;">
                  <a href="${whiteboardUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Join Whiteboard
                  </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                  Or copy this link: <a href="${whiteboardUrl}" style="color: #3b82f6;">${whiteboardUrl}</a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
                
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                  Enterprise Platform - Internal Communication System
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        return sendEmail({
          to: participantEmail,
          subject: `${inviterName} invited you to a Whiteboard session`,
          html: emailHtml
        });
      });

      await Promise.all(emailPromises);
      emailsSent = employees.length;
    } catch (err) {
      console.error("Email sending failed:", err.message);
      emailError = "Email service not configured";
    }

    // Return success with participant info (even if emails failed)
    res.json({ 
      message: emailsSent > 0 
        ? `Invitation sent to ${emailsSent} participant(s)` 
        : `Added ${employees.length} participant(s) (email notifications disabled)`,
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
