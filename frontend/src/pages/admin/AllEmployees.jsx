import { useEffect, useState } from "react";
import axios from "axios";
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Mail, 
  ChevronUp, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  X,
  UserPlus,
  Loader2,
  CheckCircle
} from "lucide-react";
import { BACKEND_URL } from "../../../config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const employeeTypes = [
  { value: "internal_team", label: "Internal Team" },
  { value: "customer_support", label: "Customer Support" },
];

const departmentOptions = [
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "devops", label: "DevOps" },
  { value: "qa", label: "QA" },
  { value: "hr", label: "HR" },
  { value: "finance", label: "Finance" },
];

const positions = [
  { value: "ceo", label: "CEO" },
  { value: "cto", label: "CTO" },
  { value: "team_lead", label: "Team Lead" },
  { value: "senior", label: "Senior" },
  { value: "mid", label: "Mid-Level" },
  { value: "junior", label: "Junior" },
];

const countries = [
  { value: "india", label: "India" },
  { value: "germany", label: "Germany" },
  { value: "usa", label: "USA" },
];

export default function AllEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/employees/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))];
  const activeCount = employees.filter((e) => e.is_active).length;

  const filtered = employees.filter((emp) => {
    const name = `${emp.user_id?.first_name} ${emp.user_id?.last_name}`.toLowerCase();
    const email = emp.user_id?.email?.toLowerCase() || "";
    const matchSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
    const matchDept = filterDept === "all" || emp.department === filterDept;
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && emp.is_active) ||
      (filterStatus === "inactive" && !emp.is_active);
    return matchSearch && matchDept && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal, bVal;
    switch (sortField) {
      case "name":
        aVal = `${a.user_id?.first_name} ${a.user_id?.last_name}`.toLowerCase();
        bVal = `${b.user_id?.first_name} ${b.user_id?.last_name}`.toLowerCase();
        break;
      case "department":
        aVal = a.department?.toLowerCase() || "";
        bVal = b.department?.toLowerCase() || "";
        break;
      case "position":
        aVal = a.position?.toLowerCase() || "";
        bVal = b.position?.toLowerCase() || "";
        break;
      case "status":
        aVal = a.is_active ? 1 : 0;
        bVal = b.is_active ? 1 : 0;
        break;
      default:
        return 0;
    }
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const paginatedEmployees = sorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.length === paginatedEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(paginatedEmployees.map((e) => e._id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="w-4" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const handleEmployeeCreated = () => {
    setShowAddPanel(false);
    fetchEmployees();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm mt-3">Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employee Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your organization's workforce</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setShowAddPanel(true)}>
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{employees.length}</p>
              <p className="text-xs text-muted-foreground">Total Employees</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <UserX className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{employees.length - activeCount}</p>
              <p className="text-xs text-muted-foreground">Inactive</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-9 bg-muted/50 border-0 focus-visible:bg-background"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterDept} onValueChange={(v) => { setFilterDept(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept} className="capitalize">{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={fetchEmployees} className="shrink-0">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="p-4 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.length === paginatedEmployees.length && paginatedEmployees.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-input h-4 w-4"
                  />
                </th>
                <th 
                  className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    Employee
                    <SortIcon field="name" />
                  </div>
                </th>
                <th 
                  className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors hidden md:table-cell"
                  onClick={() => handleSort("department")}
                >
                  <div className="flex items-center gap-1">
                    Department
                    <SortIcon field="department" />
                  </div>
                </th>
                <th 
                  className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors hidden lg:table-cell"
                  onClick={() => handleSort("position")}
                >
                  <div className="flex items-center gap-1">
                    Position
                    <SortIcon field="position" />
                  </div>
                </th>
                <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">
                  Team Lead
                </th>
                <th 
                  className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-1">
                    Status
                    <SortIcon field="status" />
                  </div>
                </th>
                <th className="p-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <Users className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-sm">No employees found</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => setShowAddPanel(true)}
                      >
                        Add your first employee
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => {
                  const name = `${emp.user_id?.first_name || ""} ${emp.user_id?.last_name || ""}`.trim();
                  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase();
                  const teamLead = emp.team_lead_id
                    ? `${emp.team_lead_id.user_id?.first_name} ${emp.team_lead_id.user_id?.last_name}`
                    : "—";

                  return (
                    <tr 
                      key={emp._id} 
                      className={`hover:bg-muted/30 transition-colors ${selectedEmployees.includes(emp._id) ? 'bg-primary/5' : ''}`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(emp._id)}
                          onChange={() => toggleSelect(emp._id)}
                          className="rounded border-input h-4 w-4"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 ring-2 ring-background">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                              {initials || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {emp.user_id?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <Badge variant="secondary" className="font-normal capitalize">
                          {emp.department || "—"}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground hidden lg:table-cell capitalize">
                        {emp.position || "—"}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground hidden xl:table-cell">
                        {teamLead}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${emp.is_active ? "bg-emerald-500" : "bg-gray-300"}`} />
                          <span className={`text-xs font-medium ${emp.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                            {emp.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {sorted.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sorted.length)} of {sorted.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Employee Slide Panel */}
      {showAddPanel && (
        <AddEmployeePanel 
          onClose={() => setShowAddPanel(false)} 
          onSuccess={handleEmployeeCreated}
        />
      )}
    </div>
  );
}

// Add Employee Slide Panel Component
function AddEmployeePanel({ onClose, onSuccess }) {
  const [teamLeads, setTeamLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    country: "",
    timezone: "UTC",
    employee_type: "internal_team",
    department: "",
    position: "",
    team_lead_id: "",
    hire_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchTeamLeads();
  }, []);

  const fetchTeamLeads = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${BACKEND_URL}/helper/getTeamLead`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeamLeads(response.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!formData.first_name || !formData.last_name || !formData.email) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    if (!formData.department || !formData.position || !formData.country) {
      setError("Please select department, position, and country");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${BACKEND_URL}/employees`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      setSuccess("Employee created successfully!");
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (error) {
      setError(error.response?.data?.error || "Failed to create employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-neutral-900 border-l shadow-2xl z-[51] overflow-y-auto text-neutral-900 dark:text-neutral-100">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Add Employee</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Create a new team member</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 p-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {success}
            </div>
          )}

          {/* Personal Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Personal Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="john.doe@company.com"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label>Country <span className="text-red-500">*</span></Label>
                <Select value={formData.country} onValueChange={(v) => handleChange("country", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator className="bg-neutral-200 dark:bg-neutral-800" />

          {/* Work Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Work Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Employee Type</Label>
                <Select value={formData.employee_type} onValueChange={(v) => handleChange("employee_type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department <span className="text-red-500">*</span></Label>
                <Select value={formData.department} onValueChange={(v) => handleChange("department", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Position <span className="text-red-500">*</span></Label>
                <Select value={formData.position} onValueChange={(v) => handleChange("position", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hire Date</Label>
                <Input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => handleChange("hire_date", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Team Lead</Label>
              <Select value={formData.team_lead_id} onValueChange={(v) => handleChange("team_lead_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {teamLeads.map((lead) => (
                    <SelectItem key={lead._id} value={lead._id}>
                      {lead.user_id?.first_name} {lead.user_id?.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="bg-neutral-200 dark:bg-neutral-800" />

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Employee
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
