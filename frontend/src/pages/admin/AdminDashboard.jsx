import { useState } from "react";
import {
  Users,
  UserPlus,
  LayoutDashboard,
  MessageSquare,
  Video,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
  Key,
} from "lucide-react";
import CreateEmployeePage from "./CreateEmployeePage";
import { useNavigate } from "react-router-dom";
import AllEmployees from "./AllEmployees";
import Dashboard from "./Dashboard";
import AdminProfilePage from "./AdminProfilePage";
import AdminChangePasswordPage from "./AdminChangePasswordPage";
import ChatInterface from "../../components/ChatInterface";
import { useAuthContext } from "../../context/AuthContextProvider";

export default function AdminDashboard() {
  const { socket } = useAuthContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminData");
    localStorage.removeItem("user");
    navigate("/adminLogin");
  };

  const handleNavigation = (page) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
  };

  const menuItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "employees", icon: Users, label: "Employees" },
    { id: "create-employee", icon: UserPlus, label: "Create Employee" },
    { id: "messages", icon: MessageSquare, label: "Messages" },
    { id: "meetings", icon: Video, label: "Meetings" },
    { id: "profile", icon: User, label: "Profile" },
  ];

  const renderPageContent = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "employees":
        return <AllEmployees />;
      case "create-employee":
        return <CreateEmployeePage />;
      case "messages":
        return <ChatInterface />;
      case "meetings":
        return (
          <div className="p-6 lg:p-8 max-w-5xl mx-auto">
            <h1 className="text-xl font-semibold text-white mb-1">Meetings</h1>
            <p className="text-sm text-slate-400 mb-6">Schedule and manage meetings</p>
            <div className="bg-slate-900 rounded-xl border border-slate-700/50 p-12 text-center">
              <Video className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Meeting scheduler coming soon...</p>
            </div>
          </div>
        );
      case "profile":
        return <AdminProfilePage onNavigate={handleNavigation} />;
      case "change-password":
        return <AdminChangePasswordPage onNavigate={handleNavigation} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar - Desktop */}
      <aside
        className={`hidden lg:flex flex-col bg-slate-900 border-r border-slate-700/50 transition-all duration-200 ${
          sidebarCollapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-slate-700/50 gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">EP</span>
          </div>
          {!sidebarCollapsed && (
            <span className="text-sm font-semibold text-white truncate">
              Admin Portal
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-2 border-t border-slate-700/50">
          <button
            onClick={() => handleNavigation("profile")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors ${sidebarCollapsed ? "justify-center" : ""}`}
            title="View Profile"
          >
            <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-400 font-semibold text-xs">AD</span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-white truncate">Admin</p>
                <p className="text-xs text-slate-500 truncate">View profile</p>
              </div>
            )}
          </button>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
            title="Logout"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar - Mobile */}
        <header className="lg:hidden h-14 bg-slate-900 border-b border-slate-700/50 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">EP</span>
            </div>
            <span className="text-sm font-semibold text-white">Admin</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </header>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900 border-b border-slate-700/50 p-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {renderPageContent()}
        </main>
      </div>
    </div>
  );
}
