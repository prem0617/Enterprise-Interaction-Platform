import { useState, useEffect } from "react";
import axios from "axios";
import { BACKEND_URL } from "../../../config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  CalendarCheck,
  Ticket,
  TrendingUp,
  RefreshCcw,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";

const COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
];

const STATUS_COLORS = {
  pending: "#eab308",
  open: "#3b82f6",
  in_progress: "#8b5cf6",
  resolved: "#22c55e",
  closed: "#6b7280",
  approved: "#22c55e",
  rejected: "#f43f5e",
  cancelled: "#9ca3af",
  scheduled: "#3b82f6",
  active: "#22c55e",
  ended: "#6b7280",
};

const PRIORITY_COLORS = {
  low: "#6b7280",
  medium: "#3b82f6",
  high: "#f97316",
  critical: "#f43f5e",
};

function formatLabel(str) {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-zinc-200 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || entry.fill }}>
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const token = localStorage.getItem("token");

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/analytics/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Skeleton className="h-10 w-64 bg-zinc-800" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 bg-zinc-800 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-80 bg-zinc-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        Failed to load analytics data. Please try again.
      </div>
    );
  }

  const totalTickets = data.ticketStats.reduce((sum, t) => sum + t.count, 0);
  const totalLeaves = data.leaveByStatus.reduce((sum, l) => sum + l.count, 0);
  const totalMeetings = data.meetingByStatus.reduce((sum, m) => sum + m.count, 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="size-6 text-indigo-400" />
              Analytics Dashboard
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Organization-wide insights and metrics
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCcw className={`size-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-500/10">
                  <Users className="size-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{data.totalEmployees}</p>
                  <p className="text-xs text-zinc-500">Active Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-violet-500/10">
                  <Building2 className="size-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{data.totalDepartments}</p>
                  <p className="text-xs text-zinc-500">Departments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10">
                  <Ticket className="size-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{totalTickets}</p>
                  <p className="text-xs text-zinc-500">Total Tickets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10">
                  <CalendarCheck className="size-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{totalMeetings}</p>
                  <p className="text-xs text-zinc-500">Total Meetings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Distribution - Pie Chart */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <PieChartIcon className="size-4 text-indigo-400" />
                Employees by Department
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.departmentDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.departmentDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="name"
                    >
                      {data.departmentDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(val) => <span className="text-xs text-zinc-400">{val}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
                  No department data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance Trend - Area Chart */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <CalendarCheck className="size-4 text-emerald-400" />
                Attendance Trend (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.attendanceTrend}>
                  <defs>
                    <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a1a1aa" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="present"
                    name="Present"
                    stroke="#22c55e"
                    fill="url(#attendanceGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ticket Status - Bar Chart */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Ticket className="size-4 text-amber-400" />
                Tickets by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.ticketStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 11, fill: "#a1a1aa" }}
                    tickFormatter={formatLabel}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} labelFormatter={formatLabel} />
                  <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]}>
                    {data.ticketStats.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] || COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ticket Priority - Bar Chart */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <BarChart3 className="size-4 text-rose-400" />
                Tickets by Priority
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.ticketByPriority}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="priority"
                    tick={{ fontSize: 11, fill: "#a1a1aa" }}
                    tickFormatter={formatLabel}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} labelFormatter={formatLabel} />
                  <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]}>
                    {data.ticketByPriority.map((entry, i) => (
                      <Cell key={i} fill={PRIORITY_COLORS[entry.priority] || COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leave by Status - Bar Chart */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <CalendarCheck className="size-4 text-blue-400" />
                Leave Requests by Status
                <span className="ml-auto text-xs text-zinc-600 font-normal">
                  Total: {totalLeaves}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.leaveByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 11, fill: "#a1a1aa" }}
                    tickFormatter={formatLabel}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} labelFormatter={formatLabel} />
                  <Bar dataKey="count" name="Requests" radius={[4, 4, 0, 0]}>
                    {data.leaveByStatus.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] || COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Meeting by Status - Pie Chart */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <PieChartIcon className="size-4 text-violet-400" />
                Meetings by Status
                <span className="ml-auto text-xs text-zinc-600 font-normal">
                  Total: {totalMeetings}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.meetingByStatus.some((m) => m.count > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.meetingByStatus.filter((m) => m.count > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="status"
                    >
                      {data.meetingByStatus
                        .filter((m) => m.count > 0)
                        .map((entry, i) => (
                          <Cell
                            key={i}
                            fill={STATUS_COLORS[entry.status] || COLORS[i]}
                          />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(val) => (
                        <span className="text-xs text-zinc-400">{formatLabel(val)}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
                  No meeting data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 4 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leave by Type */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <BarChart3 className="size-4 text-teal-400" />
                Leave Requests by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.leaveByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="type"
                    tick={{ fontSize: 11, fill: "#a1a1aa" }}
                    tickFormatter={formatLabel}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} labelFormatter={formatLabel} />
                  <Bar dataKey="count" name="Requests" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Position Distribution - Pie Chart */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <PieChartIcon className="size-4 text-pink-400" />
                Employees by Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.positionDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.positionDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="position"
                    >
                      {data.positionDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(val) => (
                        <span className="text-xs text-zinc-400">{formatLabel(val)}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
                  No position data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
