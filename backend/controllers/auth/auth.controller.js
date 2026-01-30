import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../../models/User.js";
import Employee from "../../models/Employee.js";
import { sendEmail } from "../../utils/emailService.js";

// Admin Signup
export const adminSignup = async (req, res) => {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      country,
      timezone,
      company_id,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create admin user
    const user = new User({
      email: email.toLowerCase(),
      password_hash,
      user_type: "admin",
      status: "active",
      first_name,
      last_name,
      phone,
      country,
      timezone: timezone || "UTC",
      company_id,
    });

    await user.save();

    // Create employee record for admin
    const employee = new Employee({
      user_id: user._id,
      employee_type: "internal_team",
      department: "hr",
      position: "ceo",
      hire_date: new Date(),
      is_active: true,
    });

    await employee.save();

    // Generate token
    const token = jwt.sign(
      { id: user._id, user_type: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Admin account created successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        user_type: user.user_type,
      },
    });
  } catch (error) {
    console.error("Admin signup error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Admin Login
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({
      email: email.toLowerCase(),
      user_type: "admin",
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if account is active
    if (user.status !== "active") {
      return res.status(403).json({ error: "Account is not active" });
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign(
      { id: user._id, user_type: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        user_type: user.user_type,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Employee Login
export const employeeLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({
      email: email.toLowerCase(),
      user_type: "employee",
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if account is active
    if (user.status !== "active") {
      return res.status(403).json({ error: "Account is not active" });
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Get employee details
    const employee = await Employee.findOne({ user_id: user._id });

    // Generate token
    const token = jwt.sign(
      { id: user._id, user_type: user.user_type, employee_id: employee._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        user_type: user.user_type,
        password_changed: user.password_changed || false,
        employee: {
          id: employee._id,
          department: employee.department,
          position: employee.position,
        },
      },
    });
  } catch (error) {
    console.error("Employee login error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Change Password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "New password must be at least 6 characters long",
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    
    // Mark password as changed (for first-time login flow)
    user.password_changed = true;

    await user.save();

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: "Password Changed Successfully",
      html: `
        <h2>Password Changed</h2>
        <p>Hello ${user.first_name},</p>
        <p>Your password has been changed successfully.</p>
        <p>If you did not make this change, please contact support immediately.</p>
        <br>
        <p>Best regards,<br>Your Team</p>
      `,
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Request Password Reset
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists
      return res.json({
        message: "If an account exists, a reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save hashed token to user (you'll need to add these fields to User model)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Send email
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <h2>Password Reset Request</h2>
        <p>Hello ${user.first_name},</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this reset, please ignore this email.</p>
        <br>
        <p>Best regards,<br>Your Team</p>
      `,
    });

    res.json({
      message: "If an account exists, a reset link has been sent",
    });
  } catch (error) {
    console.error("Request password reset error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Validate password
    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long",
      });
    }

    // Hash the token from URL
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        error: "Invalid or expired reset token",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: "Password Reset Successful",
      html: `
        <h2>Password Reset Successful</h2>
        <p>Hello ${user.first_name},</p>
        <p>Your password has been reset successfully.</p>
        <p>You can now log in with your new password.</p>
        <br>
        <p>Best regards,<br>Your Team</p>
      `,
    });

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: error.message });
  }
};
