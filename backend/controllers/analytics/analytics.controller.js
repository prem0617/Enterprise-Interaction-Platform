import Employee from "../../models/Employee.js";
import Department from "../../models/Department.js";
import Attendance from "../../models/Attendance.js";
import LeaveRequest from "../../models/LeaveRequest.js";
import { SupportTicket } from "../../models/SupportTicket.js";
import Meeting from "../../models/Meeting.js";
import User from "../../models/User.js";
import { Message } from "../../models/Message.js";
import Notification from "../../models/Notification.js";

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Admin Analytics Overview (comprehensive) ──────────
export const getAnalyticsOverview = async (req, res) => {
  try {
    const now = new Date();
    const today = startOfDay(now);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // ─── Core counts ───
    const [employees, departments] = await Promise.all([
      Employee.find({ is_active: true }).populate("department", "name code type").populate("user_id", "first_name last_name email country date_of_birth profile_picture created_at last_login").lean(),
      Department.find({ is_active: true }).lean(),
    ]);

    // ─── Department distribution ───
    const deptMap = {};
    for (const emp of employees) {
      const deptName = emp.department?.name || "Unassigned";
      deptMap[deptName] = (deptMap[deptName] || 0) + 1;
    }
    const departmentDistribution = Object.entries(deptMap).map(([name, count]) => ({ name, count }));

    // ─── Country distribution ───
    const countryMap = {};
    for (const emp of employees) {
      const country = emp.user_id?.country || "unknown";
      countryMap[country] = (countryMap[country] || 0) + 1;
    }
    const countryDistribution = Object.entries(countryMap).map(([country, count]) => ({ country: country.toUpperCase(), count }));

    // ─── Position distribution ───
    const posMap = {};
    for (const emp of employees) {
      const pos = emp.position || "unspecified";
      posMap[pos] = (posMap[pos] || 0) + 1;
    }
    const positionDistribution = Object.entries(posMap).map(([position, count]) => ({ position, count }));

    // ─── Upcoming birthdays (next 30 days) ───
    const upcomingBirthdays = [];
    for (const emp of employees) {
      const dob = emp.user_id?.date_of_birth;
      if (!dob) continue;
      const birth = new Date(dob);
      const nextBirthday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
      if (nextBirthday < today) nextBirthday.setFullYear(now.getFullYear() + 1);
      const daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 30) {
        const age = nextBirthday.getFullYear() - birth.getFullYear();
        upcomingBirthdays.push({
          _id: emp.user_id._id,
          first_name: emp.user_id.first_name,
          last_name: emp.user_id.last_name,
          email: emp.user_id.email,
          profile_picture: emp.user_id.profile_picture,
          department: emp.department?.name || "Unassigned",
          position: emp.position,
          date_of_birth: dob,
          next_birthday: nextBirthday,
          days_until: daysUntil,
          turning_age: age,
        });
      }
    }
    upcomingBirthdays.sort((a, b) => a.days_until - b.days_until);

    // ─── New hires this month ───
    const newHires = employees
      .filter((emp) => emp.hire_date && new Date(emp.hire_date) >= thisMonthStart)
      .map((emp) => ({
        _id: emp.user_id?._id,
        first_name: emp.user_id?.first_name,
        last_name: emp.user_id?.last_name,
        email: emp.user_id?.email,
        profile_picture: emp.user_id?.profile_picture,
        department: emp.department?.name,
        position: emp.position,
        hire_date: emp.hire_date,
      }));

    // ─── Attendance trend (last 7 days) ───
    const attendanceTrend = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const start = startOfDay(day);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const records = await Attendance.find({ date: { $gte: start, $lt: end } }).lean();
      const present = records.filter((r) => ["present", "late", "half_day"].includes(r.status)).length;
      const late = records.filter((r) => r.status === "late").length;
      const totalHours = records.reduce((sum, r) => sum + (r.total_hours || 0), 0);

      attendanceTrend.push({
        date: start.toISOString().split("T")[0],
        label: start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        present,
        late,
        absent: employees.length - present,
        avg_hours: present > 0 ? Math.round((totalHours / present) * 10) / 10 : 0,
      });
    }

    // ─── Today's attendance snapshot ───
    const todayRecords = await Attendance.find({ date: today }).lean();
    const todayAttendance = {
      present: todayRecords.filter((r) => ["present", "late", "half_day"].includes(r.status)).length,
      late: todayRecords.filter((r) => r.status === "late").length,
      absent: employees.length - todayRecords.filter((r) => ["present", "late", "half_day"].includes(r.status)).length,
      on_leave: todayRecords.filter((r) => r.status === "on_leave").length,
      avg_hours: (() => {
        const worked = todayRecords.filter((r) => r.total_hours > 0);
        return worked.length > 0 ? Math.round((worked.reduce((s, r) => s + r.total_hours, 0) / worked.length) * 10) / 10 : 0;
      })(),
    };

    // ─── Upcoming meetings (next 7 days) ───
    const next7Days = new Date(now);
    next7Days.setDate(next7Days.getDate() + 7);
    const upcomingMeetings = await Meeting.find({
      status: "scheduled",
      scheduled_at: { $gte: now, $lte: next7Days },
    })
      .populate("host_id", "first_name last_name email profile_picture")
      .sort({ scheduled_at: 1 })
      .limit(10)
      .lean();

    // ─── Meeting stats ───
    const [totalMeetingsThisMonth, meetingsByStatus] = await Promise.all([
      Meeting.countDocuments({ created_at: { $gte: thisMonthStart, $lte: thisMonthEnd } }),
      Promise.all(
        ["scheduled", "active", "ended", "cancelled"].map(async (status) => ({
          status,
          count: await Meeting.countDocuments({ status }),
        }))
      ),
    ]);

    // ─── Ticket stats ───
    const ticketStats = await Promise.all(
      ["pending", "open", "in_progress", "resolved", "closed"].map(async (status) => ({
        status,
        count: await SupportTicket.countDocuments({ status }),
      }))
    );
    const ticketByPriority = await Promise.all(
      ["low", "medium", "high", "critical"].map(async (priority) => ({
        priority,
        count: await SupportTicket.countDocuments({ priority }),
      }))
    );

    // ─── Leave stats ───
    const leaveByType = await Promise.all(
      ["paid", "floater", "marriage", "unpaid"].map(async (type) => ({
        type,
        count: await LeaveRequest.countDocuments({ leave_type: type }),
      }))
    );
    const leaveByStatus = await Promise.all(
      ["pending", "approved", "rejected", "cancelled"].map(async (status) => ({
        status,
        count: await LeaveRequest.countDocuments({ status }),
      }))
    );
    const pendingLeaves = await LeaveRequest.countDocuments({ status: "pending" });

    // ─── Message activity (last 7 days) ───
    const messageActivity = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const start = startOfDay(day);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const count = await Message.countDocuments({ created_at: { $gte: start, $lt: end }, deleted_at: null });
      messageActivity.push({
        date: start.toISOString().split("T")[0],
        label: start.toLocaleDateString("en-US", { weekday: "short" }),
        count,
      });
    }
    const totalMessagesToday = messageActivity[messageActivity.length - 1]?.count || 0;

    // ─── Average tenure ───
    const tenures = employees.filter((e) => e.hire_date).map((e) => {
      const days = Math.floor((now - new Date(e.hire_date)) / (1000 * 60 * 60 * 24));
      return days;
    });
    const avgTenureDays = tenures.length > 0 ? Math.round(tenures.reduce((s, d) => s + d, 0) / tenures.length) : 0;

    res.json({
      // KPIs
      totalEmployees: employees.length,
      totalDepartments: departments.filter((d) => d.type === "department").length,
      totalTeams: departments.filter((d) => d.type === "team").length,
      totalMeetingsThisMonth,
      totalMessagesToday,
      pendingLeaves,
      avgTenureDays,

      // Today
      todayAttendance,

      // Trends
      attendanceTrend,
      messageActivity,

      // Distributions
      departmentDistribution,
      countryDistribution,
      positionDistribution,

      // Lists
      upcomingBirthdays: upcomingBirthdays.slice(0, 8),
      upcomingMeetings,
      newHires,

      // Charts
      meetingByStatus: meetingsByStatus,
      ticketStats,
      ticketByPriority,
      leaveByType,
      leaveByStatus,
    });
  } catch (error) {
    console.error("Analytics overview error:", error);
    res.status(500).json({ error: "Failed to load analytics" });
  }
};

