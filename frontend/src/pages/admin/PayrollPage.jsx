import { useState, useEffect } from "react";
import axios from "axios";
import { BACKEND_URL } from "../../../config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Users, TrendingUp, Clock, RefreshCcw, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLES = {
  draft: "bg-zinc-500/15 text-zinc-300 border-zinc-500/20",
  processed: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  cancelled: "bg-red-500/15 text-red-300 border-red-500/20",
};

function fmt(n) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n || 0); }

export default function PayrollPage() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const [y, m] = month.split("-");
      const [payRes, statsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/payroll?year=${y}&month=${m}`, { headers }),
        axios.get(`${BACKEND_URL}/payroll/stats`, { headers }),
      ]);
      setRecords(payRes.data.records || []);
      setStats(statsRes.data || {});
    } catch { toast.error("Failed to load payroll"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPayroll(); }, [month]);

  const changeMonth = (delta) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const processRecord = async (id, status) => {
    try {
      await axios.put(`${BACKEND_URL}/payroll/${id}/process`, { status }, { headers });
      toast.success(`Payroll ${status}`);
      fetchPayroll();
    } catch { toast.error("Failed to update"); }
  };

  const kpis = [
    { icon: Users, label: "Employees", value: stats.totalEmployees || 0, color: "indigo" },
    { icon: DollarSign, label: "Total Payroll", value: fmt(stats.totalPayroll), color: "emerald" },
    { icon: TrendingUp, label: "Avg Salary", value: fmt(stats.avgSalary), color: "blue" },
    { icon: Clock, label: "Pending", value: stats.pendingCount || 0, color: "amber" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><DollarSign className="size-6 text-emerald-400" />Payroll Management</h1>
            <p className="text-sm text-zinc-400 mt-1">Manage employee compensation and pay stubs</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="size-8 border-zinc-700" onClick={() => changeMonth(-1)}><ChevronLeft className="size-4" /></Button>
            <span className="text-sm font-medium min-w-[140px] text-center">{new Date(month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
            <Button variant="outline" size="icon" className="size-8 border-zinc-700" onClick={() => changeMonth(1)}><ChevronRight className="size-4" /></Button>
            <Button variant="outline" size="sm" className="border-zinc-700 gap-1.5" onClick={fetchPayroll}><RefreshCcw className="size-3.5" />Refresh</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map(({ icon: Icon, label, value, color }) => (
            <Card key={label} className="bg-zinc-900/80 border-zinc-800/80">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-${color}-500/10`}><Icon className={`size-5 text-${color}-400`} /></div>
                <div><p className="text-xl font-bold text-white">{value}</p><p className="text-[10px] text-zinc-500">{label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card className="bg-zinc-900/80 border-zinc-800/80">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-300">Payroll Records</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Employee</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Department</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500">Base</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500">Bonus</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500">Tax</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500">Net Pay</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-zinc-500">Status</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-zinc-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="py-8"><div className="flex justify-center"><Skeleton className="h-4 w-32 bg-zinc-800" /></div></td></tr>
                  ) : records.length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center text-zinc-500">No payroll records for this period</td></tr>
                  ) : records.map((r) => (
                    <tr key={r._id} className="border-b border-zinc-800/50 hover:bg-white/[0.02]">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-300">{r.user_id?.first_name?.[0]}{r.user_id?.last_name?.[0]}</div>
                          <div><p className="text-sm text-zinc-200">{r.user_id?.first_name} {r.user_id?.last_name}</p><p className="text-[10px] text-zinc-500">{r.user_id?.email}</p></div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-zinc-400">{r.employee_id?.department?.name || "—"}</td>
                      <td className="py-2.5 px-4 text-right text-xs text-zinc-300 tabular-nums">{fmt(r.base_salary)}</td>
                      <td className="py-2.5 px-4 text-right text-xs text-emerald-400 tabular-nums">{r.bonus > 0 ? `+${fmt(r.bonus)}` : "—"}</td>
                      <td className="py-2.5 px-4 text-right text-xs text-red-400 tabular-nums">{fmt(r.tax)}</td>
                      <td className="py-2.5 px-4 text-right text-sm font-semibold text-zinc-200 tabular-nums">{fmt(r.net_pay)}</td>
                      <td className="py-2.5 px-4 text-center"><Badge className={`text-[10px] border ${STATUS_STYLES[r.status]}`}>{r.status}</Badge></td>
                      <td className="py-2.5 px-4 text-center">
                        {r.status === "draft" && <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-400 hover:text-blue-300" onClick={() => processRecord(r._id, "processed")}>Process</Button>}
                        {r.status === "processed" && <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-400 hover:text-emerald-300 gap-1" onClick={() => processRecord(r._id, "paid")}><Check className="size-3" />Pay</Button>}
                        {r.status === "paid" && <span className="text-[10px] text-zinc-600">Completed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
