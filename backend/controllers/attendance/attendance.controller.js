import Attendance from "../../models/Attendance.js";
import Employee from "../../models/Employee.js";
import Holiday from "../../models/Holiday.js";
import LeaveBalance from "../../models/LeaveBalance.js";

// ─── Helpers ───────────────────────────────────────────
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function dateKey(date) {
  return startOfDay(date).toISOString();
}

const DEFAULT_PAID_LEAVE_ALLOCATION = 21;

async function backfillMissedDaysForUser(userId) {
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (yesterday < new Date(today.getFullYear(), 0, 1)) return;

  const latest = await Attendance.findOne({ employee_id: userId })
    .sort({ date: -1 })
    .select("date");

  const start = latest?.date
    ? startOfDay(new Date(latest.date.getTime() + 24 * 60 * 60 * 1000))
    : startOfDay(new Date(today.getFullYear(), 0, 1));

  if (start > yesterday) return;

  const holidays = await Holiday.find({
    is_active: true,
    date: { $gte: start, $lte: yesterday },
  }).select("date");
  const holidaySet = new Set(holidays.map((h) => dateKey(h.date)));

  for (let cursor = new Date(start); cursor <= yesterday; cursor.setDate(cursor.getDate() + 1)) {
    const day = startOfDay(cursor);
    if (isWeekend(day) || holidaySet.has(dateKey(day))) continue;

    const existing = await Attendance.exists({
      employee_id: userId,
      date: day,
    });
    if (existing) continue;

    await Attendance.create({
      employee_id: userId,
      date: day,
      status: "absent",
      marked_by: "admin",
      notes: "Auto-marked absent due to no check-in",
    });

    await LeaveBalance.findOneAndUpdate(
      {
        employee_id: userId,
        year: day.getFullYear(),
        leave_type: "paid",
      },
      {
        $inc: { used: 1 },
        $setOnInsert: {
          allocated: DEFAULT_PAID_LEAVE_ALLOCATION,
          carried_forward: 0,
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
}

// ─── 1. Check In ───────────────────────────────────────
export const checkIn = async (req, res) => {
  try {
    const userId = req.userId;
    const { work_type, notes } = req.body;
    const today = startOfDay(new Date());

    await backfillMissedDaysForUser(userId);

    // Check if already checked in today
    let attendance = await Attendance.findOne({
      employee_id: userId,
      date: today,
    });

    const openSession = attendance?.sessions?.find((s) => s.check_in && !s.check_out);
    if (openSession) {
      return res.status(400).json({ error: "Already checked in. Please check out first." });
    }

    const now = new Date();
    const checkInHour = now.getHours();

    // Determine status (late if after 9:30 AM)
    let status = "present";
    if (checkInHour > 9 || (checkInHour === 9 && now.getMinutes() > 30)) {
      status = "late";
    }

    if (attendance) {
      attendance.sessions = attendance.sessions || [];
      attendance.sessions.push({ check_in: now, check_out: null, total_hours: 0 });
      if (!attendance.check_in) attendance.check_in = now;
      attendance.check_out = null;
      attendance.status = status;
      attendance.work_type = work_type || "office";
      attendance.notes = notes || "";
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        employee_id: userId,
        date: today,
        check_in: now,
        sessions: [{ check_in: now, check_out: null, total_hours: 0 }],
        status,
        work_type: work_type || "office",
        notes: notes || "",
        marked_by: "self",
      });
    }

    res.json({ success: true, attendance });
  } catch (error) {
    console.error("Check-in error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Attendance already recorded for today" });
    }
    res.status(500).json({ error: "Failed to check in" });
  }
};

// ─── 2. Check Out ──────────────────────────────────────
export const checkOut = async (req, res) => {
  try {
    const userId = req.userId;
    const today = startOfDay(new Date());

    await backfillMissedDaysForUser(userId);

    const attendance = await Attendance.findOne({
      employee_id: userId,
      date: today,
    });

    if (!attendance || !attendance.check_in) {
      return res.status(400).json({ error: "You haven't checked in today" });
    }

    // Backward compatibility: older records may only have check_in/check_out fields.
    if ((!attendance.sessions || attendance.sessions.length === 0) && attendance.check_in && !attendance.check_out) {
      attendance.sessions = [
        {
          check_in: attendance.check_in,
          check_out: null,
          total_hours: 0,
        },
      ];
    }

    const openSessionIndex = (attendance.sessions || []).findIndex(
      (s) => s.check_in && !s.check_out
    );
    if (openSessionIndex === -1) {
      return res.status(400).json({ error: "No active check-in found for checkout" });
    }

    const now = new Date();
    attendance.sessions[openSessionIndex].check_out = now;
    const diffMs = now - attendance.sessions[openSessionIndex].check_in;
    attendance.sessions[openSessionIndex].total_hours =
      Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

    attendance.check_out = now;
    attendance.total_hours = Math.round(
      (attendance.sessions || []).reduce((sum, s) => sum + (s.total_hours || 0), 0) * 100
    ) / 100;

    // If less than 4 hours, mark as half_day
    if (attendance.total_hours < 4 && attendance.status !== "late") {
      attendance.status = "half_day";
    }

    await attendance.save();
    res.json({ success: true, attendance });
  } catch (error) {
    console.error("Check-out error:", error);
    res.status(500).json({ error: "Failed to check out" });
  }
};

