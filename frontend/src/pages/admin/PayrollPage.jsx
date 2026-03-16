import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { BACKEND_URL } from "../../../config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Users, TrendingUp, Clock, RefreshCcw, Check, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLES = { draft: "bg-zinc-500/15 text-zinc-300 border-zinc-500/20", processed: "bg-blue-500/15 text-blue-300 border-blue-500/20", paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20", cancelled: "bg-red-500/15 text-red-300 border-red-500/20" };
function fmt(n) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n || 0); }

const EMPTY_FORM = { employee_id: "", user_id: "", base_salary: "", bonus: "0", allowances: "0", deductions: "0", tax: "0", pay_frequency: "monthly", currency: "USD", bank_name: "", account_number: "", notes: "", status: "draft" };

export default function PayrollPage() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const [employees, setEmployees] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchPayroll = useCallback(async () => {
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
  }, [month]);

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/payroll/employees`, { headers });
      setEmployees(res.data.employees || []);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);
  useEffect(() => { fetchEmployees(); }, []);

  const changeMonth = (delta) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const openCreate = () => {
    const [y, m] = month.split("-").map(Number);
    setEditingId(null);
    setForm({ ...EMPTY_FORM, pay_period_start: new Date(y, m - 1, 1).toISOString().split("T")[0], pay_period_end: new Date(y, m, 0).toISOString().split("T")[0] });
    setDialogOpen(true);
  };

  const openEdit = (r) => {
    setEditingId(r._id);
    setForm({
      employee_id: r.employee_id?._id || r.employee_id, user_id: r.user_id?._id || r.user_id,
      base_salary: String(r.base_salary), bonus: String(r.bonus || 0), allowances: String(r.allowances || 0),
      deductions: String(r.deductions || 0), tax: String(r.tax || 0), pay_frequency: r.pay_frequency || "monthly",
      currency: r.currency || "USD", bank_name: r.bank_name || "", account_number: r.account_number || "",
      notes: r.notes || "", status: r.status || "draft",
      pay_period_start: r.pay_period_start?.split("T")[0] || "", pay_period_end: r.pay_period_end?.split("T")[0] || "",
    });
    setDialogOpen(true);
  };

  const handleEmployeeSelect = (empId) => {
    const emp = employees.find((e) => e._id === empId);
    if (emp) setForm((f) => ({ ...f, employee_id: emp._id, user_id: emp.user_id }));
  };

  const handleSave = async () => {
    if (!form.employee_id || !form.base_salary || !form.pay_period_start || !form.pay_period_end) {
      toast.error("Please fill all required fields"); return;
    }
    setSaving(true);
    try {
      await axios.post(`${BACKEND_URL}/payroll`, {
        ...form, base_salary: parseFloat(form.base_salary), bonus: parseFloat(form.bonus || 0),
        allowances: parseFloat(form.allowances || 0), deductions: parseFloat(form.deductions || 0),
        tax: parseFloat(form.tax || 0),
      }, { headers });
      toast.success(editingId ? "Payroll updated" : "Payroll created");
      setDialogOpen(false);
      fetchPayroll();
    } catch (e) { toast.error(e.response?.data?.error || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${BACKEND_URL}/payroll/${id}`, { headers });
      toast.success("Payroll record deleted");
      fetchPayroll();
    } catch (e) { toast.error(e.response?.data?.error || "Failed to delete"); }
  };

  const processRecord = async (id, status) => {
    try {
      await axios.put(`${BACKEND_URL}/payroll/${id}/process`, { status }, { headers });
      toast.success(`Payroll ${status}`);
      fetchPayroll();
    } catch { toast.error("Failed to update"); }
  };

  const netPreview = parseFloat(form.base_salary || 0) + parseFloat(form.bonus || 0) + parseFloat(form.allowances || 0) - parseFloat(form.deductions || 0) - parseFloat(form.tax || 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><DollarSign className="size-6 text-emerald-400" />Payroll Management</h1>
            <p className="text-sm text-zinc-400 mt-1">Manage employee compensation and pay stubs</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="size-8 border-zinc-700" onClick={() => changeMonth(-1)}><ChevronLeft className="size-4" /></Button>
            <span className="text-sm font-medium min-w-[140px] text-center">{new Date(month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
            <Button variant="outline" size="icon" className="size-8 border-zinc-700" onClick={() => changeMonth(1)}><ChevronRight className="size-4" /></Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5" onClick={openCreate}><Plus className="size-3.5" />Add Payroll</Button>
            <Button variant="outline" size="sm" className="border-zinc-700 gap-1.5" onClick={fetchPayroll}><RefreshCcw className="size-3.5" /></Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Users, label: "Employees", value: stats.totalEmployees || 0, color: "indigo" },
            { icon: DollarSign, label: "Total Payroll", value: fmt(stats.totalPayroll), color: "emerald" },
            { icon: TrendingUp, label: "Avg Salary", value: fmt(stats.avgSalary), color: "blue" },
            { icon: Clock, label: "Pending", value: stats.pendingCount || 0, color: "amber" },
          ].map(({ icon: Icon, label, value, color }) => (
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
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-300">Payroll Records — {records.length} entries</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {["Employee", "Department", "Base", "Bonus", "Tax", "Net Pay", "Status", "Actions"].map((h) => (
                      <th key={h} className={`py-3 px-4 text-xs font-medium text-zinc-500 ${["Base", "Bonus", "Tax", "Net Pay"].includes(h) ? "text-right" : h === "Status" || h === "Actions" ? "text-center" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="py-8 text-center"><Loader2 className="size-5 animate-spin text-zinc-600 mx-auto" /></td></tr>
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
                        <div className="flex items-center justify-center gap-1">
                          {r.status !== "paid" && (
                            <Button size="icon" variant="ghost" className="size-7 text-zinc-500 hover:text-zinc-300" onClick={() => openEdit(r)}><Pencil className="size-3" /></Button>
                          )}
                          {r.status === "draft" && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-400" onClick={() => processRecord(r._id, "processed")}>Process</Button>
                              <Button size="icon" variant="ghost" className="size-7 text-zinc-500 hover:text-red-400" onClick={() => handleDelete(r._id)}><Trash2 className="size-3" /></Button>
                            </>
                          )}
                          {r.status === "processed" && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-400 gap-1" onClick={() => processRecord(r._id, "paid")}><Check className="size-3" />Pay</Button>
                          )}
                          {r.status === "paid" && <span className="text-[10px] text-zinc-600">Done</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ═══ Create/Edit Dialog ═══ */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">{editingId ? "Edit Payroll Record" : "Create Payroll Record"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Employee selector */}
              {!editingId && (
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs">Employee *</Label>
                  <Select value={form.employee_id} onValueChange={handleEmployeeSelect}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {employees.map((e) => (
                        <SelectItem key={e._id} value={e._id}>{e.first_name} {e.last_name} — {e.department} ({e.position})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Salary fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs">Base Salary *</Label>
                  <Input type="number" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} className="bg-zinc-800 border-zinc-700" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs">Bonus</Label>
                  <Input type="number" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: e.target.value })} className="bg-zinc-800 border-zinc-700" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs">Allowances</Label>
                  <Input type="number" value={form.allowances} onChange={(e) => setForm({ ...form, allowances: e.target.value })} className="bg-zinc-800 border-zinc-700" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs">Deductions</Label>
                  <Input type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} className="bg-zinc-800 border-zinc-700" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs">Tax</Label>
                  <Input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} className="bg-zinc-800 border-zinc-700" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs">Pay Frequency</Label>
                  <Select value={form.pay_frequency} onValueChange={(v) => setForm({ ...form, pay_frequency: v })}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Net pay preview */}
              <div className="p-3 rounded-lg bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-between">
                <span className="text-sm text-zinc-400">Net Pay (Preview)</span>
                <span className={`text-lg font-bold tabular-nums ${netPreview >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(netPreview)}</span>
              </div>

              {/* Bank info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs">Bank Name</Label>
                  <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className="bg-zinc-800 border-zinc-700" placeholder="e.g. Chase" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs">Account Number</Label>
                  <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} className="bg-zinc-800 border-zinc-700" placeholder="****1234" />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-zinc-800 border-zinc-700 min-h-[60px]" placeholder="Optional notes..." />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="border-zinc-700 text-zinc-400" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                {editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
