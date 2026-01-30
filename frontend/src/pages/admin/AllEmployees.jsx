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
  CheckCircle,
  Send,
  Copy
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
  const [viewEmployee, setViewEmployee] = useState(null);
  const [editEmployee, setEditEmployee] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [emailEmployee, setEmailEmployee] = useState(null);
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

  const handleView = (emp) => {
    setViewEmployee(emp);
  };

  const handleEdit = (emp) => {
    setEditEmployee(emp);
  };

  const handleSendEmail = (emp) => {
    setEmailEmployee(emp);
  };

  const handleDelete = async (emp) => {
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/employees/${emp._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeleteConfirm(null);
      fetchEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
      alert("Failed to delete employee");
    } finally {
      setDeleting(false);
    }
  };

  const handleEmployeeUpdated = () => {
    setEditEmployee(null);
    fetchEmployees();
  };

  const handleToggleStatus = async (emp) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${BACKEND_URL}/employees/${emp._id}`, {
        is_active: !emp.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Update local state immediately for better UX
      setEmployees(prev => prev.map(e => 
        e._id === emp._id ? { ...e, is_active: !e.is_active } : e
      ));
    } catch (error) {
      console.error("Error toggling status:", error);
      alert("Failed to update status");
    }
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
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 ${
                            emp.is_active ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                              emp.is_active ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(emp)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(emp)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendEmail(emp)}>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600"
                              onClick={() => setDeleteConfirm(emp)}
                            >
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

      {/* View Employee Modal */}
      {viewEmployee && (
        <ViewEmployeeModal 
          employee={viewEmployee} 
          onClose={() => setViewEmployee(null)} 
        />
      )}

      {/* Edit Employee Panel */}
      {editEmployee && (
        <EditEmployeePanel 
          employee={editEmployee}
          onClose={() => setEditEmployee(null)} 
          onSuccess={handleEmployeeUpdated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          employee={deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm)}
          loading={deleting}
        />
      )}

      {/* Email Modal */}
      {emailEmployee && (
        <EmailModal
          employee={emailEmployee}
          onClose={() => setEmailEmployee(null)}
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
  const [success, setSuccess] = useState(null); // Changed to object to hold credentials
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
    setSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(null);

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
      const response = await axios.post(`${BACKEND_URL}/employees`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      // Store credentials for display
      setSuccess({
        message: response.data.message,
        email: formData.email,
        tempPassword: response.data.tempPassword
      });
    } catch (error) {
      setError(error.response?.data?.error || "Failed to create employee");
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (success) {
      const text = `Email: ${success.email}\nTemporary Password: ${success.tempPassword}`;
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={success ? undefined : onClose}
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
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 p-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-3">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Employee Created Successfully!</span>
              </div>
              <p className="text-sm text-emerald-600 dark:text-emerald-500 mb-3">
                Login credentials have been sent to the employee's email. You can also share these credentials manually:
              </p>
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-3 space-y-2 border border-emerald-200 dark:border-emerald-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Email:</span>
                  <code className="text-sm font-mono bg-gray-100 dark:bg-neutral-700 px-2 py-1 rounded">{success.email}</code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Temporary Password:</span>
                  <code className="text-sm font-mono bg-gray-100 dark:bg-neutral-700 px-2 py-1 rounded">{success.tempPassword}</code>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  onClick={copyCredentials}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Credentials
                </Button>
                <Button 
                  type="button"
                  size="sm" 
                  onClick={onSuccess}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  Done
                </Button>
              </div>
            </div>
          )}

          {/* Form fields - only show when not successful */}
          {!success && (
            <>
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
            </>
          )}
        </form>
      </div>
    </>
  );
}

// View Employee Modal
function ViewEmployeeModal({ employee, onClose }) {
  const name = `${employee.user_id?.first_name || ""} ${employee.user_id?.last_name || ""}`.trim();
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase();
  const teamLead = employee.team_lead_id
    ? `${employee.team_lead_id.user_id?.first_name} ${employee.team_lead_id.user_id?.last_name}`
    : "Not assigned";

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl shadow-2xl z-[51] p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 text-xl font-semibold">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">{name || "Unknown"}</h2>
            <p className="text-sm text-gray-500">{employee.user_id?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Department</p>
              <p className="font-medium capitalize">{employee.department || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Position</p>
              <p className="font-medium capitalize">{employee.position || "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Team Lead</p>
              <p className="font-medium">{teamLead}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Status</p>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${employee.is_active ? "bg-emerald-500" : "bg-gray-300"}`} />
                <span className="font-medium">{employee.is_active ? "Active" : "Inactive"}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Phone</p>
              <p className="font-medium">{employee.user_id?.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Country</p>
              <p className="font-medium capitalize">{employee.user_id?.country || "—"}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button className="flex-1" onClick={() => window.location.href = `mailto:${employee.user_id?.email}`}>
            <Mail className="mr-2 h-4 w-4" />
            Send Email
          </Button>
        </div>
      </div>
    </>
  );
}

