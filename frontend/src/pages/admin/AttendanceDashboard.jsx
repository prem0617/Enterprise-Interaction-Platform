import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  CalendarCheck,
  Clock,
  UserCheck,
  UserX,
  Home,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  CalendarDays,
  Briefcase,
  TrendingUp,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { BACKEND_URL } from "../../../config";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const STATUS_BADGES = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  rejected: "bg-red-500/15 text-red-300 border-red-500/20",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

const ATTENDANCE_BADGES = {
  present: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  late: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  absent: "bg-red-500/15 text-red-300 border-red-500/20",
  half_day: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  on_leave: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
  holiday: "bg-violet-500/15 text-violet-300 border-violet-500/20",
};

const LEAVE_COLORS = {
  paid: "text-blue-400",
  floater: "text-amber-400",
  marriage: "text-pink-400",
  unpaid: "text-zinc-400",
};

const DEPARTMENTS = [
  "all",
  "frontend",
  "backend",
  "devops",
  "qa",
  "hr",
  "finance",
  "customer_support",
];

export default function AttendanceDashboard() {
  const [activeTab, setActiveTab] = useState("attendance");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // ─── Attendance State ───
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [deptFilter, setDeptFilter] = useState("all");
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({});
  const [summaryData, setSummaryData] = useState([]);
  const [wfhStats, setWfhStats] = useState([]);

  // ─── Leave State ───
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveStats, setLeaveStats] = useState({});
  const [leaveFilter, setLeaveFilter] = useState("pending");
  const [leaveDeptFilter, setLeaveDeptFilter] = useState("all");
  const [actionDialog, setActionDialog] = useState({ open: false, leave: null, action: "" });
  const [adminRemarks, setAdminRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // ─── Holiday State ───
  const [holidays, setHolidays] = useState([]);
  const [holidayDialog, setHolidayDialog] = useState({ open: false, editing: null });
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "", type: "public", description: "" });

  // ─── Leave Balance State ───
  const [leaveBalances, setLeaveBalances] = useState([]);

  // ─── Fetchers ───
  const fetchAttendance = useCallback(async () => {
    try {
      const [attRes, sumRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/attendance/all?date=${selectedDate}&department=${deptFilter}`, { headers }),
        axios.get(`${BACKEND_URL}/attendance/summary?days=30`, { headers }),
      ]);
      setAttendanceRecords(attRes.data.records || []);
      setAttendanceStats(attRes.data.stats || {});
      setSummaryData(sumRes.data.dailyData || []);
      setWfhStats(sumRes.data.wfhStats || []);
    } catch (err) {
      console.error("Attendance fetch error:", err);
    }
  }, [selectedDate, deptFilter]);

  const fetchLeaveRequests = useCallback(async () => {
    try {
      const res = await axios.get(
        `${BACKEND_URL}/leave/all-requests?status=${leaveFilter}&department=${leaveDeptFilter}`,
        { headers }
      );
      setLeaveRequests(res.data.requests || []);
      setLeaveStats(res.data.stats || {});
    } catch (err) {
      console.error("Leave fetch error:", err);
    }
  }, [leaveFilter, leaveDeptFilter]);

  const fetchHolidays = useCallback(async () => {
    try {
      const res = await axios.get(
        `${BACKEND_URL}/attendance/holidays?year=${new Date().getFullYear()}`,
        { headers }
      );
      setHolidays(res.data.holidays || []);
    } catch (err) {
      console.error("Holiday fetch error:", err);
    }
  }, []);

  const fetchLeaveBalances = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/leave/all-balances`, { headers });
      setLeaveBalances(res.data.employees || []);
    } catch (err) {
      console.error("Leave balance fetch error:", err);
    }
  }, []);

  const fetchAll = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      await Promise.all([fetchAttendance(), fetchLeaveRequests(), fetchHolidays(), fetchLeaveBalances()]);
      setLoading(false);
      setRefreshing(false);
    },
    [fetchAttendance, fetchLeaveRequests, fetchHolidays, fetchLeaveBalances]
  );

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);
  useEffect(() => { fetchLeaveRequests(); }, [fetchLeaveRequests]);

  // ─── Leave Actions ───
  const handleLeaveAction = async () => {
    setActionLoading(true);
    try {
      await axios.put(
        `${BACKEND_URL}/leave/update-status/${actionDialog.leave._id}`,
        { status: actionDialog.action, admin_remarks: adminRemarks },
        { headers }
      );
      toast.success(`Leave ${actionDialog.action} successfully`);
      setActionDialog({ open: false, leave: null, action: "" });
      setAdminRemarks("");
      fetchLeaveRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update leave");
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Holiday CRUD ───
  const handleSaveHoliday = async () => {
    try {
      if (!holidayForm.name || !holidayForm.date) {
        toast.error("Name and date are required");
        return;
      }
      if (holidayDialog.editing) {
        await axios.put(`${BACKEND_URL}/attendance/holidays/${holidayDialog.editing}`, holidayForm, { headers });
        toast.success("Holiday updated");
      } else {
        await axios.post(`${BACKEND_URL}/attendance/holidays`, holidayForm, { headers });
        toast.success("Holiday created");
      }
      setHolidayDialog({ open: false, editing: null });
      setHolidayForm({ name: "", date: "", type: "public", description: "" });
      fetchHolidays();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save holiday");
    }
  };

  const handleDeleteHoliday = async (id) => {
    try {
      await axios.delete(`${BACKEND_URL}/attendance/holidays/${id}`, { headers });
      toast.success("Holiday removed");
      fetchHolidays();
    } catch (err) {
      toast.error("Failed to delete holiday");
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 w-full space-y-6">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
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
            <CalendarCheck className="size-5 text-indigo-400" />
            Attendance &amp; Leave Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Track attendance, manage leaves, and configure holidays
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchAll(true)} disabled={refreshing} className="h-8 bg-zinc-900/60 border-zinc-700">
          <RefreshCcw className={`size-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900/80 border border-zinc-800/80">
          <TabsTrigger value="attendance" className="gap-1.5 text-xs"><CalendarCheck className="size-3.5" />Attendance</TabsTrigger>
          <TabsTrigger value="leaves" className="gap-1.5 text-xs"><Briefcase className="size-3.5" />Leave Requests</TabsTrigger>
          <TabsTrigger value="balances" className="gap-1.5 text-xs"><TrendingUp className="size-3.5" />Balances</TabsTrigger>
          <TabsTrigger value="holidays" className="gap-1.5 text-xs"><CalendarDays className="size-3.5" />Holidays</TabsTrigger>
        </TabsList>

        {/* ════════════════ ATTENDANCE TAB ════════════════ */}
        <TabsContent value="attendance" className="space-y-6 mt-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-4">
            <KPICard icon={UserCheck} label="Present" value={attendanceStats.present || 0} accent="from-emerald-500 to-emerald-600" bg="bg-emerald-500/10" iconColor="text-emerald-400" />
            <KPICard icon={Clock} label="Late" value={attendanceStats.late || 0} accent="from-amber-500 to-amber-600" bg="bg-amber-500/10" iconColor="text-amber-400" />
            <KPICard icon={UserX} label="Absent" value={attendanceStats.absent || 0} accent="from-red-500 to-red-600" bg="bg-red-500/10" iconColor="text-red-400" />
            <KPICard icon={Home} label="WFH" value={attendanceStats.wfh || 0} accent="from-cyan-500 to-cyan-600" bg="bg-cyan-500/10" iconColor="text-cyan-400" />
            <KPICard icon={Briefcase} label="On Leave" value={attendanceStats.on_leave || 0} accent="from-indigo-500 to-indigo-600" bg="bg-indigo-500/10" iconColor="text-indigo-400" className="hidden xl:block" />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-44 h-9 bg-zinc-900/80 border-zinc-700 text-sm" />
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-44 h-9 bg-zinc-900/80 border-zinc-700 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d === "all" ? "All Departments" : d.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Attendance Chart */}
          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="size-4 text-indigo-400" />
                30-Day Attendance Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summaryData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="#52525b" fontSize={11} />
                    <YAxis stroke="#52525b" fontSize={11} />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="present" name="Present" fill="#22c55e" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="wfh" name="WFH" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="on_leave" name="On Leave" fill="#6366f1" radius={[2, 2, 0, 0]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Records + WFH Logs */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Records Table */}
            <Card className="xl:col-span-2 bg-zinc-900/80 border-zinc-800/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Attendance Records — {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left py-2 px-2 text-xs font-medium text-zinc-500">Employee</th>
                        <th className="text-center py-2 px-2 text-xs font-medium text-zinc-500">Status</th>
                        <th className="text-center py-2 px-2 text-xs font-medium text-zinc-500">Type</th>
                        <th className="text-center py-2 px-2 text-xs font-medium text-zinc-500">Check In</th>
                        <th className="text-center py-2 px-2 text-xs font-medium text-zinc-500">Check Out</th>
                        <th className="text-center py-2 px-2 text-xs font-medium text-zinc-500">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.length === 0 ? (
                        <tr><td colSpan={6} className="py-12 text-center text-zinc-500">No records for this date</td></tr>
                      ) : attendanceRecords.map((r) => (
                        <tr key={r._id} className="border-b border-zinc-800/50 hover:bg-white/[0.02]">
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="size-7">
                                <AvatarImage src={r.employee_id?.profile_picture} />
                                <AvatarFallback className="text-[9px]">{r.employee_id?.first_name?.[0]}{r.employee_id?.last_name?.[0]}</AvatarFallback>
                              </Avatar>
                              <span className="truncate">{r.employee_id?.first_name} {r.employee_id?.last_name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <Badge className={`text-[10px] border ${ATTENDANCE_BADGES[r.status] || ""}`}>{r.status?.replace("_", " ")}</Badge>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <Badge variant="outline" className="text-[10px]">{r.work_type}</Badge>
                          </td>
                          <td className="py-2.5 px-2 text-center text-xs text-zinc-400">
                            {r.check_in ? new Date(r.check_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </td>
                          <td className="py-2.5 px-2 text-center text-xs text-zinc-400">
                            {r.check_out ? new Date(r.check_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </td>
                          <td className="py-2.5 px-2 text-center text-xs tabular-nums">{r.total_hours ? `${r.total_hours}h` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* WFH Logs */}
            <Card className="bg-zinc-900/80 border-zinc-800/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Home className="size-4 text-cyan-400" />
                  WFH Logs (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0.5">
                  {wfhStats.length === 0 ? (
                    <p className="text-sm text-zinc-500 py-8 text-center">No WFH records</p>
                  ) : wfhStats.map((u, i) => (
                    <div key={u._id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-white/[0.03]">
                      <span className="text-xs font-bold text-zinc-500 w-5 text-right">{i + 1}</span>
                      <Avatar className="size-7">
                        <AvatarImage src={u.profile_picture} />
                        <AvatarFallback className="text-[9px]">{u.first_name?.[0]}{u.last_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm truncate">{u.first_name} {u.last_name}</span>
                      <Badge variant="secondary" className="text-xs tabular-nums">{u.wfhDays}d</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ════════════════ LEAVE REQUESTS TAB ════════════════ */}
        <TabsContent value="leaves" className="space-y-6 mt-6">
          {/* Leave KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard icon={AlertCircle} label="Pending" value={leaveStats.pending || 0} accent="from-amber-500 to-amber-600" bg="bg-amber-500/10" iconColor="text-amber-400" />
            <KPICard icon={CheckCircle2} label="Approved" value={leaveStats.approved || 0} accent="from-emerald-500 to-emerald-600" bg="bg-emerald-500/10" iconColor="text-emerald-400" />
            <KPICard icon={XCircle} label="Rejected" value={leaveStats.rejected || 0} accent="from-red-500 to-red-600" bg="bg-red-500/10" iconColor="text-red-400" />
            <KPICard icon={Briefcase} label="Total" value={leaveStats.total || 0} accent="from-indigo-500 to-indigo-600" bg="bg-indigo-500/10" iconColor="text-indigo-400" />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={leaveFilter} onValueChange={setLeaveFilter}>
              <SelectTrigger className="w-36 h-9 bg-zinc-900/80 border-zinc-700 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["all", "pending", "approved", "rejected", "cancelled"].map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={leaveDeptFilter} onValueChange={setLeaveDeptFilter}>
              <SelectTrigger className="w-44 h-9 bg-zinc-900/80 border-zinc-700 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d === "all" ? "All Departments" : d.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Leave Requests Table */}
          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Employee</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Type</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Dates</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-zinc-500">Days</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Reason</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-zinc-500">Status</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-zinc-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-zinc-500">No leave requests</td></tr>
                    ) : leaveRequests.map((lr) => (
                      <tr key={lr._id} className="border-b border-zinc-800/50 hover:bg-white/[0.02]">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7">
                              <AvatarImage src={lr.employee_id?.profile_picture} />
                              <AvatarFallback className="text-[9px]">{lr.employee_id?.first_name?.[0]}{lr.employee_id?.last_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium truncate">{lr.employee_id?.first_name} {lr.employee_id?.last_name}</p>
                              <p className="text-[10px] text-zinc-500">{lr.employee_id?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs font-medium capitalize ${LEAVE_COLORS[lr.leave_type] || ""}`}>{lr.leave_type}</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-zinc-400">
                          {new Date(lr.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" — "}
                          {new Date(lr.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td className="py-3 px-4 text-center tabular-nums">{lr.days_count}</td>
                        <td className="py-3 px-4 text-xs text-zinc-400 max-w-[200px] truncate">{lr.reason}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={`text-[10px] border ${STATUS_BADGES[lr.status]}`}>{lr.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {lr.status === "pending" ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                onClick={() => { setActionDialog({ open: true, leave: lr, action: "approved" }); setAdminRemarks(""); }}>
                                <CheckCircle2 className="size-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => { setActionDialog({ open: true, leave: lr, action: "rejected" }); setAdminRemarks(""); }}>
                                <XCircle className="size-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════ BALANCES TAB ════════════════ */}
        <TabsContent value="balances" className="space-y-6 mt-6">
          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Leave Balances — {new Date().getFullYear()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500">Employee</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500">Dept</th>
                      {["paid", "floater", "marriage", "unpaid"].map((t) => (
                        <th key={t} className="text-center py-2 px-2 text-xs font-medium text-zinc-500 capitalize">{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaveBalances.length === 0 ? (
                      <tr><td colSpan={6} className="py-12 text-center text-zinc-500">No data</td></tr>
                    ) : leaveBalances.map((emp) => (
                      <tr key={emp.employee?._id} className="border-b border-zinc-800/50 hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-6">
                              <AvatarImage src={emp.employee?.profile_picture} />
                              <AvatarFallback className="text-[9px]">{emp.employee?.first_name?.[0]}{emp.employee?.last_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate">{emp.employee?.first_name} {emp.employee?.last_name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px] capitalize">{emp.department?.name || "—"}</Badge>
                        </td>
                        {["paid", "floater", "marriage", "unpaid"].map((t) => {
                          const b = emp.balances?.[t];
                          return (
                            <td key={t} className="py-2.5 px-2 text-center">
                              <span className="text-xs tabular-nums">
                                <span className="text-zinc-300">{b ? b.remaining : 0}</span>
                                <span className="text-zinc-600">/{b ? b.allocated : 0}</span>
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════ HOLIDAYS TAB ════════════════ */}
        <TabsContent value="holidays" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              Holiday Calendar — {new Date().getFullYear()}
            </h2>
            <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
              onClick={() => { setHolidayForm({ name: "", date: "", type: "public", description: "" }); setHolidayDialog({ open: true, editing: null }); }}>
              <Plus className="size-3.5" /> Add Holiday
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {holidays.length === 0 ? (
              <Card className="sm:col-span-2 xl:col-span-3 bg-zinc-900/80 border-zinc-800/80">
                <CardContent className="py-12 text-center text-zinc-500">No holidays configured</CardContent>
              </Card>
            ) : holidays.map((h) => (
              <Card key={h._id} className="bg-zinc-900/80 border-zinc-800/80 group hover:border-zinc-700/80 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-zinc-200">{h.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {new Date(h.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                      </p>
                      {h.description && <p className="text-xs text-zinc-500 mt-1">{h.description}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={`text-[10px] ${h.type === "national" ? "border-red-500/20 text-red-400" : h.type === "public" ? "border-emerald-500/20 text-emerald-400" : h.type === "company" ? "border-indigo-500/20 text-indigo-400" : "border-amber-500/20 text-amber-400"}`}>
                        {h.type}
                      </Badge>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                        onClick={() => { setHolidayForm({ name: h.name, date: new Date(h.date).toISOString().split("T")[0], type: h.type, description: h.description || "" }); setHolidayDialog({ open: true, editing: h._id }); }}>
                        <Edit2 className="size-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 opacity-0 group-hover:opacity-100"
                        onClick={() => handleDeleteHoliday(h._id)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Leave Action Dialog ─── */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, leave: null, action: "" })}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>{actionDialog.action === "approved" ? "Approve" : "Reject"} Leave Request</DialogTitle>
          </DialogHeader>
          {actionDialog.leave && (
            <div className="space-y-4">
              <div className="rounded-lg bg-zinc-800/50 p-3 space-y-1 text-sm">
                <p><span className="text-zinc-500">Employee:</span> {actionDialog.leave.employee_id?.first_name} {actionDialog.leave.employee_id?.last_name}</p>
                <p><span className="text-zinc-500">Type:</span> <span className="capitalize">{actionDialog.leave.leave_type}</span></p>
                <p><span className="text-zinc-500">Dates:</span> {new Date(actionDialog.leave.start_date).toLocaleDateString()} — {new Date(actionDialog.leave.end_date).toLocaleDateString()} ({actionDialog.leave.days_count} days)</p>
                <p><span className="text-zinc-500">Reason:</span> {actionDialog.leave.reason}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Remarks (optional)</Label>
                <Textarea value={adminRemarks} onChange={(e) => setAdminRemarks(e.target.value)} className="bg-zinc-800/50 border-zinc-700 resize-none" rows={2} placeholder="Add any comments..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, leave: null, action: "" })} className="border-zinc-700">Cancel</Button>
            <Button onClick={handleLeaveAction} disabled={actionLoading}
              className={actionDialog.action === "approved" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-red-600 hover:bg-red-500 text-white"}>
              {actionLoading ? "Processing..." : actionDialog.action === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Holiday Dialog ─── */}
      <Dialog open={holidayDialog.open} onOpenChange={(open) => !open && setHolidayDialog({ open: false, editing: null })}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>{holidayDialog.editing ? "Edit" : "Add"} Holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Holiday Name</Label>
              <Input value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} className="bg-zinc-800/50 border-zinc-700" placeholder="e.g. Independence Day" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Date</Label>
                <Input type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} className="bg-zinc-800/50 border-zinc-700" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Type</Label>
                <Select value={holidayForm.type} onValueChange={(v) => setHolidayForm({ ...holidayForm, type: v })}>
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="national">National</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="optional">Optional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Description (optional)</Label>
              <Input value={holidayForm.description} onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })} className="bg-zinc-800/50 border-zinc-700" placeholder="Brief description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHolidayDialog({ open: false, editing: null })} className="border-zinc-700">Cancel</Button>
            <Button onClick={handleSaveHoliday} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              {holidayDialog.editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── KPI Card ──────────────────────────────────────────
function KPICard({ icon: Icon, label, value, accent, bg, iconColor, className = "" }) {
  return (
    <Card className={`bg-zinc-900/80 border-zinc-800/80 overflow-hidden ${className}`}>
      <CardContent className="p-4 relative">
        <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${accent} opacity-60`} />
        <div className="flex items-center gap-3">
          <div className={`size-9 rounded-xl ${bg} flex items-center justify-center`}>
            <Icon className={`size-4 ${iconColor}`} />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-[11px] text-zinc-500 font-medium">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
