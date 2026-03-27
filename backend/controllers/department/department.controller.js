import Department from "../../models/Department.js";
import Employee from "../../models/Employee.js";
import User from "../../models/User.js";
import { ChatChannel } from "../../models/ChatChannel.js";
import { ChannelMember } from "../../models/ChannelMember.js";
import { Message } from "../../models/Message.js";

// ─── Internal helper: create team chat channel ───
async function createTeamChannel(department, adminUserId) {
  try {
    // Find all active employees in the parent department
    const employees = await Employee.find({
      department: department.parent_department_id,
      is_active: true,
    }).populate("user_id", "_id");

    const channel = await ChatChannel.create({
      channel_type: "team",
      name: department.name,
      created_by: adminUserId,
    });

    // Add all parent dept employees as members
    const memberDocs = employees
      .filter((e) => e.user_id)
      .map((e) => ({
        channel_id: channel._id,
        user_id: e.user_id._id,
        role: "member",
      }));

    // Ensure assigned team lead is also in the team chat channel
    if (department.head_id) {
      const leadEmployee = await Employee.findById(department.head_id).populate(
        "user_id",
        "_id"
      );
      if (leadEmployee?.user_id?._id) {
        const leadUserId = String(leadEmployee.user_id._id);
        const alreadyInDocs = memberDocs.some(
          (m) => String(m.user_id) === leadUserId
        );
        if (!alreadyInDocs) {
          memberDocs.push({
            channel_id: channel._id,
            user_id: leadEmployee.user_id._id,
            role: "member",
          });
        }
      }
    }

    if (memberDocs.length > 0) {
      await ChannelMember.insertMany(memberDocs, { ordered: false });
    }

    return channel._id;
  } catch (err) {
    console.error("createTeamChannel error:", err);
    return null;
  }
}

async function ensureTeamLeadInChannel(teamDeptId) {
  const team = await Department.findById(teamDeptId);
  if (!team || team.type !== "team" || !team.chat_channel_id || !team.head_id) return;

  const leadEmployee = await Employee.findById(team.head_id).populate("user_id", "_id");
  const leadUserId = leadEmployee?.user_id?._id;
  if (!leadUserId) return;

  const exists = await ChannelMember.findOne({
    channel_id: team.chat_channel_id,
    user_id: leadUserId,
  });
  if (!exists) {
    await ChannelMember.create({
      channel_id: team.chat_channel_id,
      user_id: leadUserId,
      role: "member",
    });
  }
}

// ─── Internal helper: delete team chat channel ───
async function deleteTeamChannel(channelId) {
  if (!channelId) return;
  try {
    await Message.deleteMany({ channel_id: channelId });
    await ChannelMember.deleteMany({ channel_id: channelId });
    await ChatChannel.findByIdAndDelete(channelId);
  } catch (err) {
    console.error("deleteTeamChannel error:", err);
  }
}

