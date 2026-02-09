import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  User,
  Mail,
  Phone,
  Globe,
  Shield,
  Calendar,
  Edit2,
  Save,
  Key,
  Clock,
  Loader2,
  Building,
  X,
} from "lucide-react";
import { BACKEND_URL } from "../../../config";
import toast from "react-hot-toast";

const AdminProfilePage = ({ onNavigate }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    timezone: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${BACKEND_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const { user, employee } = response.data;
      setProfileData(user);
      setEmployeeData(employee);
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone: user.phone || "",
        timezone: user.timezone || "UTC",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(`${BACKEND_URL}/auth/profile`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
        setProfileData((prev) => ({ ...prev, ...response.data.user }));
        // Update localStorage adminData
        const adminData = JSON.parse(localStorage.getItem("adminData") || "{}");
        adminData.first_name = response.data.user.first_name;
        adminData.last_name = response.data.user.last_name;
        localStorage.setItem("adminData", JSON.stringify(adminData));

        setEditing(false);
        toast.success("Profile updated successfully");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(error.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: profileData?.first_name || "",
      last_name: profileData?.last_name || "",
      phone: profileData?.phone || "",
      timezone: profileData?.timezone || "UTC",
    });
    setEditing(false);
  };

  const getInitials = () => {
    if (!profileData) return "AD";
    return `${profileData.first_name?.[0] || ""}${profileData.last_name?.[0] || ""}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-1">Profile</h1>
      <p className="text-sm text-slate-400 mb-6">
        Manage your account information
      </p>

      {/* Profile Card */}
      <div className="bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden">
        {/* Profile Header */}
        <div className="px-6 py-5 border-b border-slate-700/30">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-500/20 rounded-full flex items-center justify-center">
                <span className="text-indigo-400 font-semibold text-lg">
                  {getInitials()}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {profileData?.first_name} {profileData?.last_name}
                </h2>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-xs font-medium rounded-md">
                    Admin
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-md ${
                      profileData?.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {profileData?.status?.charAt(0).toUpperCase() +
                      profileData?.status?.slice(1)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <InfoCard
              icon={User}
              label="First Name"
              value={formData.first_name}
              name="first_name"
              editing={editing}
              onChange={handleChange}
            />
            <InfoCard
              icon={User}
              label="Last Name"
              value={formData.last_name}
              name="last_name"
              editing={editing}
              onChange={handleChange}
            />
            <InfoCard
              icon={Mail}
              label="Email"
              value={profileData?.email}
              editing={false}
            />
            <InfoCard
              icon={Phone}
              label="Phone"
              value={formData.phone}
              name="phone"
              editing={editing}
              onChange={handleChange}
              placeholder="Not set"
            />
            <InfoCard
              icon={Globe}
              label="Country"
              value={profileData?.country?.charAt(0).toUpperCase() + profileData?.country?.slice(1)}
              editing={false}
            />
            <InfoCard
              icon={Clock}
              label="Timezone"
              value={formData.timezone}
              name="timezone"
              editing={editing}
              onChange={handleChange}
            />
            {employeeData && (
              <>
                <InfoCard
                  icon={Building}
                  label="Department"
                  value={employeeData.department?.charAt(0).toUpperCase() + employeeData.department?.slice(1)}
                  editing={false}
                />
                <InfoCard
                  icon={Shield}
                  label="Position"
                  value={employeeData.position?.toUpperCase()}
                  editing={false}
                />
              </>
            )}
            <InfoCard
              icon={Calendar}
              label="Member Since"
              value={new Date(profileData?.created_at || Date.now()).toLocaleDateString()}
              editing={false}
            />
          </div>

          {/* Security Section */}
          <div className="pt-4 border-t border-slate-700/30">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-500" />
              Security
            </h3>
            <button
              onClick={() => onNavigate("change-password")}
              className="px-4 py-2 text-sm font-medium border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <Key className="w-3.5 h-3.5" />
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoCard = ({
  icon: Icon,
  label,
  value,
  name,
  editing,
  onChange,
  type = "text",
  placeholder,
}) => (
  <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className="w-3.5 h-3.5 text-slate-500" />
      <span className="text-xs font-medium text-slate-500">{label}</span>
    </div>
    {editing && name ? (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder || ""}
        className="w-full px-2 py-1 border border-slate-600 rounded text-sm bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    ) : (
      <p className="text-sm font-medium text-white">{value || placeholder || "Not set"}</p>
    )}
  </div>
);

export default AdminProfilePage;
