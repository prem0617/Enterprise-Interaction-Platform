import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import Employee from "../../models/Employee.js";
import { sendEmail } from "../../utils/emailService.js";
import { generateTempPassword } from "../../utils/passwordGenerator.js";

// Create Employee (Admin/HR only)
export const createEmployee = async (req, res) => {
  try {
    const {
      email,
      first_name,
      last_name,
      phone,
      country,
      timezone,
      employee_type,
      department,
      position,
      team_lead_id,
      hire_date,
    } = req.body;

    // Prevent creating admin accounts
    console.log(req.body);
    if (req.body.user_type === "admin") {
      return res.status(403).json({
        error: "Cannot create admin accounts through this endpoint",
      });
    }
    // Define positions that require a team lead
    const positionsRequiringTeamLead = ["senior", "mid", "junior"];
    const leadershipPositions = ["ceo", "cto", "team_lead"];

    // Validate team_lead_id based on position
    if (positionsRequiringTeamLead.includes(position)) {
      if (!team_lead_id) {
        console.log("first");
        return res.status(400).json({
          error: `Team lead is required for ${position} position`,
        });
      }

      // Verify that the team lead exists and has appropriate position
      const teamLead = await Employee.findById(team_lead_id).populate(
        "user_id"
      );
      if (!teamLead) {
        return res.status(400).json({
          error: "Invalid team lead ID",
        });
      }

      // Optional: Verify team lead has appropriate position
      if (!["team_lead", "cto", "ceo"].includes(teamLead.position)) {
        return res.status(400).json({
          error: "Team lead must have a leadership position",
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log("already Exists");
      return res.status(400).json({ error: "User already exists" });
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(tempPassword, salt);

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password_hash,
      user_type: "employee",
      status: "active",
      first_name,
      last_name,
      phone,
      country,
      timezone: timezone || "UTC",
      // company_id,
    });

    await user.save();

    // Create employee record
    // Only set team_lead_id for positions that require it
    const employee = new Employee({
      user_id: user._id,
      employee_type,
      department,
      position,
      team_lead_id: positionsRequiringTeamLead.includes(position)
        ? team_lead_id
        : null, // or undefined, depending on your schema
      hire_date: hire_date || new Date(),
      is_active: true,
    });

    await employee.save();

    // Send welcome email with credentials
    const loginUrl = `${process.env.FRONTEND_URL}/login`;

    await sendEmail({
      to: user.email,
      subject: "Welcome to the Team - Your Account Details",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to the Team!</h2>
          <p>Hello ${first_name},</p>
          <p>Your employee account has been created successfully. Below are your login credentials:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background-color: #fff; padding: 5px; border-radius: 3px;">${tempPassword}</code></p>
          </div>
          
          <p style="color: #d9534f;"><strong>Important:</strong> Please change your password immediately after your first login.</p>
          
          <a href="${loginUrl}" style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Login to Your Account</a>
          
          <p>If you have any questions, please don't hesitate to reach out to HR.</p>
          
          <br>
          <p style="color: #666;">Best regards,<br>HR Team</p>
        </div>
      `,
    });

    res.status(201).json({
      message: "Employee created successfully. Credentials sent to email.",
      employee: {
        id: employee._id,
        user_id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        department: employee.department,
        position: employee.position,
        team_lead_id: employee.team_lead_id,
      },
    });
  } catch (error) {
    console.error("Create employee error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get All Employees
export const getAllEmployees = async (req, res) => {
  try {
    const { department, position, employee_type, is_active } = req.query;

    // Build filter
    const filter = {};
    if (department) filter.department = department;
    if (position) filter.position = position;
    if (employee_type) filter.employee_type = employee_type;
    if (is_active !== undefined) filter.is_active = is_active === "true";

    const employees = await Employee.find(filter)
      .populate({
        path: "user_id",
        select: "-password_hash",
      })
      .populate({
        path: "team_lead_id",
        populate: {
          path: "user_id",
          select: "first_name last_name email",
        },
      })
      .sort({ createdAt: -1 });

    res.json({
      count: employees.length,
      employees,
    });
  } catch (error) {
    console.error("Get all employees error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get Employee by ID
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id)
      .populate({
        path: "user_id",
        select: "-password_hash",
      })
      .populate({
        path: "team_lead_id",
        populate: {
          path: "user_id",
          select: "first_name last_name email",
        },
      });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    res.json({ user: employee });
  } catch (error) {
    console.error("Get employee by ID error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update Employee
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      phone,
      country,
      timezone,
      department,
      position,
      team_lead_id,
      employee_type,
      is_active,
    } = req.body;

    // Find employee
    const employee = await Employee.findById(id).populate("user_id");
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Update user details
    if (first_name) employee.user_id.first_name = first_name;
    if (last_name) employee.user_id.last_name = last_name;
    if (phone) employee.user_id.phone = phone;
    if (country) employee.user_id.country = country;
    if (timezone) employee.user_id.timezone = timezone;

    await employee.user_id.save();

    // Update employee details
    if (department) employee.department = department;
    if (position) employee.position = position;
    if (team_lead_id !== undefined) employee.team_lead_id = team_lead_id;
    if (employee_type) employee.employee_type = employee_type;
    if (is_active !== undefined) employee.is_active = is_active;

    await employee.save();

    // Populate and return updated employee
    const updatedEmployee = await Employee.findById(id)
      .populate({
        path: "user_id",
        select: "-password_hash",
      })
      .populate({
        path: "team_lead_id",
        populate: {
          path: "user_id",
          select: "first_name last_name email",
        },
      });

    res.json({
      message: "Employee updated successfully",
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error("Update employee error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete Employee (soft delete - mark as inactive)
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id).populate("user_id");
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Soft delete: mark as inactive
    employee.is_active = false;
    employee.user_id.status = "inactive";

    await employee.save();
    await employee.user_id.save();

    res.json({
      message: "Employee deactivated successfully",
    });
  } catch (error) {
    console.error("Delete employee error:", error);
    res.status(500).json({ error: error.message });
  }
};
