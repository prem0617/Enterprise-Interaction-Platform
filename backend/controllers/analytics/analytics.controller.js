import Employee from "../../models/Employee.js";
import Department from "../../models/Department.js";
import Attendance from "../../models/Attendance.js";
import LeaveRequest from "../../models/LeaveRequest.js";
import { SupportTicket } from "../../models/SupportTicket.js";
import Meeting from "../../models/Meeting.js";

// ─── Helpers ───────────────────────────────────────────
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Admin Analytics Overview ──────────────────────────
export const getAnalyticsOverview = async (req, res) => {
  try {
    const now = new Date();

    // Last 7 days date range
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      last7Days.push(startOfDay(d));
    }

    // ─── Department distribution ───
    const departments = await Department.find({ is_active: true }).lean();
    const employees = await Employee.find({ is_active: true })
      .populate("department", "name")
      .lean();

    const deptMap = {};
    for (const emp of employees) {
      const deptName = emp.department?.name || "Unassigned";
      deptMap[deptName] = (deptMap[deptName] || 0) + 1;
    }
    const departmentDistribution = Object.entries(deptMap).map(
      ([name, count]) => ({ name, count })
    );

    // ─── Attendance trend (last 7 days) ───
    const attendanceTrend = [];
    for (const day of last7Days) {
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const count = await Attendance.countDocuments({
        date: { $gte: day, $lt: nextDay },
        status: { $in: ["present", "late", "half_day"] },
      });
      attendanceTrend.push({
        date: day.toISOString().split("T")[0],
        label: day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        present: count,
      });
    }

    // ─── Ticket stats by status ───
    const ticketStatuses = ["pending", "open", "in_progress", "resolved", "closed"];
    const ticketStats = [];
    for (const status of ticketStatuses) {
      const count = await SupportTicket.countDocuments({ status });
      ticketStats.push({ status, count });
    }

    // ─── Ticket stats by priority ───
    const ticketPriorities = ["low", "medium", "high", "critical"];
    const ticketByPriority = [];
    for (const priority of ticketPriorities) {
      const count = await SupportTicket.countDocuments({ priority });
      ticketByPriority.push({ priority, count });
    }

    // ─── Leave stats by type ───
    const leaveTypes = ["paid", "floater", "marriage", "unpaid"];
    const leaveByType = [];
    for (const type of leaveTypes) {
      const count = await LeaveRequest.countDocuments({ leave_type: type });
      leaveByType.push({ type, count });
    }

    // ─── Leave stats by status ───
    const leaveStatuses = ["pending", "approved", "rejected", "cancelled"];
    const leaveByStatus = [];
    for (const status of leaveStatuses) {
      const count = await LeaveRequest.countDocuments({ status });
      leaveByStatus.push({ status, count });
    }

    // ─── Meeting stats ───
    const meetingStatuses = ["scheduled", "active", "ended", "cancelled"];
    const meetingByStatus = [];
    for (const status of meetingStatuses) {
      const count = await Meeting.countDocuments({ status });
      meetingByStatus.push({ status, count });
    }

    // ─── Position distribution ───
    const positionMap = {};
    for (const emp of employees) {
      const pos = emp.position || "unspecified";
      positionMap[pos] = (positionMap[pos] || 0) + 1;
    }
    const positionDistribution = Object.entries(positionMap).map(
      ([position, count]) => ({ position, count })
    );

    res.json({
      departmentDistribution,
      attendanceTrend,
      ticketStats,
      ticketByPriority,
      leaveByType,
      leaveByStatus,
      meetingByStatus,
      positionDistribution,
      totalEmployees: employees.length,
      totalDepartments: departments.length,
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

    // Current month date range
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    // Find the employee record for this user (needed for ticket lookup)
    const employee = await Employee.findOne({ user_id: userId }).lean();

    const [
      attendanceThisMonth,
      pendingLeaves,
      approvedLeaves,
      openTickets,
      upcomingMeetings,
    ] = await Promise.all([
      Attendance.countDocuments({
        employee_id: userId,
        date: { $gte: monthStart, $lte: monthEnd },
        status: { $in: ["present", "late", "half_day"] },
      }),
      LeaveRequest.countDocuments({ employee_id: userId, status: "pending" }),
      LeaveRequest.countDocuments({ employee_id: userId, status: "approved" }),
      employee
        ? SupportTicket.countDocuments({
            assigned_agent_id: employee._id,
            status: { $in: ["open", "in_progress"] },
          })
        : Promise.resolve(0),
      Meeting.countDocuments({
        participants: userId,
        status: "scheduled",
        scheduled_at: { $gte: now },
      }),
    ]);

    // Calculate working days passed this month (Mon–Fri)
    let workingDays = 0;
    const today = new Date(now);
    const d = new Date(monthStart);
    while (d <= today && d <= monthEnd) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++;
      d.setDate(d.getDate() + 1);
    }

    res.json({
      attendanceThisMonth,
      workingDaysSoFar: workingDays,
      pendingLeaves,
      approvedLeaves,
      openTickets,
      upcomingMeetings,
      month: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    });
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

      const record = await Attendance.findOne({
        employee_id: userId,
        date: { $gte: start, $lt: end },
      }).lean();

      trend.push({
        date: start.toISOString().split("T")[0],
        label: start.toLocaleDateString("en-US", { weekday: "short" }),
        status: record?.status || "absent",
        hours: record?.total_hours || 0,
      });
    }

    res.json(trend);
  } catch (error) {
    console.error("Attendance trend error:", error);
    res.status(500).json({ error: "Failed to load attendance trend" });
  }
};
