import { useState } from "react";
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
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  PenTool
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navItems = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", badge: null },
  { id: "employees", icon: Users, label: "Employees", badge: null },
  { id: "messages", icon: MessageSquare, label: "Messages", badge: "3" },
  { id: "meetings", icon: Video, label: "Meetings", badge: null },
  { id: "whiteboard", icon: PenTool, label: "Whiteboard", badge: null },
];

export default function AdminDashboard() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminData");
    navigate("/adminLogin");
  };

  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "employees":
        return <AllEmployees />;
      case "messages":
        return <PlaceholderPage title="Messages" description="Internal messaging system" icon={MessageSquare} />;
      case "meetings":
        return <PlaceholderPage title="Meetings" description="Video conferencing module" icon={Video} />;
      case "whiteboard":
        return <Whiteboard />;
      case "settings":
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full z-40 bg-card border-r flex flex-col transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "w-[70px]" : "w-64"
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            {!sidebarCollapsed && (
              <div className="animate-fade-in">
                <p className="font-semibold text-sm">Enterprise</p>
                <p className="text-xs text-muted-foreground">Admin Portal</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                currentPage === item.id 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${
                currentPage !== item.id ? "group-hover:scale-110" : ""
              }`} />
              {!sidebarCollapsed && (
                <span className="flex-1 text-left animate-fade-in">{item.label}</span>
              )}
              {!sidebarCollapsed && item.badge && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs animate-fade-in">
                  {item.badge}
                </Badge>
              )}
              {sidebarCollapsed && item.badge && (
                <span className="absolute left-12 h-2 w-2 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </nav>

        <Separator />

        {/* Settings */}
        <div className="p-3">
          <button
            onClick={() => setCurrentPage("settings")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentPage === "settings" 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title={sidebarCollapsed ? "Settings" : undefined}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="animate-fade-in">Settings</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <div className="p-3 border-t">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5" />
                <span className="animate-fade-in">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ease-in-out ${sidebarCollapsed ? "ml-[70px]" : "ml-64"}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-md border-b flex items-center justify-between px-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search anything..." 
                className="pl-9 bg-muted/50 border-0 focus-visible:bg-background transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
            </Button>
            <Separator orientation="vertical" className="h-8 mx-2" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-3 pl-2 pr-3">
                  <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      AD
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium leading-none">Admin</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Super Admin</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">Administrator</p>
                    <p className="text-xs text-muted-foreground">admin@company.com</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentPage("settings")}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 animate-fade-in">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

function PlaceholderPage({ title, description, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-1">{title}</h2>
      <p className="text-muted-foreground text-sm">{description}</p>
      <Badge variant="secondary" className="mt-4">Coming Soon</Badge>
    </div>
  );
}
