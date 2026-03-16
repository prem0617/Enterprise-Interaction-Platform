import Attendance from "../../models/Attendance.js";
import Employee from "../../models/Employee.js";
import Holiday from "../../models/Holiday.js";
import { createNotification } from "../../utils/notificationHelper.js";

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

// ─── 1. Check In ───────────────────────────────────────
export const checkIn = async (req, res) => {
  try {
    const userId = req.userId;
    const { work_type, notes } = req.body;
    const today = startOfDay(new Date());

    // Check if already checked in today
    let attendance = await Attendance.findOne({
      employee_id: userId,
      date: today,
    });

    if (attendance && attendance.check_in) {
      return res.status(400).json({ error: "Already checked in today" });
    }

    const now = new Date();
    const checkInHour = now.getHours();

    // Late if checked in after 10:00 AM
    let status = "present";
    if (checkInHour >= 10) {
      status = "late";
    }

    if (attendance) {
      attendance.check_in = now;
      attendance.status = status;
      attendance.work_type = work_type || "office";
      attendance.notes = notes || "";
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        employee_id: userId,
        date: today,
        check_in: now,
        status,
        work_type: work_type || "office",
        notes: notes || "",
        marked_by: "self",
      });
    }

    // Notify user if late
    if (status === "late") {
      createNotification({
        recipientId: userId,
        type: "attendance_late",
        priority: "medium",
        title: "Late Check-in Recorded",
        body: `You checked in at ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} — after the 10:00 AM deadline.`,
        reference: { kind: "attendance", id: attendance._id },
      }).catch(() => {});
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

    const attendance = await Attendance.findOne({
      employee_id: userId,
      date: today,
    });

    if (!attendance || !attendance.check_in) {
      return res.status(400).json({ error: "You haven't checked in today" });
    }

    if (attendance.check_out) {
      return res.status(400).json({ error: "Already checked out today" });
    }

    const now = new Date();

    // Auto-end active break on checkout
    if (attendance.is_on_break) {
      const activeBreak = attendance.breaks.find((b) => !b.end);
      if (activeBreak) {
        activeBreak.end = now;
        const breakMs = now - activeBreak.start;
        attendance.total_break_minutes += Math.round(breakMs / 60000);
      }
      attendance.is_on_break = false;
    }

    attendance.check_out = now;

    // Calculate total hours minus break time
    const diffMs = now - attendance.check_in;
    const grossHours = diffMs / (1000 * 60 * 60);
    const breakHours = (attendance.total_break_minutes || 0) / 60;
    attendance.total_hours = Math.round((grossHours - breakHours) * 100) / 100;

    // 8 flexible working hours target: half_day if less than 4 hours worked
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

// ─── 2b. Start Break (Pause) ─────────────────────────
export const startBreak = async (req, res) => {
  try {
    const userId = req.userId;
    const { reason } = req.body;
    const today = startOfDay(new Date());

    const attendance = await Attendance.findOne({ employee_id: userId, date: today });
    if (!attendance || !attendance.check_in) return res.status(400).json({ error: "You haven't checked in today" });
    if (attendance.check_out) return res.status(400).json({ error: "Already checked out" });
    if (attendance.is_on_break) return res.status(400).json({ error: "Already on a break" });

    attendance.breaks.push({ start: new Date(), reason: reason || "" });
    attendance.is_on_break = true;
    await attendance.save();

    res.json({ success: true, attendance });
  } catch (error) {
    console.error("Start break error:", error);
    res.status(500).json({ error: "Failed to start break" });
  }
};

// ─── 2c. End Break (Resume) ──────────────────────────
export const endBreak = async (req, res) => {
  try {
    const userId = req.userId;
    const today = startOfDay(new Date());

    const attendance = await Attendance.findOne({ employee_id: userId, date: today });
    if (!attendance) return res.status(400).json({ error: "No attendance record" });
    if (!attendance.is_on_break) return res.status(400).json({ error: "Not currently on a break" });

    const now = new Date();
    const activeBreak = attendance.breaks.find((b) => !b.end);
    if (activeBreak) {
      activeBreak.end = now;
      const breakMs = now - activeBreak.start;
      attendance.total_break_minutes = (attendance.total_break_minutes || 0) + Math.round(breakMs / 60000);
    }
    attendance.is_on_break = false;
    await attendance.save();

    res.json({ success: true, attendance });
  } catch (error) {
    console.error("End break error:", error);
    res.status(500).json({ error: "Failed to end break" });
  }
};

// ─── 3. Get Today's Attendance (employee) ──────────────
export const getMyAttendanceToday = async (req, res) => {
  try {
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
    const { date } = req.query;
    const targetDate = date ? startOfDay(new Date(date)) : startOfDay(new Date());

    const filter = { date: targetDate };

    const records = await Attendance.find(filter)
      .populate("employee_id", "first_name last_name email profile_picture")
      .sort({ check_in: -1 });

    const totalEmployees = await Employee.countDocuments({ is_active: true });

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


