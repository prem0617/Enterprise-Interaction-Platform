import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Users,
  MessageSquare,
  Video,
  Activity,
  UserCheck,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  Building,
  Flame,
  Crown,
  RefreshCcw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { BACKEND_URL } from "../../../config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a78bfa",
  "#c4b5fd",
  "#818cf8",
  "#7c3aed",
  "#4f46e5",
];
const STATUS_COLORS = {
  scheduled: "#6366f1",
  active: "#22c55e",
  ended: "#a1a1aa",
  cancelled: "#ef4444",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState(null);
  const [messageActivity, setMessageActivity] = useState([]);
  const [meetingStats, setMeetingStats] = useState(null);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [usageTrends, setUsageTrends] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [employeeReport, setEmployeeReport] = useState([]);
  const [timeRange, setTimeRange] = useState("7");

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [
          overviewRes,
          msgRes,
          meetRes,
          deptRes,
          heatRes,
          trendRes,
          topRes,
          empRes,
        ] = await Promise.all([
          axios.get(`${BACKEND_URL}/analytics/overview`, { headers }),
          axios.get(
            `${BACKEND_URL}/analytics/messages?days=${timeRange}`,
            { headers }
          ),
          axios.get(
            `${BACKEND_URL}/analytics/meetings?days=${timeRange}`,
            { headers }
          ),
          axios.get(`${BACKEND_URL}/analytics/departments`, { headers }),
          axios.get(`${BACKEND_URL}/analytics/login-heatmap`, { headers }),
          axios.get(`${BACKEND_URL}/analytics/usage-trends`, { headers }),
          axios.get(
            `${BACKEND_URL}/analytics/top-users?days=${timeRange}`,
            { headers }
          ),
          axios.get(
            `${BACKEND_URL}/analytics/employee-activity?days=${timeRange}`,
            { headers }
          ),
        ]);

        setOverview(overviewRes.data);
        setMessageActivity(msgRes.data.data || []);
        setMeetingStats(meetRes.data);
        setDepartmentStats(deptRes.data.departments || []);
        setHeatmapData(heatRes.data.heatmap || []);
        setUsageTrends(trendRes.data.data || []);
        setTopUsers(topRes.data.users || []);
        setEmployeeReport(empRes.data.report || []);
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [timeRange]
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Heatmap helper ─────────────────────────
  const maxActivity = Math.max(
    ...heatmapData.map((d) => d.activity + d.logins),
    1
  );
  const getHeatColor = (val) => {
    const intensity = val / maxActivity;
    if (intensity === 0) return "bg-zinc-800/50";
    if (intensity < 0.25) return "bg-indigo-500/20";
    if (intensity < 0.5) return "bg-indigo-500/40";
    if (intensity < 0.75) return "bg-indigo-500/60";
    return "bg-indigo-500/90";
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-52 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="size-5 text-indigo-500" />
            Reports &amp; Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Track employee activity, system usage, and department performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs
            value={timeRange}
            onValueChange={setTimeRange}
            className="h-9"
          >
            <TabsList className="h-8">
              <TabsTrigger value="7" className="text-xs px-3 h-7">
                7d
              </TabsTrigger>
              <TabsTrigger value="14" className="text-xs px-3 h-7">
                14d
              </TabsTrigger>
              <TabsTrigger value="30" className="text-xs px-3 h-7">
                30d
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            className="h-8"
          >
            <RefreshCcw
              className={`size-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── KPI Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          icon={UserCheck}
          label="Active Users Today"
          value={overview?.activeUsersToday ?? 0}
          sub={`${overview?.activeEmployees ?? 0} / ${overview?.totalEmployees ?? 0} employees active`}
        />
        <KPICard
          icon={MessageSquare}
          label="Messages This Week"
          value={overview?.messagesThisWeek ?? 0}
          change={overview?.messagesWeekChange}
          sub={`${overview?.messagesToday ?? 0} today`}
        />
        <KPICard
          icon={Video}
          label="Meetings This Week"
          value={overview?.meetingsThisWeek ?? 0}
          change={overview?.meetingsWeekChange}
          sub={`${overview?.activeMeetings ?? 0} active now`}
        />
        <KPICard
          icon={Clock}
          label="Avg Meeting Duration"
          value={`${meetingStats?.avgDurationMinutes ?? 0}m`}
          sub={`${meetingStats?.totalEndedMeetings ?? 0} meetings completed`}
        />
      </div>

      {/* ─── Row: Message Activity + Meeting Breakdown ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Message Activity Chart */}
        <Card className="xl:col-span-2 bg-zinc-900/80 border-zinc-800/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="size-4 text-indigo-400" />
              Message Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={messageActivity}>
                  <defs>
                    <linearGradient
                      id="msgGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#6366f1"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => d.slice(5)}
                    stroke="#52525b"
                    fontSize={11}
                  />
                  <YAxis stroke="#52525b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="messages"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#msgGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Meeting Status Pie */}
        <Card className="bg-zinc-900/80 border-zinc-800/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Video className="size-4 text-violet-400" />
              Meeting Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(meetingStats?.byStatus || []).map((s) => ({
                      name: s.status,
                      value: s.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(meetingStats?.byStatus || []).map((s, i) => (
                      <Cell
                        key={i}
                        fill={STATUS_COLORS[s.status] || COLORS[i]}
                      />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value) =>
                      value.charAt(0).toUpperCase() + value.slice(1)
                    }
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Department Performance ────────────────── */}
      <Card className="bg-zinc-900/80 border-zinc-800/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building className="size-4 text-cyan-400" />
            Department Performance
            <Badge variant="secondary" className="text-[10px] ml-auto">
              This week
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={departmentStats}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="department" stroke="#52525b" fontSize={11} />
                <YAxis stroke="#52525b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="messagesThisWeek"
                  name="Messages"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="meetingsThisWeek"
                  name="Meetings"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="employees"
                  name="Employees"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ─── Row: System Usage Trends + Login Heatmap ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* System Usage Trends */}
        <Card className="bg-zinc-900/80 border-zinc-800/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="size-4 text-emerald-400" />
              System Usage Trends
              <Badge variant="secondary" className="text-[10px] ml-auto">
                12 weeks
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageTrends}>
                  <defs>
                    <linearGradient
                      id="trendMsg"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop
                        offset="95%"
                        stopColor="#6366f1"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                    <linearGradient
                      id="trendMeet"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop
                        offset="95%"
                        stopColor="#8b5cf6"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="week"
                    tickFormatter={(d) => d.slice(5)}
                    stroke="#52525b"
                    fontSize={11}
                  />
                  <YAxis stroke="#52525b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="messages"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#trendMsg)"
                    name="Messages"
                  />
                  <Area
                    type="monotone"
                    dataKey="meetings"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#trendMeet)"
                    name="Meetings"
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Login Heatmap */}
        <Card className="bg-zinc-900/80 border-zinc-800/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flame className="size-4 text-orange-400" />
              Activity Heatmap
              <Badge variant="secondary" className="text-[10px] ml-auto">
                Last 30 days
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {/* Hour labels */}
              <div className="flex items-center gap-0.5 mb-1">
                <div className="w-8" />
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    className="flex-1 text-center text-[9px] text-muted-foreground"
                  >
                    {h % 4 === 0 ? `${h}` : ""}
                  </div>
                ))}
              </div>
              {/* Rows: one per day */}
              {DAY_LABELS.map((day, dayIdx) => (
                <div key={day} className="flex items-center gap-0.5">
                  <div className="w-8 text-[10px] text-muted-foreground font-medium">
                    {day}
                  </div>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const entry = heatmapData.find(
                      (d) => d.dayIndex === dayIdx + 1 && d.hour === hour
                    );
                    const val = entry
                      ? entry.activity + entry.logins
                      : 0;
                    return (
                      <div
                        key={hour}
                        className={`flex-1 h-5 rounded-[3px] transition-colors ${getHeatColor(val)}`}
                        title={`${day} ${hour}:00 — ${val} activities`}
                      />
                    );
                  })}
                </div>
              ))}
              {/* Legend */}
              <div className="flex items-center justify-end gap-1.5 mt-2">
                <span className="text-[10px] text-muted-foreground">Less</span>
                <div className="w-3 h-3 rounded-sm bg-zinc-800/50" />
                <div className="w-3 h-3 rounded-sm bg-indigo-500/20" />
                <div className="w-3 h-3 rounded-sm bg-indigo-500/40" />
                <div className="w-3 h-3 rounded-sm bg-indigo-500/60" />
                <div className="w-3 h-3 rounded-sm bg-indigo-500/90" />
                <span className="text-[10px] text-muted-foreground">More</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Row: Top Active Users + Employee Activity ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Top Active Users */}
        <Card className="xl:col-span-2 bg-zinc-900/80 border-zinc-800/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Crown className="size-4 text-amber-400" />
              Top Active Users
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {timeRange}d
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {topUsers.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No activity data
                </div>
              ) : (
                topUsers.map((u, idx) => (
                  <div
                    key={u._id}
                    className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-xs font-bold text-muted-foreground w-5 text-right">
                      {idx + 1}
                    </span>
                    <Avatar className="size-8">
                      <AvatarImage src={u.profile_picture} />
                      <AvatarFallback className="text-[10px]">
                        {u.first_name?.[0]}
                        {u.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {u.first_name} {u.last_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {u.department
                          ? `${u.department?.name || "—"} · ${u.position || ""}`
                          : u.email}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs tabular-nums">
                      {u.messageCount}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Employee Activity Report Table */}
        <Card className="xl:col-span-3 bg-zinc-900/80 border-zinc-800/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="size-4 text-emerald-400" />
              Employee Activity Report
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {timeRange}d
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">
                      Employee
                    </th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">
                      Dept
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">
                      Messages
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">
                      Meetings
                    </th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">
                      Last Login
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employeeReport.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-muted-foreground"
                      >
                        No data
                      </td>
                    </tr>
                  ) : (
                    employeeReport.slice(0, 15).map((emp) => (
                      <tr
                        key={emp._id}
                        className="border-b border-zinc-800/50 hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-6">
                              <AvatarImage src={emp.profile_picture} />
                              <AvatarFallback className="text-[9px]">
                                {emp.first_name?.[0]}
                                {emp.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[140px]">
                              {emp.first_name} {emp.last_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                            style={{
                              borderColor:
                                emp.department?.color || "#52525b",
                              color:
                                emp.department?.color || "#a1a1aa",
                            }}
                          >
                            {emp.department?.name || "—"}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-center tabular-nums">
                          {emp.messageCount}
                        </td>
                        <td className="py-2 px-2 text-center tabular-nums">
                          {emp.meetingCount}
                        </td>
                        <td className="py-2 px-2 text-xs text-muted-foreground">
                          {emp.last_login
                            ? new Date(emp.last_login).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "Never"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Meeting Types Breakdown ───────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Meetings per day */}
        <Card className="bg-zinc-900/80 border-zinc-800/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Video className="size-4 text-violet-400" />
              Meeting Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={meetingStats?.dailyData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => d.slice(5)}
                    stroke="#52525b"
                    fontSize={11}
                  />
                  <YAxis stroke="#52525b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="meetings"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Meeting by Type */}
        <Card className="bg-zinc-900/80 border-zinc-800/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="size-4 text-cyan-400" />
              Meeting Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(meetingStats?.byType || []).map((t) => ({
                      name: t.type?.replace("_", " ") || "Unknown",
                      value: t.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {(meetingStats?.byType || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── KPI Card Component ────────────────────────────────────
function KPICard({ icon: Icon, label, value, change, sub }) {
  return (
    <Card className="bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700/80 transition-all duration-200 overflow-hidden">
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="size-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Icon className="size-[18px] text-indigo-400" />
          </div>
          {change !== undefined && change !== null && (
            <Badge
              variant={change >= 0 ? "default" : "destructive"}
              className="text-[10px] gap-0.5"
            >
              {change >= 0 ? (
                <TrendingUp className="size-2.5" />
              ) : (
                <TrendingDown className="size-2.5" />
              )}
              {change >= 0 ? "+" : ""}
              {change}%
            </Badge>
          )}
        </div>
        <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
        <p className="text-xs text-zinc-500 mt-1 font-medium">{label}</p>
        {sub && (
          <p className="text-[10px] text-zinc-600 mt-1">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}
