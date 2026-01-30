import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Loader2, Building2, ArrowRight, UserPlus } from "lucide-react";
import { BACKEND_URL } from "../../../config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminSignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    phone: "",
    country: "",
    company_id: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...submitData } = formData;
      const response = await axios.post(`${BACKEND_URL}/auth/admin/signup`, submitData);
      localStorage.setItem("adminData", JSON.stringify(response.data.user));
      localStorage.setItem("token", response.data.token);
      navigate("/adminDashboard");
    } catch (error) {
      setError(error.response?.data?.error || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-violet-600 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-700 rounded-full translate-y-1/2 -translate-x-1/2 opacity-50" />
        
        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <span className="font-semibold text-white text-lg">Enterprise Platform</span>
        </div>
        
        {/* Content */}
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Start managing<br />your organization<br />today
          </h1>
          <p className="text-violet-200 text-lg max-w-md">
            Create your admin account to set up your enterprise platform and start adding team members.
          </p>
          <div className="flex gap-8 pt-4">
            <div>
              <p className="text-3xl font-bold text-white">Free</p>
              <p className="text-violet-200 text-sm">To Start</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">Easy</p>
              <p className="text-violet-200 text-sm">Setup</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">Secure</p>
              <p className="text-violet-200 text-sm">Platform</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-violet-300 text-sm relative z-10">
          © 2026 Enterprise Platform. All rights reserved.
        </p>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-sky-50 dark:bg-gray-950 overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-lg bg-violet-600 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="font-semibold text-lg">Enterprise Platform</span>
          </div>

          <div className="space-y-2 mb-6">
            <h2 className="text-2xl font-bold">Create Admin Account</h2>
            <p className="text-gray-500">Set up your organization's admin account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  type="text"
                  placeholder="John"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  type="text"
                  placeholder="Doe"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@company.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+1 234 567 8900"
                value={formData.phone}
                onChange={handleChange}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                name="country"
                type="text"
                placeholder="United States"
                value={formData.country}
                onChange={handleChange}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_id">Company/Organization Name</Label>
              <Input
                id="company_id"
                name="company_id"
                type="text"
                placeholder="Acme Inc."
                value={formData.company_id}
                onChange={handleChange}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Min. 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="h-10"
              />
            </div>

            <Button type="submit" className="w-full h-11 bg-violet-600 hover:bg-violet-700 gap-2 mt-2" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create Account
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <p className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <a href="/adminLogin" className="text-violet-600 font-medium hover:underline">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
