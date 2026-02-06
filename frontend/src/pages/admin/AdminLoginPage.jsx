import React, { useState } from "react";
import axios from "axios";
import { Eye, EyeOff, Loader2, AlertCircle, Lock } from "lucide-react";
import { BACKEND_URL } from "../../../config";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContextProvider";

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthContext();
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

    try {
      const response = await axios.post(`${BACKEND_URL}/auth/admin/login`, {
        email: formData.email,
        password: formData.password,
      });
      // Clear any stale employee session before storing admin session
      localStorage.removeItem("user");
      localStorage.setItem("adminData", JSON.stringify(response.data.user));
      localStorage.setItem("token", response.data.token);
      // Update AuthContext so socket connects immediately (no refresh needed)
      setUser(response.data.user);
      navigate("/adminDashboard");
    } catch (error) {
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-11 h-11 bg-indigo-600 rounded-lg mb-4">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Admin Portal
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Sign in to manage your platform
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900 rounded-xl border border-slate-700/50 shadow-lg shadow-black/20 p-6">
          <div className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-600 rounded-lg text-sm bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition placeholder:text-slate-500"
                placeholder="admin@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-600 rounded-lg text-sm bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition pr-10 placeholder:text-slate-500"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Enterprise Platform &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
