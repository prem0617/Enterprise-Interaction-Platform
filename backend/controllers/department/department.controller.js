import Department from "../../models/Department.js";
import Employee from "../../models/Employee.js";
import User from "../../models/User.js";

// ─── Create Department ───
export const createDepartment = async (req, res) => {
  try {
    const { name, code, description, head_id, parent_department_id, color } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: "Name and code are required" });
    }

    const existing = await Department.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, "i") } },
        { code: code.toUpperCase() },
      ],
    });
    if (existing) {
      return res.status(409).json({ error: "Department with this name or code already exists" });
    }

    // Validate parent exists
    if (parent_department_id) {
      const parent = await Department.findById(parent_department_id);
      if (!parent) return res.status(400).json({ error: "Parent department not found" });
    }

    // Validate head exists
    if (head_id) {
      const head = await Employee.findById(head_id);
      if (!head) return res.status(400).json({ error: "Selected department head not found" });
    }

    const department = await Department.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || "",
      head_id: head_id || null,
      parent_department_id: parent_department_id || null,
      color: color || "#6366f1",
    });

    const populated = await Department.findById(department._id)
      .populate({ path: "head_id", populate: { path: "user_id", select: "first_name last_name email profile_picture" } })
      .populate("parent_department_id", "name code");

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
    employeeCounts.forEach((e) => { countMap[e._id] = e.count; });

    // Match departments to employee counts by code (lowercase)
    const enriched = departments.map((dept) => {
      const d = dept.toObject();
      d.employee_count = countMap[dept.code.toLowerCase()] || countMap[dept.name.toLowerCase()] || 0;
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
      department: { $regex: new RegExp(`^${department.code}$`, "i") },
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
    const { name, code, description, head_id, parent_department_id, color, is_active } = req.body;

    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ error: "Department not found" });

    // Check name/code uniqueness if changed
    if (name && name !== department.name) {
      const dup = await Department.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") }, _id: { $ne: department._id } });
      if (dup) return res.status(409).json({ error: "Department name already exists" });
    }
    if (code && code.toUpperCase() !== department.code) {
      const dup = await Department.findOne({ code: code.toUpperCase(), _id: { $ne: department._id } });
      if (dup) return res.status(409).json({ error: "Department code already exists" });
    }

    // Prevent circular parent
    if (parent_department_id && String(parent_department_id) === String(department._id)) {
      return res.status(400).json({ error: "A department cannot be its own parent" });
    }

    if (name) department.name = name.trim();
    if (code) department.code = code.trim().toUpperCase();
    if (description !== undefined) department.description = description.trim();
    if (head_id !== undefined) department.head_id = head_id || null;
    if (parent_department_id !== undefined) department.parent_department_id = parent_department_id || null;
    if (color) department.color = color;
    if (is_active !== undefined) department.is_active = is_active;

    await department.save();

    const populated = await Department.findById(department._id)
      .populate({ path: "head_id", populate: { path: "user_id", select: "first_name last_name email profile_picture" } })
      .populate("parent_department_id", "name code");

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

    // Check for child departments
    const children = await Department.countDocuments({ parent_department_id: department._id });
    if (children > 0) {
      return res.status(400).json({ error: "Cannot delete: department has sub-departments. Remove or reassign them first." });
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
      const deptCode = emp.department?.toLowerCase();
      const dept = Object.values(deptMap).find(
        (d) => d.code.toLowerCase() === deptCode || d.name.toLowerCase() === deptCode
      );
      if (dept) {
        deptMap[dept._id.toString()].members.push(emp);
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

    const populated = await Department.findById(department._id)
      .populate({ path: "head_id", populate: { path: "user_id", select: "first_name last_name email profile_picture" } })
      .populate("parent_department_id", "name code");

    res.json({ department: populated });
  } catch (error) {
    console.error("Assign head error:", error);
    res.status(500).json({ error: error.message });
  }
};
