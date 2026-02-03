import { useEffect, useState } from "react";
import {
  UserPlus,
  Mail,
  User,
  Building,
  Users,
  Briefcase,
  Calendar,
  ChevronDown,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Phone,
  Globe,
  Clock,
} from "lucide-react";
import { BACKEND_URL } from "../../../config";
import axios from "axios";

const CreateEmployeePage = () => {
  const [teamLead, setTeamLead] = useState();
  console.log({ teamLead });
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    country: "",
    timezone: "",
    company_id: "",
    employee_type: "internal_team",
    department: "",
    position: "",
    team_lead_id: "",
    hire_date: new Date().toISOString().split("T")[0],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const country = [
    { value: "india", label: "India" },
    { value: "germany", label: "Germany" },
    { value: "usa", label: "USA" },
  ];

  const positions = [
    { value: "ceo", label: "CEO" },
    { value: "cto", label: "CTO" },
    { value: "team_lead", label: "Team Lead" },
    { value: "senior", label: "Senior" },
    { value: "mid", label: "Mid-Level" },
    { value: "junior", label: "Junior" },
  ];

  const timezones = [
    { value: "UTC", label: "UTC" },
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "Europe/London", label: "London (GMT)" },
    { value: "Europe/Paris", label: "Paris (CET)" },
    { value: "Asia/Dubai", label: "Dubai (GST)" },
    { value: "Asia/Kolkata", label: "India (IST)" },
    { value: "Asia/Singapore", label: "Singapore (SGT)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Australia/Sydney", label: "Sydney (AEDT)" },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async () => {
    if (!formData.first_name.trim()) {
      setError("Please enter the first name");
      return;
    }
    if (!formData.last_name.trim()) {
      setError("Please enter the last name");
      return;
    }
    if (!formData.email.trim()) {
      setError("Please enter the email address");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (!formData.department) {
      setError("Please select a department");
      return;
    }
    if (!formData.position) {
      setError("Please select a position");
      return;
    }
    if (!formData.country) {
      setError("Please select a Country");
      return;
    }
    if (!formData.hire_date) {
      setError("Please select a hire date");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const adminToken = localStorage.getItem("token");
      console.log(formData);

      const response = await axios.post(`${BACKEND_URL}/employees`, formData, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Success:", response.data);
      setLoading(false);
    } catch (error) {
      console.error("Axios error:", error);

      // Backend responded with error
      if (error.response) {
        console.error("Backend error data:", error.response.data);
        setError(error.response.data.error || "Failed to create employee");
      }
      // Request sent but no response
      else if (error.request) {
        console.error("No response from server:", error.request);
        setError("Server not responding. Please try again.");
      }
      // Something else went wrong
      else {
        setError("Something went wrong. Please try again.");
      }

      setLoading(false);
    }
  };

  const handleClear = () => {
    setFormData({
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
      country: "",
      timezone: "",
      company_id: "",
      employee_type: "internal_team",
      department: "",
      position: "",
      team_lead_id: "",
      hire_date: new Date().toISOString().split("T")[0],
    });
    setError("");
  };

  useEffect(() => {
    const getTeamLead = async () => {
      try {
        const adminToken = localStorage.getItem("token");

        const response = await axios.get(
          `${BACKEND_URL}/helper/getTeamLead`,
          {
            headers: {
              authorization: `Bearer ${adminToken}`,
            },
          }
        );

        console.log(response);
        setTeamLead(response.data.data);
      } catch (error) {
        console.error(error);
      }
    };

    getTeamLead();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button className="flex items-center gap-2 text-teal-700 hover:text-teal-900 mb-4 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
              <UserPlus className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-teal-900">
                Create New Employee
              </h1>
              <p className="text-teal-700">
                Add a new team member to your organization
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-teal-200 shadow-xl">
          <div className="p-6 lg:p-8 space-y-6">
            {error && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-orange-800">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-teal-900 mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-400" />
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-teal-900 placeholder-teal-400"
                    placeholder="John"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-teal-900 mb-2">
                  Last Name *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-400" />
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-teal-900 placeholder-teal-400"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-teal-900 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-teal-900 placeholder-teal-400"
                  placeholder="john.doe@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-teal-900 mb-2">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-teal-900 placeholder-teal-400"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-teal-900 mb-2">
                  Country *
                </label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-400" />
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full pl-12 pr-10 py-3 border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-teal-900 appearance-none cursor-pointer"
                  >
                    <option value="">Select Country</option>
                    {country.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-teal-900 mb-2">
                  Timezone
                </label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-400" />
                  <select
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleChange}
                    className="w-full pl-12 pr-10 py-3 border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-teal-900 appearance-none cursor-pointer"
                  >
                    <option value="">Select Timezone</option>
                    {timezones.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-teal-900 mb-2">
                  Company ID
                </label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-400" />
                  <input
                    type="text"
                    name="company_id"
                    value={formData.company_id}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-teal-900 placeholder-teal-400"
                    placeholder="COMP-001"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-teal-900 mb-2">
                  Employee Type *
                </label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-400" />
                  <select
                    name="employee_type"
                    value={formData.employee_type}
                    onChange={handleChange}
                    className="w-full pl-12 pr-10 py-3 border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-teal-900 appearance-none cursor-pointer"
                  >
                    {employeeTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-teal-900 mb-2">
                  Department *
                </label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-400" />
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full pl-12 pr-10 py-3 border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-teal-900 appearance-none cursor-pointer"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-teal-900 mb-2">
                  Position *
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-400" />
                  <select
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className="w-full pl-12 pr-10 py-3 border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-teal-900 appearance-none cursor-pointer"
                  >
                    <option value="">Select Position</option>
                    {positions.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-teal-900 mb-2">
                  Hire Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-400" />
                  <input
                    type="date"
                    name="hire_date"
                    value={formData.hire_date}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-teal-900"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-teal-900 mb-2">
                Team Lead *
              </label>
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-400" />
                <select
                  name="team_lead_id"
                  value={formData.team_lead_id}
                  onChange={handleChange}
                  className="w-full pl-12 pr-10 py-3 border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-teal-900 appearance-none cursor-pointer"
                >
                  <option value="">Select Team Lead</option>
                  {teamLead?.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.user_id.first_name} {d.user_id.last_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>Create Employee</span>
                  </>
                )}
              </button>
              <button
                onClick={handleClear}
                disabled={loading}
                className="px-6 py-3 border-2 border-teal-200 text-teal-700 font-semibold rounded-xl hover:bg-teal-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="bg-teal-50 border-t-2 border-teal-200 p-6 rounded-b-2xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-teal-800">
                <p className="font-semibold mb-1">What happens next?</p>
                <ul className="list-disc list-inside space-y-1 text-teal-700">
                  <li>User account created with provided credentials</li>
                  <li>Employee record linked to user account</li>
                  <li>Access permissions set based on position & department</li>
                  <li>Employee must change password on first login</li>
                  <li>Account status set to active by default</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateEmployeePage;
