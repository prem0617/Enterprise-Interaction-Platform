import Employee from "../../models/Employee.js";
import Department from "../../models/Department.js";
import User from "../../models/User.js";

// Full employee directory with hierarchy data
export const getDirectory = async (req, res) => {
  try {
    const { search, department, position } = req.query;

    const employees = await Employee.find({ is_active: true })
      .populate("user_id", "first_name last_name email profile_picture country date_of_birth phone")
      .populate("department", "name code color type parent_department_id")
      .populate({ path: "team_lead_id", populate: { path: "user_id", select: "first_name last_name email profile_picture" } })
      .lean();

    let result = employees.map((emp) => ({
      _id: emp._id,
      user_id: emp.user_id?._id,
      emp_code: emp.emp_code,
      first_name: emp.user_id?.first_name,
      last_name: emp.user_id?.last_name,
      full_name: `${emp.user_id?.first_name || ""} ${emp.user_id?.last_name || ""}`.trim(),
      email: emp.user_id?.email,
      profile_picture: emp.user_id?.profile_picture,
      country: emp.user_id?.country,
      phone: emp.user_id?.phone,
      position: emp.position,
      employee_type: emp.employee_type,
      department: emp.department,
      hire_date: emp.hire_date,
      team_lead: emp.team_lead_id ? {
        _id: emp.team_lead_id._id,
        first_name: emp.team_lead_id.user_id?.first_name,
        last_name: emp.team_lead_id.user_id?.last_name,
        email: emp.team_lead_id.user_id?.email,
        profile_picture: emp.team_lead_id.user_id?.profile_picture,
      } : null,
    }));

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        e.full_name.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.position?.toLowerCase().includes(q) ||
        e.emp_code?.toLowerCase().includes(q)
      );
    }
    if (department) result = result.filter((e) => e.department?._id?.toString() === department || e.department?.name === department);
    if (position) result = result.filter((e) => e.position === position);

    res.json({ employees: result, total: result.length });
  } catch (error) {
    console.error("Directory error:", error);
    res.status(500).json({ error: "Failed to load directory" });
  }
};

// Org tree: hierarchical structure for visualization
export const getOrgTree = async (req, res) => {
  try {
    const departments = await Department.find({ is_active: true })
      .populate({ path: "head_id", populate: { path: "user_id", select: "first_name last_name email profile_picture" } })
      .populate("parent_department_id", "name code")
      .lean();

    const employees = await Employee.find({ is_active: true })
      .populate("user_id", "first_name last_name email profile_picture")
      .populate("department", "name code")
      .lean();

    // Build department tree
    const deptMap = {};
    departments.forEach((d) => { deptMap[d._id.toString()] = { ...d, children: [], employees: [] }; });

    // Attach employees to departments
    employees.forEach((emp) => {
      const deptId = emp.department?._id?.toString();
      if (deptId && deptMap[deptId]) {
        deptMap[deptId].employees.push({
          _id: emp._id,
          user_id: emp.user_id?._id,
          emp_code: emp.emp_code,
          first_name: emp.user_id?.first_name,
          last_name: emp.user_id?.last_name,
          email: emp.user_id?.email,
          profile_picture: emp.user_id?.profile_picture,
          position: emp.position,
        });
      }
    });

    // Build tree (parent-child)
    const roots = [];
    Object.values(deptMap).forEach((dept) => {
      const parentId = dept.parent_department_id?._id?.toString() || dept.parent_department_id?.toString();
      if (parentId && deptMap[parentId]) {
        deptMap[parentId].children.push(dept);
      } else {
        roots.push(dept);
      }
    });

    res.json({ tree: roots, totalDepartments: departments.length, totalEmployees: employees.length });
  } catch (error) {
    console.error("Org tree error:", error);
    res.status(500).json({ error: "Failed to load org tree" });
  }
};
