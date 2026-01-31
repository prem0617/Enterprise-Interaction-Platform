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

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    fetchProfile();
  }, []);
  console.log(user.employee.id);
  const fetchProfile = async () => {
    try {
      const userId = user.employee.id;
      console.log({ userId });
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `http://localhost:8000/api/employees/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = response.data;
      const userDataFromApi = result.user;
      console.log(userDataFromApi);
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

      if (error.response) {
        console.error("Backend error:", error.response.data);
      }

      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    // API call to update profile would go here
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="animate-pulse text-teal-700">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => (window.location.href = "/")}
          className="flex items-center gap-2 text-teal-700 hover:text-teal-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Dashboard</span>
        </button>

        <div className="bg-white rounded-3xl border-2 border-teal-200 shadow-xl overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 relative">
            <div className="absolute -bottom-16 left-8">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl border-4 border-white shadow-xl flex items-center justify-center">
                <span className="text-white font-bold text-4xl">
                  {userData?.full_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("") || "U"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-20 px-8 pb-8">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-teal-900 mb-2">
                  {userData?.full_name}
                </h1>
                <div className="flex flex-wrap gap-2">
                  {userData?.roles?.map((role, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold rounded-lg"
                    >
                      {role.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => (editing ? handleSave() : setEditing(true))}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all shadow-md"
              >
                {editing ? (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Changes</span>
                  </>
                ) : (
                  <>
                    <Edit2 className="w-5 h-5" />
                    <span>Edit Profile</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
                label="Account Status"
                value={userData?.is_active ? "Active" : "Inactive"}
                editing={false}
              />
            </div>

            <div className="border-t-2 border-teal-200 pt-6">
              <h2 className="text-xl font-bold text-teal-900 mb-4 flex items-center gap-2">
                <Key className="w-6 h-6 text-cyan-500" />
                Security Settings
              </h2>
              <button
                onClick={() => (window.location.href = "/change-password")}
                className="w-full sm:w-auto px-6 py-3 bg-white border-2 border-teal-200 text-teal-700 font-semibold rounded-xl hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"
              >
                <Key className="w-5 h-5" />
                <span>Change Password</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-2xl border-2 border-teal-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-teal-900 mb-4">
            Your Permissions
          </h3>
          <div className="flex flex-wrap gap-2">
            {userData?.permissions?.slice(0, 8).map((permission, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-teal-50 text-teal-700 text-sm font-medium rounded-lg border border-teal-200"
              >
                {permission}
              </span>
            ))}
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
}) => (
  <div className="bg-teal-50 rounded-2xl p-4 border-2 border-teal-200">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-5 h-5 text-cyan-600" />
      <span className="text-sm font-semibold text-teal-700">{label}</span>
    </div>
    {editing && name ? (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 border-2 border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-teal-900"
      />
    ) : (
      <p className="text-teal-900 font-semibold">{value || "Not set"}</p>
    )}
  </div>
);

export default EmployeeProfilePage;
