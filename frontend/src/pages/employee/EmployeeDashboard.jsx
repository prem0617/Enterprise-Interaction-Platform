import React, { useState } from "react";
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
} from "lucide-react";
import ChatInterface from "../../components/ChatInterface";
import MeetingModule from "../../components/MeetingModule";

const EmployeeDashboard = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("messages");

  const userData = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("adminData");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-slate-900 border-b border-slate-700/50 sticky top-0 z-50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">EP</span>
              </div>
              <span className="text-sm font-semibold text-white hidden sm:block">
                Enterprise Platform
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
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

            {/* User menu */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <div className="w-7 h-7 bg-indigo-500/20 rounded-full flex items-center justify-center">
                    <span className="text-indigo-400 font-semibold text-xs">
                      {userData?.first_name?.[0] || "U"}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-300 hidden sm:block">
                    {userData?.first_name || "User"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-1 w-52 bg-slate-800 rounded-xl border border-slate-700/50 shadow-lg shadow-black/30 py-1 z-50">
                      <div className="px-3 py-2.5 border-b border-slate-700/30">
                        <p className="text-sm font-medium text-white truncate">
                          {userData?.first_name} {userData?.last_name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{userData?.email}</p>
                      </div>
                      <button
                        onClick={() => { window.location.href = "/profile"; setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                      >
                        <User className="w-4 h-4 text-slate-500" />
                        My Profile
                      </button>
                      <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors">
                        <Settings className="w-4 h-4 text-slate-500" />
                        Settings
                      </button>
                      <div className="border-t border-slate-700/30 mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-400 hover:bg-slate-800 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-700/50 py-2 space-y-0.5">
              <MobileNavLink icon={MessageSquare} label="Messages" active={activeTab === "messages"} onClick={() => { setActiveTab("messages"); setMobileMenuOpen(false); }} />
              <MobileNavLink icon={Users} label="Team" active={activeTab === "team"} onClick={() => { setActiveTab("team"); setMobileMenuOpen(false); }} />
              <MobileNavLink icon={FileText} label="Files" active={activeTab === "files"} onClick={() => { setActiveTab("files"); setMobileMenuOpen(false); }} />
              <MobileNavLink icon={Video} label="Meetings" active={activeTab === "meetings"} onClick={() => { setActiveTab("meetings"); setMobileMenuOpen(false); }} />
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 h-[calc(100vh-3.5rem)]">
        {activeTab === "messages" && <ChatInterface />}

        {activeTab === "team" && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-xl font-semibold text-white mb-1">Team</h1>
            <p className="text-sm text-slate-400 mb-6">Manage your team members</p>
            <div className="bg-slate-900 rounded-xl border border-slate-700/50 p-12 text-center">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Team management coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === "files" && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-xl font-semibold text-white mb-1">Files</h1>
            <p className="text-sm text-slate-400 mb-6">Manage shared files</p>
            <div className="bg-slate-900 rounded-xl border border-slate-700/50 p-12 text-center">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">File management coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === "meetings" && <MeetingModule />}
      </main>
    </div>
  );
};

const NavLink = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-slate-800 text-white"
        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
    }`}
  >
    <Icon className="w-4 h-4" />
    <span>{label}</span>
  </button>
);

const MobileNavLink = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-slate-800 text-white"
        : "text-slate-400 hover:bg-slate-800/50"
    }`}
  >
    <Icon className="w-4 h-4" />
    <span>{label}</span>
  </button>
);

export default EmployeeDashboard;
