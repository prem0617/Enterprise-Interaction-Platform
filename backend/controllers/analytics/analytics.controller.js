import User from "../../models/User.js";
import Employee from "../../models/Employee.js";
import Meeting from "../../models/Meeting.js";
import { Message } from "../../models/Message.js";
import { ChatChannel } from "../../models/ChatChannel.js";
import { ChannelMember } from "../../models/ChannelMember.js";

// ─── Helpers ────────────────────────────────────────────────
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

function weeksAgo(n) {
  return daysAgo(n * 7);
}

// ─── 1. Overview KPI cards ──────────────────────────────────
export const getOverviewStats = async (req, res) => {
  try {
    const today = startOfDay(new Date());
    const weekAgo = daysAgo(7);
    const prevWeekStart = daysAgo(14);

    const [
      totalEmployees,
      activeEmployees,
      activeUsersToday,
      messagesToday,
      messagesThisWeek,
      messagesPrevWeek,
      activeMeetings,
      meetingsThisWeek,
      meetingsPrevWeek,
      totalChannels,
    ] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ is_active: true }),
      User.countDocuments({ last_login: { $gte: today }, status: "active" }),
      Message.countDocuments({
        created_at: { $gte: today },
        deleted_at: null,
      }),
      Message.countDocuments({
        created_at: { $gte: weekAgo },
        deleted_at: null,
      }),
      Message.countDocuments({
        created_at: { $gte: prevWeekStart, $lt: weekAgo },
        deleted_at: null,
      }),
      Meeting.countDocuments({ status: "active" }),
      Meeting.countDocuments({ createdAt: { $gte: weekAgo } }),
      Meeting.countDocuments({
        createdAt: { $gte: prevWeekStart, $lt: weekAgo },
      }),
      ChatChannel.countDocuments(),
    ]);

    // Percentage change = ((curr - prev) / prev) * 100
    const msgChange =
      messagesPrevWeek > 0
        ? Math.round(
            ((messagesThisWeek - messagesPrevWeek) / messagesPrevWeek) * 100
          )
        : messagesThisWeek > 0
        ? 100
        : 0;

    const meetChange =
      meetingsPrevWeek > 0
        ? Math.round(
            ((meetingsThisWeek - meetingsPrevWeek) / meetingsPrevWeek) * 100
          )
        : meetingsThisWeek > 0
        ? 100
        : 0;

    res.json({
      totalEmployees,
      activeEmployees,
      activeUsersToday,
      messagesToday,
      messagesThisWeek,
      messagesWeekChange: msgChange,
      activeMeetings,
      meetingsThisWeek,
      meetingsWeekChange: meetChange,
      totalChannels,
    });
  } catch (error) {
    console.error("Overview stats error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── 2. Message activity (daily counts for last 30 days) ────
export const getMessageActivity = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = daysAgo(days);

    const pipeline = [
      {
        $match: {
          created_at: { $gte: since },
          deleted_at: null,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$created_at" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const data = await Message.aggregate(pipeline);

    // Fill gaps so every day has a value
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const found = data.find((r) => r._id === key);
      result.push({ date: key, messages: found ? found.count : 0 });
    }

    res.json({ data: result });
  } catch (error) {
    console.error("Message activity error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── 3. Meeting usage stats ─────────────────────────────────
export const getMeetingStats = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = daysAgo(days);

    // Meetings per day
    const perDay = await Meeting.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill gaps
    const dailyData = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const found = perDay.find((r) => r._id === key);
      dailyData.push({ date: key, meetings: found ? found.count : 0 });
    }

    // Average duration (only ended meetings with both timestamps)
    const durationAgg = await Meeting.aggregate([
      {
        $match: {
          started_at: { $exists: true, $ne: null },
          ended_at: { $exists: true, $ne: null },
        },
      },
      {
        $project: {
          duration: { $subtract: ["$ended_at", "$started_at"] },
        },
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: "$duration" },
          totalMeetings: { $sum: 1 },
        },
      },
    ]);

    const avgDurationMinutes =
      durationAgg.length > 0
        ? Math.round(durationAgg[0].avgDuration / 60000)
        : 0;
    const totalEndedMeetings =
      durationAgg.length > 0 ? durationAgg[0].totalMeetings : 0;

    // By type
    const byType = await Meeting.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$meeting_type", count: { $sum: 1 } } },
    ]);

    // By status
    const byStatus = await Meeting.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.json({
      dailyData,
      avgDurationMinutes,
      totalEndedMeetings,
      byType: byType.map((t) => ({ type: t._id, count: t.count })),
      byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
    });
  } catch (error) {
    console.error("Meeting stats error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── 4. Department-wise performance ─────────────────────────
export const getDepartmentStats = async (req, res) => {
  try {
    // Employee count per department
    const deptCounts = await Employee.aggregate([
      { $match: { is_active: true } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Messages per department — join through employee → user → message
    const weekAgo = daysAgo(7);

    // Get all employees grouped by department with user_ids
    const departments = await Employee.aggregate([
      { $match: { is_active: true } },
      {
        $group: {
          _id: "$department",
          userIds: { $push: "$user_id" },
        },
      },
    ]);

    const deptMessageCounts = await Promise.all(
      departments.map(async (dept) => {
        const msgCount = await Message.countDocuments({
          sender_id: { $in: dept.userIds },
          created_at: { $gte: weekAgo },
          deleted_at: null,
        });
        return { department: dept._id, messages: msgCount };
      })
    );

    // Meetings per department (via host)
    const deptMeetingCounts = await Promise.all(
      departments.map(async (dept) => {
        const meetCount = await Meeting.countDocuments({
          host_id: { $in: dept.userIds },
          createdAt: { $gte: weekAgo },
        });
        return { department: dept._id, meetings: meetCount };
      })
    );

    // Combine
    const combined = deptCounts.map((d) => {
      const msgData = deptMessageCounts.find(
        (m) => m.department === d._id
      ) || { messages: 0 };
      const meetData = deptMeetingCounts.find(
        (m) => m.department === d._id
      ) || { meetings: 0 };
      return {
        department: d._id,
        employees: d.count,
        messagesThisWeek: msgData.messages,
        meetingsThisWeek: meetData.meetings,
      };
    });

    res.json({ departments: combined });
  } catch (error) {
    console.error("Department stats error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── 5. Login frequency heatmap (hour × dayOfWeek) ─────────
export const getLoginHeatmap = async (req, res) => {
  try {
    const thirtyDaysAgo = daysAgo(30);

    const data = await User.aggregate([
      {
        $match: {
          last_login: { $gte: thirtyDaysAgo },
          status: "active",
        },
      },
      {
        $project: {
          hour: { $hour: "$last_login" },
          dayOfWeek: { $dayOfWeek: "$last_login" }, // 1=Sun … 7=Sat
        },
      },
      {
        $group: {
          _id: { hour: "$hour", day: "$dayOfWeek" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Also build a 30-day login-per-day array from all users last_login
    // This is a simpler fallback; for a true heatmap we need login history.
    // We'll enrich this by also looking at messages as proxy for activity.
    const activityPerHour = await Message.aggregate([
      { $match: { created_at: { $gte: thirtyDaysAgo }, deleted_at: null } },
      {
        $project: {
          hour: { $hour: "$created_at" },
          dayOfWeek: { $dayOfWeek: "$created_at" },
        },
      },
      {
        $group: {
          _id: { hour: "$hour", day: "$dayOfWeek" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Merge both datasets
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const heatmap = [];
    for (let day = 1; day <= 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const loginEntry = data.find(
          (d) => d._id.hour === hour && d._id.day === day
        );
        const activityEntry = activityPerHour.find(
          (d) => d._id.hour === hour && d._id.day === day
        );
        heatmap.push({
          day: dayNames[day - 1],
          dayIndex: day,
          hour,
          logins: loginEntry ? loginEntry.count : 0,
          activity: activityEntry ? activityEntry.count : 0,
        });
      }
    }

    res.json({ heatmap });
  } catch (error) {
    console.error("Login heatmap error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── 6. System usage trends (weekly aggregated) ─────────────
export const getSystemUsageTrends = async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks) || 12;
    const result = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = weeksAgo(i + 1);
      const weekEnd = weeksAgo(i);

      const [messages, meetings, newUsers] = await Promise.all([
        Message.countDocuments({
          created_at: { $gte: weekStart, $lt: weekEnd },
          deleted_at: null,
        }),
        Meeting.countDocuments({
          createdAt: { $gte: weekStart, $lt: weekEnd },
        }),
        User.countDocuments({
          created_at: { $gte: weekStart, $lt: weekEnd },
        }),
      ]);

      result.push({
        week: weekStart.toISOString().slice(0, 10),
        messages,
        meetings,
        newUsers,
      });
    }

    res.json({ data: result });
  } catch (error) {
    console.error("System usage trends error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── 7. Top active users ────────────────────────────────────
export const getTopActiveUsers = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = daysAgo(days);

    const topSenders = await Message.aggregate([
      { $match: { created_at: { $gte: since }, deleted_at: null } },
      { $group: { _id: "$sender_id", messageCount: { $sum: 1 } } },
      { $sort: { messageCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "employees",
          localField: "_id",
          foreignField: "user_id",
          as: "employee",
        },
      },
      {
        $unwind: { path: "$employee", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 1,
          messageCount: 1,
          first_name: "$user.first_name",
          last_name: "$user.last_name",
          email: "$user.email",
          profile_picture: "$user.profile_picture",
          department: "$employee.department",
          position: "$employee.position",
        },
      },
    ]);

    res.json({ users: topSenders });
  } catch (error) {
    console.error("Top active users error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ─── 8. Employee activity report ────────────────────────────
export const getEmployeeActivityReport = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = daysAgo(days);

    const employees = await Employee.find({ is_active: true }).populate(
      "user_id",
      "first_name last_name email last_login profile_picture status"
    );

    const report = await Promise.all(
      employees.map(async (emp) => {
        const [messageCount, meetingCount] = await Promise.all([
          Message.countDocuments({
            sender_id: emp.user_id._id,
            created_at: { $gte: since },
            deleted_at: null,
          }),
          Meeting.countDocuments({
            $or: [
              { host_id: emp.user_id._id },
              { participants: emp.user_id._id },
            ],
            createdAt: { $gte: since },
          }),
        ]);

        return {
          _id: emp._id,
          user_id: emp.user_id._id,
          first_name: emp.user_id.first_name,
          last_name: emp.user_id.last_name,
          email: emp.user_id.email,
          profile_picture: emp.user_id.profile_picture,
          department: emp.department,
          position: emp.position,
          last_login: emp.user_id.last_login,
          messageCount,
          meetingCount,
        };
      })
    );

    // Sort by total activity
    report.sort(
      (a, b) =>
        b.messageCount + b.meetingCount - (a.messageCount + a.meetingCount)
    );

    res.json({ report });
  } catch (error) {
    console.error("Employee activity report error:", error);
    res.status(500).json({ error: error.message });
  }
};
