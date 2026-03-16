import { useState, useEffect } from "react";
import axios from "axios";
import { BACKEND_URL } from "../../../config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Network, Search, Users, Building2, ChevronDown, ChevronRight, MapPin, Mail, Phone, Calendar, User } from "lucide-react";

const POS_COLORS = {
  ceo: "bg-violet-500/15 text-violet-300 border-violet-500/20",
  cto: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  project_manager: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
  team_lead: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  senior_engineer: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  engineer: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  junior_engineer: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  intern: "bg-zinc-500/15 text-zinc-300 border-zinc-500/20",
};
const COUNTRY_FLAGS = { usa: "🇺🇸", india: "🇮🇳", germany: "🇩🇪" };

function formatLabel(str) { return (str || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }

function OrgNode({ dept, level = 0 }) {
  const [open, setOpen] = useState(level < 1);
  const hasChildren = dept.children?.length > 0 || dept.employees?.length > 0;
  const head = dept.head_id?.user_id;

  return (
    <div className={`${level > 0 ? "ml-6 border-l border-zinc-800/60 pl-4" : ""}`}>
      <div className="flex items-center gap-2 py-2 cursor-pointer hover:bg-white/[0.02] rounded-lg px-2 -mx-2" onClick={() => setOpen(!open)}>
        {hasChildren ? (open ? <ChevronDown className="size-4 text-zinc-500" /> : <ChevronRight className="size-4 text-zinc-500" />) : <div className="size-4" />}
        <div className="size-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ backgroundColor: (dept.color || "#6366f1") + "20", color: dept.color || "#6366f1" }}>
          {dept.type === "team" ? <Users className="size-4" /> : <Building2 className="size-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">{dept.name}</span>
            <Badge className="text-[9px] bg-zinc-800 text-zinc-500 border-zinc-700">{dept.code}</Badge>
            {dept.type === "team" && <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Team</Badge>}
          </div>
          {head && <p className="text-[10px] text-zinc-500">Head: {head.first_name} {head.last_name}</p>}
        </div>
        <span className="text-xs text-zinc-600">{dept.employees?.length || 0} members</span>
      </div>

      {open && (
        <div className="space-y-0.5 mt-1">
          {dept.employees?.map((emp) => (
            <div key={emp._id} className="flex items-center gap-2.5 py-1.5 px-2 ml-6 rounded-lg hover:bg-white/[0.02]">
              <div className="size-7 rounded-full bg-indigo-500/15 flex items-center justify-center text-[10px] font-bold text-indigo-300 flex-shrink-0">
                {emp.first_name?.[0]}{emp.last_name?.[0]}
              </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-zinc-300">{emp.first_name} {emp.last_name}</span>
                        {emp.emp_code && <span className="ml-1.5 text-[9px] text-zinc-600 font-mono">{emp.emp_code}</span>}
                        <Badge className={`ml-2 text-[9px] border ${POS_COLORS[emp.position] || POS_COLORS.engineer}`}>{formatLabel(emp.position)}</Badge>
                      </div>
                      <span className="text-[10px] text-zinc-600">{emp.email}</span>
            </div>
          ))}
          {dept.children?.map((child) => <OrgNode key={child._id} dept={child} level={level + 1} />)}
        </div>
      )}
    </div>
  );
}

export default function DirectoryPage() {
  const [view, setView] = useState("directory");
  const [employees, setEmployees] = useState([]);
  const [orgTree, setOrgTree] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [treeStats, setTreeStats] = useState({});
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchDirectory = async () => {
    try {
      setLoading(true);
      const [dirRes, treeRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/directory${search ? `?search=${search}` : ""}`, { headers }),
        axios.get(`${BACKEND_URL}/directory/org-tree`, { headers }),
      ]);
      setEmployees(dirRes.data.employees || []);
      setOrgTree(treeRes.data.tree || []);
      setTreeStats({ totalDepartments: treeRes.data.totalDepartments, totalEmployees: treeRes.data.totalEmployees });
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDirectory(); }, []);
  useEffect(() => {
    const t = setTimeout(() => fetchDirectory(), 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Network className="size-6 text-cyan-400" />Employee Directory</h1>
            <p className="text-sm text-zinc-400 mt-1">{treeStats.totalEmployees || 0} employees across {treeStats.totalDepartments || 0} departments</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={view === "directory" ? "default" : "outline"} className={view === "directory" ? "bg-indigo-600" : "border-zinc-700 text-zinc-400"} onClick={() => setView("directory")}>
              <Users className="size-3.5 mr-1.5" />Directory
            </Button>
            <Button size="sm" variant={view === "org-tree" ? "default" : "outline"} className={view === "org-tree" ? "bg-indigo-600" : "border-zinc-700 text-zinc-400"} onClick={() => setView("org-tree")}>
              <Network className="size-3.5 mr-1.5" />Org Chart
            </Button>
          </div>
        </div>

        {view === "directory" && (
          <>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              <Input placeholder="Search by name, email, or position..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-zinc-900/80 border-zinc-700" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                [...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 bg-zinc-800 rounded-xl" />)
              ) : employees.length === 0 ? (
                <p className="col-span-3 text-center text-zinc-500 py-12">No employees found</p>
              ) : employees.map((emp) => (
                <Card key={emp._id} className="bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700/60 transition-colors overflow-hidden">
                  <div className="h-1" style={{ backgroundColor: emp.department?.color || "#6366f1" }} />
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="size-11 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center text-sm font-bold text-indigo-300 flex-shrink-0">
                        {emp.first_name?.[0]}{emp.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-200 truncate">{emp.full_name}</p>
                          {emp.emp_code && <span className="text-[10px] font-mono text-indigo-400/70 bg-indigo-500/10 px-1.5 py-0.5 rounded">{emp.emp_code}</span>}
                        </div>
                        <Badge className={`text-[9px] border mt-1 ${POS_COLORS[emp.position] || ""}`}>{formatLabel(emp.position)}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-2 text-zinc-400"><Building2 className="size-3 text-zinc-600" />{emp.department?.name || "Unassigned"}</div>
                      <div className="flex items-center gap-2 text-zinc-400"><Mail className="size-3 text-zinc-600" />{emp.email}</div>
                      {emp.phone && <div className="flex items-center gap-2 text-zinc-400"><Phone className="size-3 text-zinc-600" />{emp.phone}</div>}
                      <div className="flex items-center gap-2 text-zinc-400"><MapPin className="size-3 text-zinc-600" />{COUNTRY_FLAGS[emp.country] || "🌍"} {formatLabel(emp.country)}</div>
                      {emp.team_lead && <div className="flex items-center gap-2 text-zinc-400"><User className="size-3 text-zinc-600" />Reports to: {emp.team_lead.first_name} {emp.team_lead.last_name}</div>}
                      {emp.hire_date && <div className="flex items-center gap-2 text-zinc-400"><Calendar className="size-3 text-zinc-600" />Since {new Date(emp.hire_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {view === "org-tree" && (
          <Card className="bg-zinc-900/80 border-zinc-800/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2"><Network className="size-4 text-cyan-400" />Organization Structure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {loading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 bg-zinc-800 rounded-lg" />)}</div>
              ) : orgTree.length === 0 ? (
                <p className="text-center text-zinc-500 py-12">No departments found</p>
              ) : orgTree.map((dept) => <OrgNode key={dept._id} dept={dept} />)}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
