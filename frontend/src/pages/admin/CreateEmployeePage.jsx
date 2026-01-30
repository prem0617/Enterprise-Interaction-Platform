import { useEffect, useState } from "react";
import axios from "axios";
import { Loader2, UserPlus, CheckCircle, ArrowLeft } from "lucide-react";
import { BACKEND_URL } from "../../../config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const employeeTypes = [
  { value: "internal_team", label: "Internal Team" },
  { value: "customer_support", label: "Customer Support" },
];

const departments = [
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

export default function CreateEmployeePage({ onSuccess }) {
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
      setSuccess("Employee created successfully. Login credentials have been sent to their email.");
      setFormData({
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
      if (onSuccess) {
        setTimeout(() => onSuccess(), 2000);
      }
    } catch (error) {
      setError(error.response?.data?.error || "Failed to create employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Add Employee</h1>
        <p className="text-muted-foreground text-sm mt-1">Create a new team member account</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Employee Information</CardTitle>
              <CardDescription>Fill in the details below to create a new employee</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <Separator />
        
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-4 text-sm text-red-600 dark:text-red-400 animate-fade-in">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 p-4 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-3 animate-fade-in">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                {success}
              </div>
            )}

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Personal Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleChange("first_name", e.target.value)}
                    placeholder="John"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleChange("last_name", e.target.value)}
                    placeholder="Doe"
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="john.doe@company.com"
                  className="h-10"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country <span className="text-red-500">*</span></Label>
                  <Select value={formData.country} onValueChange={(v) => handleChange("country", v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Work Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Work Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Employee Type</Label>
                  <Select
                    value={formData.employee_type}
                    onValueChange={(v) => handleChange("employee_type", v)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {employeeTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.department}
                    onValueChange={(v) => handleChange("department", v)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Position <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.position}
                    onValueChange={(v) => handleChange("position", v)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hire_date">Hire Date</Label>
                  <Input
                    id="hire_date"
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => handleChange("hire_date", e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Team Lead</Label>
                <Select
                  value={formData.team_lead_id}
                  onValueChange={(v) => handleChange("team_lead_id", v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select team lead (optional)" />
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

            <Separator />

            <div className="flex gap-3 pt-2">
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
        </CardContent>
      </Card>
    </div>
  );
}
