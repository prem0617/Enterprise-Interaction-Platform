import Employee from "../../models/Employee.js";
import Department from "../../models/Department.js";
import User from "../../models/User.js";
import { fetchMapByIds } from "../../utils/safeObjectIdBatch.js";

// Full employee directory with hierarchy data (manual joins — avoids Mongoose populate $in
// BSON errors when legacy rows contain invalid ref values).
export const getDirectory = async (req, res) => {
  try {
    const { search, department, position } = req.query;

    const raw = await Employee.find({ is_active: true }).lean();

    const userIds = raw.map((e) => e.user_id);
    const deptIds = raw.map((e) => e.department);
    const leadIds = raw.map((e) => e.team_lead_id);

    const [userMap, deptMap, leadEmpMap] = await Promise.all([
      fetchMapByIds(User, userIds, "first_name last_name email profile_picture country date_of_birth phone"),
      fetchMapByIds(Department, deptIds, "name code color type parent_department_id"),
      fetchMapByIds(Employee, leadIds, "user_id"),
    ]);

    const leadUserIds = [...leadEmpMap.values()].map((e) => e.user_id).filter(Boolean);
    const leadUserMap = await fetchMapByIds(User, leadUserIds, "first_name last_name email profile_picture");

    let result = raw.map((emp) => {
      const u = userMap.get(emp.user_id?.toString?.());
      const d = deptMap.get(emp.department?.toString?.());
      let team_lead = null;
      const leadEmp = emp.team_lead_id ? leadEmpMap.get(emp.team_lead_id.toString()) : null;
      if (leadEmp?.user_id) {
        const lu = leadUserMap.get(leadEmp.user_id.toString());
        if (lu) {
          team_lead = {
            _id: leadEmp._id,
            first_name: lu.first_name,
            last_name: lu.last_name,
            email: lu.email,
            profile_picture: lu.profile_picture,
          };
        }
      }

      return {
        _id: emp._id,
        user_id: u?._id,
        emp_code: emp.emp_code,
        first_name: u?.first_name,
        last_name: u?.last_name,
        full_name: `${u?.first_name || ""} ${u?.last_name || ""}`.trim(),
        email: u?.email,
        profile_picture: u?.profile_picture,
        country: u?.country,
        phone: u?.phone,
        position: emp.position,
        employee_type: emp.employee_type,
        department: d || null,
        hire_date: emp.hire_date,
        team_lead,
      };
    });

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.full_name.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q) ||
          e.position?.toLowerCase().includes(q) ||
          e.emp_code?.toLowerCase().includes(q)
      );
    }
    if (department) {
      result = result.filter(
        (e) => e.department?._id?.toString() === department || e.department?.name === department
      );
    }
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
    const departments = await Department.find({ is_active: true }).lean();

    const headIds = departments.map((d) => d.head_id).filter(Boolean);
    const parentIds = departments.map((d) => d.parent_department_id).filter(Boolean);

    const [headEmpMap, parentDeptMap] = await Promise.all([
      fetchMapByIds(Employee, headIds, "user_id"),
      fetchMapByIds(Department, parentIds, "name code"),
    ]);

    const headUserIds = [...headEmpMap.values()].map((e) => e.user_id).filter(Boolean);
    const headUserMap = await fetchMapByIds(User, headUserIds, "first_name last_name email profile_picture");

    const enrichedDepts = departments.map((d) => {
      const headEmp = d.head_id ? headEmpMap.get(d.head_id.toString()) : null;
      const headUser = headEmp?.user_id ? headUserMap.get(headEmp.user_id.toString()) : null;
      const parent = d.parent_department_id ? parentDeptMap.get(d.parent_department_id.toString()) : null;

      return {
        ...d,
        head_id: headEmp && headUser ? { _id: headEmp._id, user_id: headUser } : headEmp ? { _id: headEmp._id, user_id: null } : null,
        parent_department_id: parent || d.parent_department_id,
      };
    });

    const employees = await Employee.find({ is_active: true }).lean();
    const empUserIds = employees.map((e) => e.user_id);
    const empDeptIds = employees.map((e) => e.department);
    const [empUserMap, empDeptMap] = await Promise.all([
      fetchMapByIds(User, empUserIds, "first_name last_name email profile_picture"),
      fetchMapByIds(Department, empDeptIds, "name code"),
    ]);

    const deptMap = {};
    enrichedDepts.forEach((d) => {
      deptMap[d._id.toString()] = { ...d, children: [], employees: [] };
    });

    employees.forEach((emp) => {
      const deptId = emp.department?.toString?.();
      const u = empUserMap.get(emp.user_id?.toString?.());
      const d = empDeptMap.get(deptId);
      if (deptId && deptMap[deptId]) {
        deptMap[deptId].employees.push({
          _id: emp._id,
          user_id: u?._id,
          emp_code: emp.emp_code,
          first_name: u?.first_name,
          last_name: u?.last_name,
          email: u?.email,
          profile_picture: u?.profile_picture,
          position: emp.position,
        });
      }
    });

    const roots = [];
    Object.values(deptMap).forEach((dept) => {
      const pid = dept.parent_department_id?._id?.toString?.() || dept.parent_department_id?.toString?.();
      if (pid && deptMap[pid]) {
        deptMap[pid].children.push(dept);
      } else {
        roots.push(dept);
      }
    });

    res.json({
      tree: roots,
      totalDepartments: departments.length,
      totalEmployees: employees.length,
    });
  } catch (error) {
    console.error("Org tree error:", error);
    res.status(500).json({ error: "Failed to load org tree" });
  }
};
