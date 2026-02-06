import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  LayoutDashboard, 
  MessageSquare, 
  Video, 
  LogOut, 
  Settings,
  Bell,
  Search,
  ChevronDown,
  Menu,
  X,
  PenTool,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AllEmployees from "./AllEmployees";
import Dashboard from "./Dashboard";
import SettingsPage from "./SettingsPage";
import Whiteboard from "./Whiteboard";
import MeetingsPage from "./MeetingsPage";
import MessagesPage from "./MessagesPage";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navItems = [
  { id: "dashboard", icon: LayoutDashboard, label: "Overview" },
  { id: "employees", icon: Users, label: "Team" },
  { id: "messages", icon: MessageSquare, label: "Messages", badge: "3" },
  { id: "meetings", icon: Video, label: "Meetings" },
  { id: "whiteboard", icon: PenTool, label: "Whiteboard" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export default function AdminDashboard() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const data = localStorage.getItem("adminData");
    if (data) setAdminData(JSON.parse(data));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminData");
    navigate("/adminLogin");
  };

  const adminName = adminData?.first_name 
    ? `${adminData.first_name} ${adminData.last_name || ''}` 
    : "Admin";
  const adminInitials = adminName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const renderContent = () => {
    switch (currentPage) {
      case "dashboard": return <Dashboard onNavigate={setCurrentPage} />;
      case "employees": return <AllEmployees />;
      case "messages": return <MessagesPage />;
      case "meetings": return <MeetingsPage />;
      case "whiteboard": return <Whiteboard embedded={true} />;
      case "settings": return <SettingsPage />;
      default: return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-gray-950">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-violet-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-sm">Enterprise</h1>
              <p className="text-xs text-gray-500">Admin Portal</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="lg:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentPage === item.id 
                  ? "bg-violet-600 text-white" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <Badge variant={currentPage === item.id ? "secondary" : "default"} className="h-5 px-1.5 text-xs">
                  {item.badge}
                </Badge>
              )}
            </button>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 text-xs font-semibold">
                {adminInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{adminName}</p>
              <p className="text-xs text-gray-500 truncate">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {/* Search */}
            <div className="hidden sm:block relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search..." 
                className="w-64 pl-9 h-9 bg-gray-100 dark:bg-gray-800 border-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 h-9 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 text-xs font-semibold">
                      {adminInitials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-medium">{adminName}</p>
                  <p className="text-xs text-gray-500 font-normal">{adminData?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentPage("settings")}>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

function PlaceholderPage({ title, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="h-20 w-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
        <Icon className="h-10 w-10 text-gray-400" />
      </div>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-gray-500 mb-6">This feature is coming soon</p>
      <Badge>Coming Soon</Badge>
    </div>
  );
}
