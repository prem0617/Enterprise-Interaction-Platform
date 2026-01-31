import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  LayoutDashboard,
  MessageSquare,
  Video,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import CreateEmployeePage from "./CreateEmployeePage";
import { useNavigate } from "react-router-dom";
import AllEmployees from "./AllEmployees";
import Dashboard from "./Dashboard";
import ChatInterface from "../../components/ChatInterface";
import { useAuthContext } from "../../context/AuthContextProvider";

export default function AdminDashboard() {
  const { socket } = useAuthContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminData");
    navigate("/adminLogin");
  };

  const handleNavigation = (page) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
    console.log(`Navigation triggered to: /admin/${page}`);
    console.log(
      `In your app, replace setCurrentPage with: navigate('/admin/${page}')`
    );
  };

  const menuItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "employees", icon: Users, label: "Employees" },
    { id: "create-employee", icon: UserPlus, label: "Create Employee" },
    { id: "messages", icon: MessageSquare, label: "Messages" },
    { id: "meetings", icon: Video, label: "Meetings" },
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
        return (
          <ChatInterface />
          // <div>
          /* <h1 className="text-3xl font-bold text-teal-900 mb-6">Messages</h1> */
          /* <div className="bg-white rounded-2xl border-2 border-teal-200 p-8"> */
          /* <p className="text-teal-700 text-lg"> */

          /* </p> */
          /* </div> */
          // </div>
        );

      case "meetings":
        return (
          <div>
            <h1 className="text-3xl font-bold text-teal-900 mb-6">Meetings</h1>
            <div className="bg-white rounded-2xl border-2 border-teal-200 p-8">
              <p className="text-teal-700 text-lg">
                Meeting scheduler goes here...
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      <nav className="sticky top-0 z-50 bg-white border-b-2 border-teal-200 shadow-lg">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="text-xl font-bold text-teal-900 w-full">
              Admin Portal
            </div>

            <div className="hidden lg:flex items-center gap-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md"
                        : "text-teal-700 hover:bg-teal-50 hover:text-cyan-600"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 ml-32">
              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-teal-50 rounded-xl">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                  AD
                </div>
                <span className="text-sm font-medium text-teal-900">Admin</span>
              </div>

              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-teal-600 hover:bg-teal-50 rounded-xl"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t-2 border-teal-200 bg-white">
            <div className="px-4 py-4 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md"
                        : "text-teal-700 hover:bg-teal-50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
              <div className="pt-4 border-t-2 border-teal-200">
                <div className="flex items-center gap-3 px-4 py-3 bg-teal-50 rounded-xl mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                    AD
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-teal-900">
                      Admin User
                    </p>
                    <p className="text-xs text-teal-600">admin@company.com</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main
      // className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {renderPageContent()}
      </main>
    </div>
  );
}
