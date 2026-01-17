import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Users,
  FileText,
  Video,
  Folder,
  User,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Hash,
  Clock,
  Calendar,
  Activity,
} from "lucide-react";

const EmployeeDashboard = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userData = JSON.parse(localStorage.getItem("user"));
  console.log(userData);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const quickStats = [
    {
      label: "My Channels",
      value: userData?.channels?.length || 0,
      icon: Hash,
      color: "from-cyan-500 to-blue-500",
    },
    {
      label: "Team Members",
      value: userData?.teamMembers?.length || 0,
      icon: Users,
      color: "from-teal-500 to-cyan-500",
    },
    {
      label: "Active Tasks",
      value: "8",
      icon: Activity,
      color: "from-blue-500 to-purple-500",
    },
    {
      label: "Meetings Today",
      value: "3",
      icon: Calendar,
      color: "from-purple-500 to-pink-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      <nav className="bg-white border-b-2 border-teal-200 sticky top-0 z-50 shadow-sm">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">EP</span>
                </div>
                <span className="text-xl font-bold text-teal-900 hidden sm:block">
                  Enterprise Platform
                </span>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-1">
              <NavLink icon={MessageSquare} label="Messages" active />
              <NavLink icon={Users} label="Team" />
              <NavLink icon={FileText} label="Files" />
              <NavLink icon={Video} label="Meetings" />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-teal-50 rounded-xl transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {userData?.first_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || "U"}
                  </div>
                  <span className="text-teal-900 font-medium hidden sm:block">
                    {userData?.first_name || "User"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-teal-600 hidden sm:block" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border-2 border-teal-200 py-2">
                    <div className="px-4 py-3 border-b-2 border-teal-100">
                      <p className="text-sm font-semibold text-teal-900">
                        {userData?.user?.full_name}
                      </p>
                      <p className="text-xs text-teal-600">
                        {userData?.user?.email}
                      </p>
                    </div>
                    <button
                      onClick={() => (window.location.href = "/profile")}
                      className="w-full flex items-center gap-3 px-4 py-2 text-teal-700 hover:bg-teal-50 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">My Profile</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-teal-700 hover:bg-teal-50 transition-colors">
                      <Settings className="w-4 h-4" />
                      <span className="text-sm font-medium">Settings</span>
                    </button>
                    <div className="border-t-2 border-teal-100 mt-2 pt-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-orange-600 hover:bg-orange-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-medium">Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-teal-600 hover:bg-teal-50 rounded-xl"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t-2 border-teal-200 py-4 space-y-2">
              <MobileNavLink icon={MessageSquare} label="Messages" active />
              <MobileNavLink icon={Users} label="Team" />
              <MobileNavLink icon={Video} label="Meetings" />
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-teal-900 mb-2">
            Welcome back, {userData?.user?.full_name?.split(" ")[0] || "User"}!
            👋
          </h1>
          <p className="text-teal-700">Here's what's happening today.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 border-2 border-teal-200 shadow-sm hover:shadow-lg transition-shadow"
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-4`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm text-teal-600 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-teal-900">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border-2 border-teal-200 shadow-sm">
            <div className="p-6 border-b-2 border-teal-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-teal-900 flex items-center gap-2">
                <Hash className="w-6 h-6 text-cyan-500" />
                My Channels
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {userData?.channels?.length > 0 ? (
                  userData.channels.slice(0, 6).map((channel, index) => (
                    <div
                      key={index}
                      className="p-4 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors cursor-pointer border border-teal-200"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-5 h-5 text-cyan-600" />
                        <h3 className="font-semibold text-teal-900">
                          {channel.channel_name}
                        </h3>
                      </div>
                      <p className="text-xs text-teal-600">
                        Last active: 2h ago
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-teal-600 col-span-2">No channels yet</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-teal-200 shadow-sm">
            <div className="p-6 border-b-2 border-teal-200">
              <h2 className="text-xl font-bold text-teal-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-500" />
                Team
              </h2>
            </div>
            <div className="p-6 space-y-3">
              {userData?.teamMembers?.length > 0 ? (
                userData.teamMembers.slice(0, 6).map((member, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 hover:bg-teal-50 rounded-xl"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.full_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("") || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-teal-900 text-sm truncate">
                        {member.full_name}
                      </p>
                      <p className="text-xs text-teal-600 truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-teal-600 text-sm">No team members</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const NavLink = ({ icon: Icon, label, active }) => (
  <button
    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
      active
        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md"
        : "text-teal-700 hover:bg-teal-50"
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
  </button>
);

const MobileNavLink = ({ icon: Icon, label, active }) => (
  <button
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${
      active
        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
        : "text-teal-700 hover:bg-teal-50"
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
  </button>
);

export default EmployeeDashboard;
