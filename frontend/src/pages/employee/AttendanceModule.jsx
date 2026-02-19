import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  CalendarCheck,
  Clock,
  LogIn,
  LogOut,
  Home,
  Building2,
  Laptop2,
  CalendarDays,
  Briefcase,
  Send,
  XCircle,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
} from "lucide-react";
import { BACKEND_URL } from "../../../config";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const STATUS_BADGES = {
  present: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  late: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  absent: "bg-red-500/15 text-red-300 border-red-500/20",
  half_day: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  on_leave: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
  holiday: "bg-violet-500/15 text-violet-300 border-violet-500/20",
  weekend: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

const LEAVE_STATUS_BADGES = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  rejected: "bg-red-500/15 text-red-300 border-red-500/20",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

const LEAVE_COLORS = {
  sick: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  casual: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  earned: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  maternity: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/20" },
  paternity: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
  compensatory: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  unpaid: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20" },
};

const WORK_TYPES = [
  { value: "office", label: "Office", icon: Building2 },
  { value: "wfh", label: "Work from Home", icon: Laptop2 },
  { value: "hybrid", label: "Hybrid", icon: Home },
];

export default function AttendanceModule() {
  const [activeTab, setActiveTab] = useState("today");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // ─── Today's Attendance ───
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [selectedWorkType, setSelectedWorkType] = useState("office");
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  // ─── History ───
  const [historyMonth, setHistoryMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [historySummary, setHistorySummary] = useState({});

  // ─── Leave Balance ───
  const [leaveBalances, setLeaveBalances] = useState([]);

  // ─── Leave Requests ───
  const [myLeaveRequests, setMyLeaveRequests] = useState([]);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type: "casual",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // ─── Holidays ───
  const [holidays, setHolidays] = useState([]);

  // ─── Fetchers ───
  const fetchToday = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/attendance/today`, { headers });
      setTodayAttendance(res.data.attendance);
    } catch (err) {
      setTodayAttendance(null);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const [year, month] = historyMonth.split("-");
      const res = await axios.get(`${BACKEND_URL}/attendance/history?year=${year}&month=${month}`, { headers });
      setAttendanceHistory(res.data.records || []);
      setHistorySummary(res.data.summary || {});
    } catch (err) {
      console.error("History fetch error:", err);
    }
  }, [historyMonth]);

  const fetchLeaveBalance = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/leave/balance`, { headers });
      setLeaveBalances(res.data.balances || []);
    } catch (err) {
      console.error("Balance fetch error:", err);
    }
  }, []);

  const fetchMyLeaves = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/leave/my-requests`, { headers });
      setMyLeaveRequests(res.data.requests || []);
    } catch (err) {
      console.error("Leave requests fetch error:", err);
    }
  }, []);

  const fetchHolidays = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/attendance/holidays`, { headers });
      setHolidays(res.data.holidays || []);
    } catch (err) {
      console.error("Holiday fetch error:", err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchToday(), fetchHistory(), fetchLeaveBalance(), fetchMyLeaves(), fetchHolidays()]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // ─── Actions ───
  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/attendance/check-in`, { work_type: selectedWorkType }, { headers });
      toast.success("Checked in successfully!");
      setTodayAttendance(res.data.attendance);
    } catch (err) {
      toast.error(err.response?.data?.error || "Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/attendance/check-out`, {}, { headers });
      toast.success(`Checked out! Total: ${res.data.attendance.total_hours}h`);
      setTodayAttendance(res.data.attendance);
    } catch (err) {
      toast.error(err.response?.data?.error || "Check-out failed");
    } finally {
      setCheckingOut(false);
    }
  };

  const handleRequestLeave = async () => {
    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmittingLeave(true);
    try {
      await axios.post(`${BACKEND_URL}/leave/request`, leaveForm, { headers });
      toast.success("Leave request submitted");
      setLeaveDialog(false);
      setLeaveForm({ leave_type: "casual", start_date: "", end_date: "", reason: "" });
      fetchMyLeaves();
      fetchLeaveBalance();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit leave");
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleCancelLeave = async (id) => {
    try {
      await axios.put(`${BACKEND_URL}/leave/cancel/${id}`, {}, { headers });
      toast.success("Leave cancelled");
      fetchMyLeaves();
      fetchLeaveBalance();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to cancel leave");
    }
  };

  const changeMonth = (delta) => {
    const [y, m] = historyMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setHistoryMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 w-full space-y-6 overflow-auto">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good Morning" : now.getHours() < 17 ? "Good Afternoon" : "Good Evening";
  const hasCheckedIn = !!todayAttendance?.check_in;
  const hasCheckedOut = !!todayAttendance?.check_out;

  return (
    <div className="p-6 lg:p-8 w-full space-y-6 overflow-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarCheck className="size-5 text-indigo-400" />
            Attendance
          </h1>
          <p className="text-sm text-muted-foreground">{greeting}! Track your attendance and manage leaves.</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-zinc-900/60 border-zinc-700"
          onClick={() => { fetchToday(); fetchLeaveBalance(); fetchMyLeaves(); }}>
          <RefreshCcw className="size-3.5" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900/80 border border-zinc-800/80">
          <TabsTrigger value="today" className="gap-1.5 text-xs"><Clock className="size-3.5" />Today</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs"><CalendarDays className="size-3.5" />History</TabsTrigger>
          <TabsTrigger value="leaves" className="gap-1.5 text-xs"><Briefcase className="size-3.5" />Leaves</TabsTrigger>
          <TabsTrigger value="holidays" className="gap-1.5 text-xs"><CalendarCheck className="size-3.5" />Holidays</TabsTrigger>
        </TabsList>

        {/* ════════════════ TODAY TAB ════════════════ */}
        <TabsContent value="today" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Check-in / Check-out Widget */}
            <Card className="bg-zinc-900/80 border-zinc-800/80 overflow-hidden">
              <div className="h-[2px] bg-gradient-to-r from-indigo-500 to-cyan-500 opacity-60" />
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Clock className="size-4 text-indigo-400" />
                  Clock In / Out
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Current time */}
                <div className="text-center py-2">
                  <p className="text-3xl font-bold tabular-nums">
                    {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>

                {/* Work Type */}
                {!hasCheckedIn && (
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Work Type</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {WORK_TYPES.map((wt) => {
                        const WtIcon = wt.icon;
                        return (
                          <Button key={wt.value} variant={selectedWorkType === wt.value ? "secondary" : "outline"} size="sm"
                            className={`h-10 gap-1.5 text-xs ${selectedWorkType === wt.value ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300" : "bg-zinc-800/50 border-zinc-700"}`}
                            onClick={() => setSelectedWorkType(wt.value)}>
                            <WtIcon className="size-3.5" />
                            {wt.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {!hasCheckedIn ? (
                    <Button className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white gap-2" onClick={handleCheckIn} disabled={checkingIn}>
                      <LogIn className="size-4" />
                      {checkingIn ? "Checking In..." : "Check In"}
                    </Button>
                  ) : !hasCheckedOut ? (
                    <Button className="flex-1 h-11 bg-red-600 hover:bg-red-500 text-white gap-2" onClick={handleCheckOut} disabled={checkingOut}>
                      <LogOut className="size-4" />
                      {checkingOut ? "Checking Out..." : "Check Out"}
                    </Button>
                  ) : (
                    <div className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle2 className="size-4 text-emerald-400" />
                      <span className="text-sm text-emerald-300 font-medium">Day Complete</span>
                    </div>
                  )}
                </div>

                {/* Today Status */}
                {todayAttendance && (
                  <div className="rounded-lg bg-zinc-800/40 p-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Status</span>
                      <Badge className={`text-[10px] border ${STATUS_BADGES[todayAttendance.status]}`}>{todayAttendance.status?.replace("_", " ")}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Work Type</span>
                      <span className="capitalize text-zinc-300">{todayAttendance.work_type}</span>
                    </div>
                    {todayAttendance.check_in && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Checked In</span>
                        <span className="tabular-nums text-zinc-300">
                          {new Date(todayAttendance.check_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    )}
                    {todayAttendance.check_out && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Checked Out</span>
                        <span className="tabular-nums text-zinc-300">
                          {new Date(todayAttendance.check_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    )}
                    {todayAttendance.total_hours != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Total Hours</span>
                        <span className="tabular-nums font-medium text-zinc-200">{todayAttendance.total_hours}h</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Leave Balance Summary */}
            <Card className="bg-zinc-900/80 border-zinc-800/80 overflow-hidden">
              <div className="h-[2px] bg-gradient-to-r from-violet-500 to-pink-500 opacity-60" />
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Briefcase className="size-4 text-violet-400" />
                  Leave Balance
                </CardTitle>
                <Button size="sm" className="h-7 gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                  onClick={() => setLeaveDialog(true)}>
                  <Send className="size-3" /> Apply Leave
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {leaveBalances.length === 0 ? (
                    <p className="col-span-2 text-sm text-zinc-500 py-6 text-center">No leave balances found</p>
                  ) : leaveBalances.map((b) => {
                    const colors = LEAVE_COLORS[b.leave_type] || LEAVE_COLORS.unpaid;
                    const remaining = (b.allocated || 0) + (b.carried_forward || 0) - (b.used || 0);
                    const total = (b.allocated || 0) + (b.carried_forward || 0);
                    const pct = total > 0 ? ((remaining / total) * 100) : 0;
                    return (
                      <div key={b._id || b.leave_type} className={`rounded-lg ${colors.bg} border ${colors.border} p-3`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-semibold capitalize ${colors.text}`}>{b.leave_type}</span>
                          <span className="text-xs tabular-nums text-zinc-400">{b.used}/{total}</span>
                        </div>
                        <p className="text-lg font-bold tabular-nums">{remaining}</p>
                        <p className="text-[10px] text-zinc-500">remaining</p>
                        <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${colors.bg.replace("/10", "/40")}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ════════════════ HISTORY TAB ════════════════ */}
        <TabsContent value="history" className="space-y-6 mt-6">
          {/* Month Navigator */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="size-8 bg-zinc-900/80 border-zinc-700" onClick={() => changeMonth(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {new Date(historyMonth + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <Button variant="outline" size="icon" className="size-8 bg-zinc-900/80 border-zinc-700" onClick={() => changeMonth(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-3">
            <SummaryChip label="Present" value={historySummary.present || 0} color="emerald" />
            <SummaryChip label="Late" value={historySummary.late || 0} color="amber" />
            <SummaryChip label="Absent" value={historySummary.absent || 0} color="red" />
            <SummaryChip label="Half Day" value={historySummary.half_day || 0} color="orange" />
            <SummaryChip label="On Leave" value={historySummary.on_leave || 0} color="indigo" />
            <SummaryChip label="Total Hours" value={`${historySummary.total_hours || 0}h`} color="cyan" />
          </div>

          {/* History Table */}
          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Date</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-zinc-500">Status</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-zinc-500">Type</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-zinc-500">Check In</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-zinc-500">Check Out</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-zinc-500">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceHistory.length === 0 ? (
                      <tr><td colSpan={6} className="py-12 text-center text-zinc-500">No attendance records for this month</td></tr>
                    ) : attendanceHistory.map((r) => (
                      <tr key={r._id} className="border-b border-zinc-800/50 hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4 text-sm">
                          {new Date(r.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <Badge className={`text-[10px] border ${STATUS_BADGES[r.status] || ""}`}>{r.status?.replace("_", " ")}</Badge>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <Badge variant="outline" className="text-[10px] capitalize">{r.work_type}</Badge>
                        </td>
                        <td className="py-2.5 px-4 text-center text-xs text-zinc-400 tabular-nums">
                          {r.check_in ? new Date(r.check_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="py-2.5 px-4 text-center text-xs text-zinc-400 tabular-nums">
                          {r.check_out ? new Date(r.check_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="py-2.5 px-4 text-center text-xs tabular-nums">{r.total_hours ? `${r.total_hours}h` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════ LEAVES TAB ════════════════ */}
        <TabsContent value="leaves" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">My Leave Requests</h2>
            <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
              onClick={() => setLeaveDialog(true)}>
              <Send className="size-3.5" /> Apply Leave
            </Button>
          </div>

          <div className="space-y-3">
            {myLeaveRequests.length === 0 ? (
              <Card className="bg-zinc-900/80 border-zinc-800/80">
                <CardContent className="py-12 text-center text-zinc-500">
                  <Briefcase className="size-8 mx-auto mb-2 text-zinc-600" />
                  No leave requests yet
                </CardContent>
              </Card>
            ) : myLeaveRequests.map((lr) => {
              const colors = LEAVE_COLORS[lr.leave_type] || LEAVE_COLORS.unpaid;
              return (
                <Card key={lr._id} className="bg-zinc-900/80 border-zinc-800/80">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold capitalize ${colors.text}`}>{lr.leave_type} Leave</span>
                          <Badge className={`text-[10px] border ${LEAVE_STATUS_BADGES[lr.status]}`}>{lr.status}</Badge>
                        </div>
                        <p className="text-xs text-zinc-400">
                          {new Date(lr.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" — "}
                          {new Date(lr.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          <span className="ml-2 text-zinc-500">({lr.days_count} day{lr.days_count > 1 ? "s" : ""})</span>
                        </p>
                        <p className="text-xs text-zinc-500">{lr.reason}</p>
                        {lr.admin_remarks && (
                          <p className="text-xs text-zinc-500 mt-1">
                            <span className="text-zinc-600">Admin:</span> {lr.admin_remarks}
                          </p>
                        )}
                      </div>
                      {lr.status === "pending" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => handleCancelLeave(lr._id)}>
                          <XCircle className="size-3.5 mr-1" /> Cancel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ════════════════ HOLIDAYS TAB ════════════════ */}
        <TabsContent value="holidays" className="space-y-6 mt-6">
          <h2 className="text-base font-semibold">
            Upcoming Holidays — {new Date().getFullYear()}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {holidays.length === 0 ? (
              <Card className="sm:col-span-2 xl:col-span-3 bg-zinc-900/80 border-zinc-800/80">
                <CardContent className="py-12 text-center text-zinc-500">No holidays scheduled</CardContent>
              </Card>
            ) : holidays.map((h) => {
              const isPast = new Date(h.date) < new Date(new Date().toDateString());
              return (
                <Card key={h._id} className={`bg-zinc-900/80 border-zinc-800/80 ${isPast ? "opacity-50" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-zinc-200">{h.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {new Date(h.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                        </p>
                        {h.description && <p className="text-xs text-zinc-500 mt-1">{h.description}</p>}
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${h.type === "public" ? "border-emerald-500/20 text-emerald-400" : h.type === "company" ? "border-indigo-500/20 text-indigo-400" : "border-amber-500/20 text-amber-400"}`}>
                        {h.type}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Leave Request Dialog ─── */}
      <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Leave Type</Label>
              <Select value={leaveForm.leave_type} onValueChange={(v) => setLeaveForm({ ...leaveForm, leave_type: v })}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["casual", "sick", "earned", "compensatory", "unpaid"].map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Start Date</Label>
                <Input type="date" value={leaveForm.start_date} onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })} className="bg-zinc-800/50 border-zinc-700" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">End Date</Label>
                <Input type="date" value={leaveForm.end_date} onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })} className="bg-zinc-800/50 border-zinc-700" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Reason</Label>
              <Textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} className="bg-zinc-800/50 border-zinc-700 resize-none" rows={3} placeholder="Briefly explain the reason..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveDialog(false)} className="border-zinc-700">Cancel</Button>
            <Button onClick={handleRequestLeave} disabled={submittingLeave} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              {submittingLeave ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Summary Chip ──────────────────────────────────────
function SummaryChip({ label, value, color }) {
  return (
    <div className={`rounded-lg bg-${color}-500/10 border border-${color}-500/20 p-3 text-center`}>
      <p className={`text-lg font-bold tabular-nums text-${color}-300`}>{value}</p>
      <p className="text-[10px] text-zinc-500 font-medium">{label}</p>
    </div>
  );
}