// Edit Employee Panel
function EditEmployeePanel({ employee, onClose, onSuccess }) {
  const [teamLeads, setTeamLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    first_name: employee.user_id?.first_name || "",
    last_name: employee.user_id?.last_name || "",
    phone: employee.user_id?.phone || "",
    country: employee.user_id?.country || "",
    department: employee.department || "",
    position: employee.position || "",
    team_lead_id: employee.team_lead_id?._id || "",
    is_active: employee.is_active,
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

    try {
      const token = localStorage.getItem("token");
      await axios.put(`${BACKEND_URL}/employees/${employee._id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess("Employee updated successfully!");
      setTimeout(() => onSuccess(), 1500);
    } catch (error) {
      setError(error.response?.data?.error || "Failed to update employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-neutral-900 border-l shadow-2xl z-[51] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Edit className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="font-semibold">Edit Employee</h2>
              <p className="text-xs text-gray-500">Update employee information</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

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

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={formData.country || undefined} onValueChange={(v) => handleChange("country", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-white dark:bg-neutral-900 border shadow-lg">
                    {countries.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={formData.department || undefined} onValueChange={(v) => handleChange("department", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-white dark:bg-neutral-900 border shadow-lg">
                    {departmentOptions.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Select value={formData.position || undefined} onValueChange={(v) => handleChange("position", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-white dark:bg-neutral-900 border shadow-lg">
                    {positions.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Team Lead</Label>
              <Select value={formData.team_lead_id || "none"} onValueChange={(v) => handleChange("team_lead_id", v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select (optional)" />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-white dark:bg-neutral-900 border shadow-lg">
                  <SelectItem value="none">None</SelectItem>
                  {teamLeads.map((lead) => (
                    <SelectItem key={lead._id} value={lead._id}>
                      {lead.user_id?.first_name} {lead.user_id?.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.is_active ? "active" : "inactive"} onValueChange={(v) => handleChange("is_active", v === "active")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-white dark:bg-neutral-900 border shadow-lg">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

// Delete Confirmation Modal
function DeleteConfirmModal({ employee, onClose, onConfirm, loading }) {
  const name = `${employee.user_id?.first_name || ""} ${employee.user_id?.last_name || ""}`.trim();

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white dark:bg-neutral-900 rounded-xl shadow-2xl z-[51] p-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
          <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-center mb-2">Delete Employee</h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Are you sure you want to delete <strong>{name || "this employee"}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" className="flex-1" onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

// Email Modal
function EmailModal({ employee, onClose }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const name = `${employee.user_id?.first_name || ""} ${employee.user_id?.last_name || ""}`.trim();
  const email = employee.user_id?.email || "";

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError("Please fill in both subject and message");
      return;
    }

    setSending(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${BACKEND_URL}/employees/send-email`, {
        to: email,
        subject,
        body
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-neutral-900 rounded-xl shadow-2xl z-[51] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50 dark:bg-neutral-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold">Compose Email</h2>
              <p className="text-xs text-gray-500">Send email to {name}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 p-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Email sent successfully!
            </div>
          )}

          {/* To field */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">To</Label>
            <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-neutral-800 rounded-lg">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 text-xs">
                  {name.split(" ").map(n => n[0]).join("").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{name}</span>
              <span className="text-sm text-gray-500">&lt;{email}&gt;</span>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              disabled={success}
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Message</Label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              rows={6}
              disabled={success}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 dark:bg-neutral-800 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || success} className="gap-2">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
