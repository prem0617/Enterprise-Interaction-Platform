import React, { useState } from "react";
import axios from "axios";
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { BACKEND_URL } from "../../../config";
import { useNavigate } from "react-router-dom";

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    console.log(`${BACKEND_URL}/auth/admin/login`);
    try {
      const response = await axios.post(`${BACKEND_URL}/auth/admin/login`, {
        email: formData.email,
        password: formData.password,
      });
      console.log(response.data);
      console.log(response.data.token);
      localStorage.setItem("adminData", JSON.stringify(response.data.user));
      localStorage.setItem("token", response.data.token);
      // success
      navigate("/adminDashboard");
    } catch (error) {
      // error handling
      if (error.response) {
        setError(error.response.data.message || "Invalid email or password");
      } else {
        setError("Server not reachable");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(to right, #99f6e4 1px, transparent 1px), linear-gradient(to bottom, #99f6e4 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      ></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl mb-4 shadow-lg">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-teal-900 mb-2">
            Admin Portal
          </h1>
          <p className="text-teal-700">Sign in to manage your platform</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-teal-200 p-8 backdrop-blur-sm">
          <div className="space-y-6">
            {error && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-orange-800">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-teal-900 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-teal-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 text-teal-900 placeholder-teal-400"
                  placeholder="admin@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-teal-900 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-teal-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3 border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 text-teal-900 placeholder-teal-400"
                  placeholder="••••••••"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-teal-400 hover:text-teal-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-cyan-500 border-teal-300 rounded focus:ring-cyan-500"
                />
                <span className="ml-2 text-sm text-teal-700">Remember me</span>
              </label>
              <button className="text-sm font-medium text-cyan-600 hover:text-cyan-700 transition-colors">
                Forgot password?
              </button>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-3 px-4 rounded-xl hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </div>

          <div className="mt-6 p-4 bg-teal-50 rounded-xl border border-teal-200">
            <p className="text-xs font-medium text-teal-900 mb-2">
              Demo Credentials:
            </p>
            <p className="text-xs text-teal-700">Email: admin@company.com</p>
            <p className="text-xs text-teal-700">Password: Admin@123</p>
          </div>
        </div>

        <p className="text-center text-sm text-teal-600 mt-6">
          © 2024 Enterprise Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
