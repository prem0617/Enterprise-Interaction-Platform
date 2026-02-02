import React, { useState } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Key,
  Shield,
} from "lucide-react";
import { BACKEND_URL } from "../../../config";
import toast from "react-hot-toast";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");

    if (name === "newPassword") {
      calculatePasswordStrength(value);
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[@#$!%*?&]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const toggleShowPassword = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    if (!/[A-Z]/.test(formData.newPassword)) {
      setError("Password must contain at least one uppercase letter");
      setLoading(false);
      return;
    }

    if (!/[a-z]/.test(formData.newPassword)) {
      setError("Password must contain at least one lowercase letter");
      setLoading(false);
      return;
    }

    if (!/[0-9]/.test(formData.newPassword)) {
      setError("Password must contain at least one number");
      setLoading(false);
      return;
    }

    if (!/[@#$!%*?&]/.test(formData.newPassword)) {
      setError(
        "Password must contain at least one special character (@#$!%*?&)"
      );
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${BACKEND_URL}/auth/change-password`,
        {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = response.data;

      if (result.success) {
        setSuccess(true);
        setFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setPasswordStrength(0);
        navigate("/profile");

        // Redirect after 2 seconds

        toast.success("Password Changed");
      } else {
        setError(result.error || "Failed to change password");
        toast.error(result.message || "Failed to change password");
      }
    } catch (err) {
      console.log(err);
      // Axios gives better error info
      const message =
        err.response?.data?.error || "Network error. Please try again.";

      setError(message);
      toast.error(message);
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 2) return "bg-orange-500";
    if (passwordStrength <= 3) return "bg-yellow-500";
    if (passwordStrength <= 4) return "bg-teal-500";
    return "bg-green-500";
  };

  const getStrengthText = () => {
    if (passwordStrength <= 2) return "Weak";
    if (passwordStrength <= 3) return "Fair";
    if (passwordStrength <= 4) return "Good";
    return "Strong";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <button
          onClick={() => (window.location.href = "/profile")}
          className="flex items-center gap-2 text-teal-700 hover:text-teal-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Profile</span>
        </button>

        <div className="bg-white rounded-3xl border-2 border-teal-200 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 p-8 text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Key className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Change Password
            </h1>
            <p className="text-cyan-100">
              Keep your account secure with a strong password
            </p>
          </div>

          <div className="p-8">
            <div className="space-y-6">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-semibold text-teal-900 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-teal-400" />
                  </div>
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    className="w-full pl-12 pr-12 py-3 border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-teal-900 placeholder-teal-400"
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowPassword("current")}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-teal-400 hover:text-teal-600"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-teal-900 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-teal-400" />
                  </div>
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="w-full pl-12 pr-12 py-3 border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-teal-900 placeholder-teal-400"
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowPassword("new")}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-teal-400 hover:text-teal-600"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {formData.newPassword && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-teal-700">
                        Password Strength
                      </span>
                      <span className="text-xs font-semibold text-teal-900">
                        {getStrengthText()}
                      </span>
                    </div>
                    <div className="w-full bg-teal-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-teal-900 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-teal-400" />
                  </div>
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-12 pr-12 py-3 border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-teal-900 placeholder-teal-400"
                    placeholder="Confirm new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowPassword("confirm")}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-teal-400 hover:text-teal-600"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {formData.confirmPassword &&
                  formData.newPassword !== formData.confirmPassword && (
                    <p className="mt-2 text-xs text-orange-600">
                      Passwords do not match
                    </p>
                  )}
              </div>

              {/* Requirements */}
              <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-teal-900 mb-2">
                  Password Requirements:
                </p>
                <ul className="space-y-1 text-xs text-teal-700">
                  <RequirementItem
                    text="At least 8 characters"
                    met={formData.newPassword.length >= 8}
                  />
                  <RequirementItem
                    text="One uppercase letter (A-Z)"
                    met={/[A-Z]/.test(formData.newPassword)}
                  />
                  <RequirementItem
                    text="One lowercase letter (a-z)"
                    met={/[a-z]/.test(formData.newPassword)}
                  />
                  <RequirementItem
                    text="One number (0-9)"
                    met={/[0-9]/.test(formData.newPassword)}
                  />
                  <RequirementItem
                    text="One special character (@#$!%*?&)"
                    met={/[@#$!%*?&]/.test(formData.newPassword)}
                  />
                </ul>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={loading || success}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Changing Password...</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Password Changed!</span>
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5" />
                    <span>Change Password</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RequirementItem = ({ text, met }) => (
  <li className="flex items-center gap-2">
    <div
      className={`w-4 h-4 rounded-full flex items-center justify-center ${
        met ? "bg-teal-500" : "bg-teal-200"
      }`}
    >
      {met && <CheckCircle className="w-3 h-3 text-white" />}
    </div>
    <span className={met ? "text-teal-900 font-medium" : ""}>{text}</span>
  </li>
);

export default ChangePasswordPage;