// ─── Create Department ───
export const createDepartment = async (req, res) => {
  try {
    const { name, code, description, head_id, parent_department_id, color, type } = req.body;
    const deptType = type === "team" ? "team" : "department";

    if (!name || !code) {
      return res.status(400).json({ error: "Name and code are required" });
    }

    // Teams must have a parent department
    if (deptType === "team" && !parent_department_id) {
      return res.status(400).json({ error: "Teams must belong to a parent department" });
    }

    const existing = await Department.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, "i") } },
        { code: code.toUpperCase() },
      ],
    });
    if (existing) {
      return res.status(409).json({ error: `${deptType === "team" ? "Team" : "Department"} with this name or code already exists` });
    }

    // Validate parent exists and is a department (not a team)
    if (parent_department_id) {
      const parent = await Department.findById(parent_department_id);
      if (!parent) return res.status(400).json({ error: "Parent department not found" });
      if (parent.type === "team") {
        return res.status(400).json({ error: "A team cannot be nested under another team. Choose a department as parent." });
      }
    }

    // Validate head exists
    if (head_id) {
      const head = await Employee.findById(head_id);
      if (!head) return res.status(400).json({ error: "Selected head not found" });
    }

    const department = await Department.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || "",
      head_id: head_id || null,
      parent_department_id: parent_department_id || null,
      color: color || "#6366f1",
      type: deptType,
    });

    // Auto-create team chat channel
    if (deptType === "team") {
      const channelId = await createTeamChannel(department, req.userId);
      if (channelId) {
        department.chat_channel_id = channelId;
        await department.save();
        await ensureTeamLeadInChannel(department._id);
      }
    }

    const populated = await Department.findById(department._id)
      .populate({ path: "head_id", populate: { path: "user_id", select: "first_name last_name email profile_picture" } })
      .populate("parent_department_id", "name code type");

    res.status(201).json({ department: populated });
  } catch (error) {
    console.error("Create department error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Get All Departments ───
export const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find()
      .populate({ path: "head_id", populate: { path: "user_id", select: "first_name last_name email profile_picture" } })
      .populate("parent_department_id", "name code")
      .sort({ name: 1 });

    // Count employees per department
    const employeeCounts = await Employee.aggregate([
      { $match: { is_active: true } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    employeeCounts.forEach((e) => { countMap[e._id?.toString()] = e.count; });

    const enriched = departments.map((dept) => {
      const d = dept.toObject();
      d.employee_count = countMap[dept._id.toString()] || 0;
      return d;
    });

    res.json({ departments: enriched });
  } catch (error) {
    console.error("Get departments error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Get Single Department ───
export const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate({ path: "head_id", populate: { path: "user_id", select: "first_name last_name email profile_picture" } })
      .populate("parent_department_id", "name code")
      .populate({ path: "children", populate: { path: "head_id", populate: { path: "user_id", select: "first_name last_name email" } } });

    if (!department) return res.status(404).json({ error: "Department not found" });

    // Get all employees in this department
    const employees = await Employee.find({
      department: department._id,
      is_active: true,
    }).populate("user_id", "first_name last_name email profile_picture");

    res.json({ department, employees });
  } catch (error) {
    console.error("Get department error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Update Department ───
export const updateDepartment = async (req, res) => {
  try {
    const { name, code, description, head_id, parent_department_id, color, is_active, type } = req.body;

    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ error: "Department not found" });

    // Resolve effective type
    const effectiveType = type !== undefined ? (type === "team" ? "team" : "department") : department.type;

    // Teams must have a parent
    const effectiveParent = parent_department_id !== undefined ? parent_department_id : department.parent_department_id;
    if (effectiveType === "team" && !effectiveParent) {
      return res.status(400).json({ error: "Teams must belong to a parent department" });
    }

    // Check name/code uniqueness if changed
    if (name && name !== department.name) {
      const dup = await Department.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") }, _id: { $ne: department._id } });
      if (dup) return res.status(409).json({ error: "Name already exists" });
    }
    if (code && code.toUpperCase() !== department.code) {
      const dup = await Department.findOne({ code: code.toUpperCase(), _id: { $ne: department._id } });
      if (dup) return res.status(409).json({ error: "Code already exists" });
    }

    // Prevent circular parent
    if (parent_department_id && String(parent_department_id) === String(department._id)) {
      return res.status(400).json({ error: "Cannot be its own parent" });
    }

    // Validate parent is not a team
    if (parent_department_id) {
      const parent = await Department.findById(parent_department_id);
      if (parent && parent.type === "team") {
        return res.status(400).json({ error: "Cannot nest under a team. Choose a department as parent." });
      }
    }

    if (name) department.name = name.trim();
    if (code) department.code = code.trim().toUpperCase();
    if (description !== undefined) department.description = description.trim();
    if (head_id !== undefined) department.head_id = head_id || null;
    if (parent_department_id !== undefined) department.parent_department_id = parent_department_id || null;
    if (color) department.color = color;
    if (is_active !== undefined) department.is_active = is_active;
    if (type !== undefined) department.type = effectiveType;

    await department.save();

    // If this is a team and head changed, keep head in team chat channel
    if (department.type === "team" && head_id !== undefined) {
      await ensureTeamLeadInChannel(department._id);
    }

    // Sync team channel name if it changed
    if (name && department.chat_channel_id) {
      await ChatChannel.findByIdAndUpdate(department.chat_channel_id, { name: department.name });
    }

    const populated = await Department.findById(department._id)
      .populate({ path: "head_id", populate: { path: "user_id", select: "first_name last_name email profile_picture" } })
      .populate("parent_department_id", "name code type");

    res.json({ department: populated });
  } catch (error) {
    console.error("Update department error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Delete Department ───
export const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ error: "Department not found" });

    // Check for child departments/teams
    const children = await Department.countDocuments({ parent_department_id: department._id });
    if (children > 0) {
      return res.status(400).json({ error: "Cannot delete: has child teams. Remove or reassign them first." });
    }

    // Auto-delete associated team chat channel
    if (department.type === "team" && department.chat_channel_id) {
      await deleteTeamChannel(department.chat_channel_id);
    }

    await Department.findByIdAndDelete(req.params.id);
    res.json({ message: "Department deleted" });
  } catch (error) {
    console.error("Delete department error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Get Org Tree (hierarchical) ───
export const getOrgTree = async (req, res) => {
  try {
    const departments = await Department.find({ is_active: true })
      .populate({ path: "head_id", populate: { path: "user_id", select: "first_name last_name email profile_picture position" } })
      .sort({ name: 1 });

    // Get employees grouped by department code
    const employees = await Employee.find({ is_active: true })
      .populate("user_id", "first_name last_name email profile_picture")
      .sort({ position: 1 });

    const deptMap = {};
    departments.forEach((d) => {
      deptMap[d._id.toString()] = {
        ...d.toObject(),
        members: [],
        children: [],
      };
    });

    // Assign employees to departments
    employees.forEach((emp) => {
      const deptId = emp.department?.toString();
      if (deptId && deptMap[deptId]) {
        deptMap[deptId].members.push(emp);
      }
    });

    // Build tree
    const roots = [];
    Object.values(deptMap).forEach((d) => {
      if (d.parent_department_id) {
        const parentId = d.parent_department_id.toString?.() || d.parent_department_id._id?.toString?.() || d.parent_department_id;
        if (deptMap[parentId]) {
          deptMap[parentId].children.push(d);
        } else {
          roots.push(d);
        }
      } else {
        roots.push(d);
      }
    });

    res.json({ tree: roots });
  } catch (error) {
    console.error("Get org tree error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Assign Department Head ───
export const assignDepartmentHead = async (req, res) => {
  try {
    const { head_id } = req.body;
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ error: "Department not found" });

    if (head_id) {
      const head = await Employee.findById(head_id).populate("user_id", "first_name last_name");
      if (!head) return res.status(400).json({ error: "Employee not found" });
    }

    department.head_id = head_id || null;
    await department.save();

    // Team lead should always be present in team group chat
    await ensureTeamLeadInChannel(department._id);

    const populated = await Department.findById(department._id)
      .populate({ path: "head_id", populate: { path: "user_id", select: "first_name last_name email profile_picture" } })
      .populate("parent_department_id", "name code");

    res.json({ department: populated });
  } catch (error) {
    console.error("Assign head error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── Assign Team Members (add/remove employees from a team) ───
export const assignTeamMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { add = [], remove = [] } = req.body; // arrays of employee IDs

    const team = await Department.findById(id);
    if (!team) return res.status(404).json({ error: "Team not found" });
    if (team.type !== "team") return res.status(400).json({ error: "This endpoint is only for teams" });

    const errors = [];

    // ── Add employees ──
    for (const empId of add) {
      const emp = await Employee.findById(empId);
      if (!emp) { errors.push(`Employee ${empId} not found`); continue; }

      emp.department = team._id;
      await emp.save();

      // Also add to the team's chat channel if it exists
      if (team.chat_channel_id && emp.user_id) {
        const alreadyMember = await ChannelMember.findOne({
          channel_id: team.chat_channel_id,
          user_id: emp.user_id,
        });
        if (!alreadyMember) {
          await ChannelMember.create({
            channel_id: team.chat_channel_id,
            user_id: emp.user_id,
            role: "member",
          });
        }
      }
    }

    // ── Remove employees (move them back to parent dept) ──
    for (const empId of remove) {
      const emp = await Employee.findById(empId);
      if (!emp) { errors.push(`Employee ${empId} not found`); continue; }

      // Move back to parent department
      emp.department = team.parent_department_id || emp.department;
      await emp.save();

      // Remove from chat channel
      if (team.chat_channel_id && emp.user_id) {
        await ChannelMember.findOneAndDelete({
          channel_id: team.chat_channel_id,
          user_id: emp.user_id,
        });
      }
    }

    // Return updated employee list for this team
    const members = await Employee.find({ department: team._id, is_active: true })
      .populate("user_id", "first_name last_name email profile_picture");

    res.json({
      message: "Team members updated",
      members,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Assign team members error:", error);
    res.status(500).json({ error: error.message });
  }
};
