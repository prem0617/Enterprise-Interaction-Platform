import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Users,
  FileText,
  Video,
  User,
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
import ChatInterface from "../../components/ChatInterface";

const EmployeeDashboard = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("messages"); // messages, team, files, meetings

  const userData = JSON.parse(localStorage.getItem("user"));
  console.log(userData);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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
              <NavLink
                icon={MessageSquare}
                label="Messages"
                active={activeTab === "messages"}
                onClick={() => setActiveTab("messages")}
              />
              <NavLink
                icon={Users}
                label="Team"
                active={activeTab === "team"}
                onClick={() => setActiveTab("team")}
              />
              <NavLink
                icon={FileText}
                label="Files"
                active={activeTab === "files"}
                onClick={() => setActiveTab("files")}
              />
              <NavLink
                icon={Video}
                label="Meetings"
                active={activeTab === "meetings"}
                onClick={() => setActiveTab("meetings")}
              />
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
                        {userData?.first_name} {userData?.last_name}
                      </p>
                      <p className="text-xs text-teal-600">{userData?.email}</p>
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
              <MobileNavLink
                icon={MessageSquare}
                label="Messages"
                active={activeTab === "messages"}
                onClick={() => {
                  setActiveTab("messages");
                  setMobileMenuOpen(false);
                }}
              />
              <MobileNavLink
                icon={Users}
                label="Team"
                active={activeTab === "team"}
                onClick={() => {
                  setActiveTab("team");
                  setMobileMenuOpen(false);
                }}
              />
              <MobileNavLink
                icon={FileText}
                label="Files"
                active={activeTab === "files"}
                onClick={() => {
                  setActiveTab("files");
                  setMobileMenuOpen(false);
                }}
              />
              <MobileNavLink
                icon={Video}
                label="Meetings"
                active={activeTab === "meetings"}
                onClick={() => {
                  setActiveTab("meetings");
                  setMobileMenuOpen(false);
                }}
              />
            </div>
          )}
        </div>
      </nav>

      <main className="h-[calc(100vh-4rem)]">
        {activeTab === "messages" && <ChatInterface />}

        {activeTab === "team" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-teal-900 mb-6">Team</h1>
            <div className="bg-white rounded-2xl shadow-lg border-2 border-teal-200 p-8">
              <p className="text-teal-700">Team management coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === "files" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-teal-900 mb-6">Files</h1>
            <div className="bg-white rounded-2xl shadow-lg border-2 border-teal-200 p-8">
              <p className="text-teal-700">File management coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === "meetings" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-teal-900 mb-6">Meetings</h1>
            <div className="bg-white rounded-2xl shadow-lg border-2 border-teal-200 p-8">
              <p className="text-teal-700">Meetings schedule coming soon...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const NavLink = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
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

const MobileNavLink = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
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
