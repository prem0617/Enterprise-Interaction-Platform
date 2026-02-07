import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  User,
  Mail,
  Building,
  Globe,
  Shield,
  Calendar,
  Edit2,
  Save,
  ArrowLeft,
  Key,
  Clock,
} from "lucide-react";
import { BACKEND_URL } from "../../../config";

const EmployeeProfilePage = () => {
  const [editing, setEditing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    department: "",
    timezone: "",
    countryCode: "",
  });
  console.log(userData);
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const userId = user.employee.id;
      const token = localStorage.getItem("token");

      const response = await axios.get(`${BACKEND_URL}/employees/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = response.data;
      const userDataFromApi = result.user;
      setUserData(userDataFromApi);
      setFormData({
        fullName: userDataFromApi.full_name,
        email: userDataFromApi.user_id.email,
        department: userDataFromApi.department,
        timezone: userDataFromApi.user_id.timezone,
        countryCode: userDataFromApi.user_id.country,
      });

      setLoading(false);
    } catch (error) {
      console.error("Axios error:", error);
      if (error.response) console.error("Backend error:", error.response.data);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-sm">Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => (window.location.href = "/")}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* Profile Card */}
        <div className="bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden">
          {/* Profile Header */}
          <div className="px-6 py-5 border-b border-slate-700/30">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-500/20 rounded-full flex items-center justify-center">
                  <span className="text-indigo-400 font-semibold text-lg">
                    {userData?.user_id?.first_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || "U"}
                  </span>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">
                    {userData?.user_id?.first_name +
                      userData?.user_id?.last_name}
                  </h1>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {userData?.roles?.map((role, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-xs font-medium rounded-md"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {/* <button
                onClick={() => (editing ? handleSave() : setEditing(true))}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                {editing ? (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save
                  </>
                ) : (
                  <>
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </>
                )}
              </button> */}
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <InfoCard
                icon={Mail}
                label="Email"
                value={formData.email}
                name="email"
                editing={editing}
                onChange={handleChange}
                type="email"
              />
              <InfoCard
                icon={Building}
                label="Department"
                value={formData.department}
                name="department"
                editing={editing}
                onChange={handleChange}
              />
              <InfoCard
                icon={Globe}
                label="Country"
                value={formData.countryCode}
                name="countryCode"
                editing={editing}
                onChange={handleChange}
              />
              <InfoCard
                icon={Clock}
                label="Timezone"
                value={formData.timezone}
                name="timezone"
                editing={editing}
                onChange={handleChange}
              />
              <InfoCard
                icon={Calendar}
                label="Member Since"
                value={new Date(
                  userData?.created_at || Date.now()
                ).toLocaleDateString()}
                editing={false}
              />
              <InfoCard
                icon={Shield}
                label="Status"
                value={userData?.is_active ? "Active" : "Inactive"}
                editing={false}
              />
            </div>

            {/* Security */}
            <div className="pt-4 border-t border-slate-700/30">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-500" />
                Security
              </h2>
              <button
                onClick={() => (window.location.href = "/change-password")}
                className="px-4 py-2 text-sm font-medium border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <Key className="w-3.5 h-3.5" />
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Permissions */}
        {userData?.permissions?.length > 0 && (
          <div className="mt-4 bg-slate-900 rounded-xl border border-slate-700/50 p-5">
            <h3 className="text-sm font-semibold text-white mb-3">
              Permissions
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {userData?.permissions?.slice(0, 8).map((permission, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-slate-800 text-slate-400 text-xs font-medium rounded-md border border-slate-700/50"
                >
                  {permission}
                </span>
              ))}
            </div>
          </div>
        )}
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
        className="w-full px-2 py-1 border border-slate-600 rounded text-sm bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    ) : (
      <p className="text-sm font-medium text-white">{value || "Not set"}</p>
    )}
  </div>
);

export default EmployeeProfilePage;