// ─── Employee Personal Stats ───────────────────────────
export const getMyStats = async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const employee = await Employee.findOne({ user_id: userId }).lean();

    const [attendanceThisMonth, pendingLeaves, approvedLeaves, openTickets, upcomingMeetings] =
      await Promise.all([
        Attendance.countDocuments({ employee_id: userId, date: { $gte: monthStart, $lte: monthEnd }, status: { $in: ["present", "late", "half_day"] } }),
        LeaveRequest.countDocuments({ employee_id: userId, status: "pending" }),
        LeaveRequest.countDocuments({ employee_id: userId, status: "approved" }),
        employee ? SupportTicket.countDocuments({ assigned_agent_id: employee._id, status: { $in: ["open", "in_progress"] } }) : 0,
        Meeting.countDocuments({ participants: userId, status: "scheduled", scheduled_at: { $gte: now } }),
      ]);

    let workingDays = 0;
    const d = new Date(monthStart);
    while (d <= now && d <= monthEnd) {
      if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++;
      d.setDate(d.getDate() + 1);
    }

    res.json({ attendanceThisMonth, workingDaysSoFar: workingDays, pendingLeaves, approvedLeaves, openTickets, upcomingMeetings, month: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }) });
  } catch (error) {
    console.error("Employee stats error:", error);
    res.status(500).json({ error: "Failed to load stats" });
  }
};

// ─── Employee Personal Attendance Trend (7 days) ────────
export const getMyAttendanceTrend = async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const start = startOfDay(day);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const record = await Attendance.findOne({ employee_id: userId, date: { $gte: start, $lt: end } }).lean();
      trend.push({ date: start.toISOString().split("T")[0], label: start.toLocaleDateString("en-US", { weekday: "short" }), status: record?.status || "absent", hours: record?.total_hours || 0 });
    }
    res.json(trend);
  } catch (error) {
    res.status(500).json({ error: "Failed to load attendance trend" });
  }
};
