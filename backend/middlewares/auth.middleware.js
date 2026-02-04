import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Employee from "../models/Employee.js";

// Verify JWT Token
export const verifyToken = async (req, res, next) => {
  try {
    // ONLY changed part
    const authHeader = req.headers.authorization;
    // console.log({ authHeader });
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      console.log("no token ");
      return res.status(401).json({ error: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log({ decoded });
    const user = await User.findById(decoded.id).select("-password_hash");
    console.log({ user });
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (user.status !== "active" && user.status !== "pending") {
      return res.status(403).json({ error: "Account is not active" });
    }

    req.user = user;
    req.userId = decoded.id;

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ error: "Token is not valid" });
  }
};

// Check if user is Admin
export const isAdmin = async (req, res, next) => {
  try {
    if (req.user.user_type !== "admin") {
      return res.status(403).json({
        error: "Access denied. Admin privileges required.",
      });
    }
    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Check if user is HR or Admin
export const isHR = async (req, res, next) => {
  try {
    // console.log({ req });
    if (req.user.user_type === "admin") {
      return next();
    }

    if (req.user.user_type === "employee") {
      const employee = await Employee.findOne({ user_id: req.user._id });

      if (!employee) {
        return res.status(403).json({ error: "Employee record not found" });
      }

      if (
        employee.department === "hr" ||
        employee.position === "ceo" ||
        employee.position === "team_lead"
      ) {
        return next();
      }
    }

    return res.status(403).json({
      error: "Access denied. HR or Admin privileges required.",
    });
  } catch (error) {
    console.error("HR check error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Check if user is team lead
export const isTeamLead = async (req, res, next) => {
  try {
    if (req.user.user_type === "admin") {
      return next();
    }

    if (req.user.user_type === "employee") {
      const employee = await Employee.findOne({ user_id: req.user._id });

      if (!employee) {
        return res.status(403).json({ error: "Employee record not found" });
      }

      if (
        employee.position === "team_lead" ||
        employee.position === "ceo" ||
        employee.position === "cto"
      ) {
        return next();
      }
    }

    return res.status(403).json({
      error: "Access denied. Team lead privileges required.",
    });
  } catch (error) {
    console.error("Team lead check error:", error);
    res.status(500).json({ error: error.message });
  }
};
