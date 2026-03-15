import { useState, useEffect } from "react";
import axios from "axios";
import { BACKEND_URL } from "../../../config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, Building2, CalendarCheck, Ticket, TrendingUp, RefreshCcw,
  BarChart3, PieChart as PieChartIcon, Cake, Calendar, MessageSquare,
  Clock, Globe, Briefcase, UserPlus, Video, Timer, ArrowUpRight,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area, Legend,
} from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6"];
const STATUS_COLORS = { pending: "#eab308", open: "#3b82f6", in_progress: "#8b5cf6", resolved: "#22c55e", closed: "#6b7280", approved: "#22c55e", rejected: "#f43f5e", cancelled: "#9ca3af", scheduled: "#3b82f6", active: "#22c55e", ended: "#6b7280" };
const PRIORITY_COLORS = { low: "#6b7280", medium: "#3b82f6", high: "#f97316", critical: "#f43f5e" };
const COUNTRY_FLAGS = { usa: "🇺🇸", india: "🇮🇳", germany: "🇩🇪" };

function formatLabel(str) { return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }

const ChartTooltip = ({ active, payload, label }) => {
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

function KpiCard({ icon: Icon, iconColor, iconBg, label, value, sub }) {
  return (
    <Card className="bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700/60 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${iconBg}`}><Icon className={`size-5 ${iconColor}`} /></div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-white tabular-nums leading-none">{value}</p>
            <p className="text-[11px] text-zinc-500 mt-1">{label}</p>
            {sub && <p className="text-[10px] text-zinc-600">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const token = localStorage.getItem("token");

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/analytics/overview`, { headers: { Authorization: `Bearer ${token}` } });
      setData(res.data);
    } catch (err) { console.error("Failed to load analytics:", err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Skeleton className="h-10 w-64 bg-zinc-800" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72 bg-zinc-800 rounded-xl" />)}</div>
    </div>
  );

  if (!data) return <div className="flex items-center justify-center h-64 text-zinc-500">Failed to load analytics data.</div>;

  const totalTickets = data.ticketStats?.reduce((s, t) => s + t.count, 0) || 0;
  const totalMeetings = data.meetingByStatus?.reduce((s, m) => s + m.count, 0) || 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><TrendingUp className="size-6 text-indigo-400" />Analytics Dashboard</h1>
            <p className="text-sm text-zinc-400 mt-1">Organization-wide insights and metrics</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); fetchAnalytics(); }} disabled={refreshing} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            <RefreshCcw className={`size-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>

        {/* ═══ KPI Row ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
          <KpiCard icon={Users} iconColor="text-indigo-400" iconBg="bg-indigo-500/10" label="Active Employees" value={data.totalEmployees} sub={`${data.totalDepartments} depts · ${data.totalTeams} teams`} />
          <KpiCard icon={Video} iconColor="text-emerald-400" iconBg="bg-emerald-500/10" label="Meetings This Month" value={data.totalMeetingsThisMonth} sub={`${totalMeetings} total`} />
          <KpiCard icon={MessageSquare} iconColor="text-blue-400" iconBg="bg-blue-500/10" label="Messages Today" value={data.totalMessagesToday} />
          <KpiCard icon={Briefcase} iconColor="text-amber-400" iconBg="bg-amber-500/10" label="Pending Leaves" value={data.pendingLeaves} sub={`Avg tenure: ${Math.round(data.avgTenureDays / 30)}mo`} />
        </div>

        {/* ═══ Today's Attendance Snapshot ═══ */}
        <Card className="bg-zinc-900/80 border-zinc-800/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <CalendarCheck className="size-4 text-emerald-400" />Today's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Present", value: data.todayAttendance?.present || 0, color: "emerald" },
                { label: "Late", value: data.todayAttendance?.late || 0, color: "amber" },
                { label: "Absent", value: data.todayAttendance?.absent || 0, color: "red" },
                { label: "On Leave", value: data.todayAttendance?.on_leave || 0, color: "indigo" },
                { label: "Avg Hours", value: `${data.todayAttendance?.avg_hours || 0}h`, color: "cyan" },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-lg bg-${color}-500/5 border border-${color}-500/10 p-3 text-center`}>
                  <p className={`text-lg font-bold text-${color}-400 tabular-nums`}>{value}</p>
                  <p className="text-[10px] text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ═══ Row: Birthdays + Upcoming Meetings ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Birthdays */}
          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Cake className="size-4 text-pink-400" />Upcoming Birthdays
                {data.upcomingBirthdays?.length > 0 && <Badge className="ml-auto text-[10px] bg-pink-500/10 text-pink-400 border-pink-500/20">{data.upcomingBirthdays.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-[280px] overflow-y-auto">
              {(!data.upcomingBirthdays || data.upcomingBirthdays.length === 0) ? (
                <p className="text-sm text-zinc-500 py-6 text-center">No upcoming birthdays in the next 30 days</p>
              ) : data.upcomingBirthdays.map((b) => (
                <div key={b._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <div className="size-9 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center text-sm font-bold text-pink-300 flex-shrink-0">
                    {b.first_name?.[0]}{b.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{b.first_name} {b.last_name}</p>
                    <p className="text-[10px] text-zinc-500">{b.department} · {formatLabel(b.position || "")}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-pink-400">
                      {b.days_until === 0 ? "🎂 Today!" : b.days_until === 1 ? "🎂 Tomorrow!" : `in ${b.days_until}d`}
                    </p>
                    <p className="text-[10px] text-zinc-600">
                      {new Date(b.next_birthday).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {b.turning_age ? ` · ${b.turning_age}y` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming Meetings */}
          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Calendar className="size-4 text-emerald-400" />Upcoming Meetings
                {data.upcomingMeetings?.length > 0 && <Badge className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{data.upcomingMeetings.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-[280px] overflow-y-auto">
              {(!data.upcomingMeetings || data.upcomingMeetings.length === 0) ? (
                <p className="text-sm text-zinc-500 py-6 text-center">No meetings in the next 7 days</p>
              ) : data.upcomingMeetings.map((m) => (
                <div key={m._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Video className="size-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{m.title || "Untitled Meeting"}</p>
                    <p className="text-[10px] text-zinc-500">
                      Host: {m.host_id?.first_name} {m.host_id?.last_name} · {m.duration_minutes || 30}min
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-emerald-400">
                      {new Date(m.scheduled_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                    <p className="text-[10px] text-zinc-600">
                      {new Date(m.scheduled_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ═══ Row: Attendance Trend + Message Activity ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <CalendarCheck className="size-4 text-emerald-400" />Attendance Trend (7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.attendanceTrend}>
                  <defs>
                    <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a1a1aa" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="present" name="Present" stroke="#22c55e" fill="url(#presentGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="late" name="Late" stroke="#f59e0b" fill="url(#lateGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <MessageSquare className="size-4 text-blue-400" />Message Activity (7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.messageActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a1a1aa" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Messages" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* ═══ Row: Department Distribution + Country ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <PieChartIcon className="size-4 text-indigo-400" />Employees by Department
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.departmentDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={3} dataKey="count" nameKey="name">
                    {data.departmentDistribution?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend verticalAlign="bottom" height={36} formatter={(val) => <span className="text-[10px] text-zinc-400">{val}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Globe className="size-4 text-cyan-400" />Employees by Country
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 pt-2">
                {data.countryDistribution?.map((c, i) => {
                  const pct = data.totalEmployees > 0 ? Math.round((c.count / data.totalEmployees) * 100) : 0;
                  return (
                    <div key={c.country} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-300 flex items-center gap-2">
                          <span className="text-lg">{COUNTRY_FLAGS[c.country.toLowerCase()] || "🌍"}</span>
                          {formatLabel(c.country)}
                        </span>
                        <span className="text-zinc-400 tabular-nums">{c.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* New Hires */}
              {data.newHires?.length > 0 && (
                <div className="mt-6 pt-4 border-t border-zinc-800/60">
                  <div className="flex items-center gap-2 mb-3">
                    <UserPlus className="size-4 text-indigo-400" />
                    <span className="text-xs font-medium text-zinc-400">New Hires This Month</span>
                    <Badge className="text-[10px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20">{data.newHires.length}</Badge>
                  </div>
                  {data.newHires.slice(0, 4).map((h) => (
                    <div key={h._id} className="flex items-center gap-2 py-1.5 text-xs">
                      <div className="size-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[9px] font-bold text-indigo-300">{h.first_name?.[0]}{h.last_name?.[0]}</div>
                      <span className="text-zinc-300">{h.first_name} {h.last_name}</span>
                      <span className="text-zinc-600 ml-auto">{h.department}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ═══ Row: Tickets + Leave ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Ticket className="size-4 text-amber-400" />Tickets by Status
                <span className="ml-auto text-[10px] text-zinc-600">{totalTickets} total</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.ticketStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="status" tick={{ fontSize: 10, fill: "#a1a1aa" }} tickFormatter={formatLabel} />
                  <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} labelFormatter={formatLabel} />
                  <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]}>
                    {data.ticketStats?.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.status] || COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <CalendarCheck className="size-4 text-blue-400" />Leave Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.leaveByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="status" tick={{ fontSize: 10, fill: "#a1a1aa" }} tickFormatter={formatLabel} />
                  <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} labelFormatter={formatLabel} />
                  <Bar dataKey="count" name="Requests" radius={[4, 4, 0, 0]}>
                    {data.leaveByStatus?.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.status] || COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* ═══ Row: Meeting Status + Position Distribution ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Video className="size-4 text-emerald-400" />Meetings by Status
                <span className="ml-auto text-[10px] text-zinc-600">{totalMeetings} total</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.meetingByStatus?.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={data.meetingByStatus.filter(m => m.count > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="count" nameKey="status">
                      {data.meetingByStatus.filter(m => m.count > 0).map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.status] || COLORS[i]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend verticalAlign="bottom" height={36} formatter={(val) => <span className="text-[10px] text-zinc-400">{formatLabel(val)}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-zinc-500 py-12 text-center">No meeting data</p>}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <BarChart3 className="size-4 text-violet-400" />Position Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.positionDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#a1a1aa" }} allowDecimals={false} />
                  <YAxis dataKey="position" type="category" tick={{ fontSize: 10, fill: "#a1a1aa" }} width={120} tickFormatter={formatLabel} />
                  <Tooltip content={<ChartTooltip />} labelFormatter={formatLabel} />
                  <Bar dataKey="count" name="Employees" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