// ─── 3. Get Today's Attendance (employee) ──────────────
export const getMyAttendanceToday = async (req, res) => {
  try {
    await backfillMissedDaysForUser(req.userId);
    const today = startOfDay(new Date());
    const attendance = await Attendance.findOne({
      employee_id: req.userId,
      date: today,
    });
    res.json({ attendance: attendance || null });
  } catch (error) {
    console.error("Get today attendance error:", error);
    res.status(500).json({ error: "Failed to fetch today's attendance" });
  }
};

// ─── 4. Get My Attendance History ──────────────────────
export const getMyAttendanceHistory = async (req, res) => {
  try {
    await backfillMissedDaysForUser(req.userId);
    const { month, year } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999);

    const records = await Attendance.find({
      employee_id: req.userId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: -1 });

    // Monthly summary
    const summary = {
      present: 0,
      absent: 0,
      late: 0,
      half_day: 0,
      on_leave: 0,
      total_hours: 0,
    };

    records.forEach((r) => {
      if (r.status === "present" || r.status === "late") summary.present++;
      if (r.status === "late") summary.late++;
      if (r.status === "half_day") summary.half_day++;
      if (r.status === "on_leave") summary.on_leave++;
      summary.total_hours += r.total_hours || 0;
    });

    summary.total_hours = Math.round(summary.total_hours * 100) / 100;

    res.json({ records, summary });
  } catch (error) {
    console.error("Attendance history error:", error);
    res.status(500).json({ error: "Failed to fetch attendance history" });
  }
};

export const getAllAttendance = async (req, res) => {
  try {
    const activeEmployees = await Employee.find({ is_active: true }).select("user_id");
    await Promise.all(
      activeEmployees.map((emp) => backfillMissedDaysForUser(emp.user_id))
    );

    const { date } = req.query;
    const targetDate = date ? startOfDay(new Date(date)) : startOfDay(new Date());

    const filter = { date: targetDate };

    const records = await Attendance.find(filter)
      .populate("employee_id", "first_name last_name email profile_picture")
      .sort({ check_in: -1 });

    const totalEmployees = activeEmployees.length;

    const stats = {
      total: totalEmployees,
      present: records.filter((r) => r.status === "present" || r.status === "late").length,
      late: records.filter((r) => r.status === "late").length,
      absent: totalEmployees - records.length,
      on_leave: records.filter((r) => r.status === "on_leave").length,
    };

    res.json({ records, stats });
  } catch (error) {
    console.error("Get all attendance error:", error);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
};

// ─── 6. Admin: Mark Attendance for Employee ────────────
export const adminMarkAttendance = async (req, res) => {
  try {
    const { employee_id, date, status, work_type, notes } = req.body;
    const targetDate = startOfDay(new Date(date));

    const attendance = await Attendance.findOneAndUpdate(
      { employee_id, date: targetDate },
      {
        employee_id,
        date: targetDate,
        status: status || "present",
        work_type: work_type || "office",
        notes: notes || "",
        marked_by: "admin",
        check_in: status === "present" || status === "late" ? new Date(targetDate.getTime() + 9 * 60 * 60 * 1000) : null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, attendance });
  } catch (error) {
    console.error("Admin mark attendance error:", error);
    res.status(500).json({ error: "Failed to mark attendance" });
  }
};

// ─── 7. Get Holidays ──────────────────────────────────
export const getHolidays = async (req, res) => {
  try {
    const { year } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const startDate = new Date(y, 0, 1);
    const endDate = new Date(y, 11, 31, 23, 59, 59, 999);

    const holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate },
      is_active: true,
    }).sort({ date: 1 });

    res.json({ holidays });
  } catch (error) {
    console.error("Get holidays error:", error);
    res.status(500).json({ error: "Failed to fetch holidays" });
  }
};

// ─── 8. Admin: Create Holiday ──────────────────────────
export const createHoliday = async (req, res) => {
  try {
    const { name, date, type, description } = req.body;

    if (!name || !date) {
      return res.status(400).json({ error: "Name and date are required" });
    }

    const holiday = await Holiday.create({
      name,
      date: startOfDay(new Date(date)),
      type: type || "public",
      description: description || "",
      created_by: req.userId,
    });

    res.status(201).json({ success: true, holiday });
  } catch (error) {
    console.error("Create holiday error:", error);
    res.status(500).json({ error: "Failed to create holiday" });
  }
};

// ─── 9. Admin: Update Holiday ──────────────────────────
export const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.date) {
      updates.date = startOfDay(new Date(updates.date));
    }

    const holiday = await Holiday.findByIdAndUpdate(id, updates, { new: true });
    if (!holiday) {
      return res.status(404).json({ error: "Holiday not found" });
    }

    res.json({ success: true, holiday });
  } catch (error) {
    console.error("Update holiday error:", error);
    res.status(500).json({ error: "Failed to update holiday" });
  }
};

// ─── 10. Admin: Delete Holiday ─────────────────────────
export const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByIdAndUpdate(id, { is_active: false }, { new: true });
    if (!holiday) {
      return res.status(404).json({ error: "Holiday not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Delete holiday error:", error);
    res.status(500).json({ error: "Failed to delete holiday" });
  }
};


