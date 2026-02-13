import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  LayoutDashboard,
  MessageSquare,
  Video,
  LogOut,
  Menu,
  X,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import EmployeeManagement from "./EmployeeManagement";
import Dashboard from "./Dashboard";
import AdminProfilePage from "./AdminProfilePage";
import AdminChangePasswordPage from "./AdminChangePasswordPage";
import ChatInterface from "@/components/ChatInterface";
import MeetingModule from "@/components/MeetingModule";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("joinCode")) {
      setCurrentPage("meetings");
    }
  }, [searchParams]);

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
    { id: "employees", icon: Users, label: "Employee Management" },
    { id: "messages", icon: MessageSquare, label: "Messages" },
    { id: "meetings", icon: Video, label: "Meetings" },
    { id: "profile", icon: User, label: "Profile" },
  ];

  const renderPageContent = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "employees":
        return <EmployeeManagement />;
      case "messages":
        return <ChatInterface />;
      case "meetings":
        return <MeetingModule />;
      case "profile":
        return <AdminProfilePage onNavigate={handleNavigation} />;
      case "change-password":
        return <AdminChangePasswordPage onNavigate={handleNavigation} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-card border-r border-border transition-all duration-200",
          sidebarCollapsed ? "w-16" : "w-60"
        )}
      >
        <div className="h-14 flex items-center px-4 border-b border-border gap-3">
          <div className="size-8 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground font-semibold text-xs">EP</span>
          </div>
          {!sidebarCollapsed && (
            <span className="text-sm font-semibold truncate">Admin Portal</span>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  sidebarCollapsed && "justify-center px-0"
                )}
                onClick={() => handleNavigation(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="size-4 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Button>
            );
          })}
        </nav>

        <Separator />
        <div className="p-2 space-y-0.5">
          <Button
            variant="ghost"
            className={cn("w-full justify-start gap-3", sidebarCollapsed && "justify-center px-0")}
            onClick={() => handleNavigation("profile")}
            title="View Profile"
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">AD</AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">Admin</p>
                <p className="text-xs text-muted-foreground truncate">View profile</p>
              </div>
            )}
          </Button>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
              sidebarCollapsed && "justify-center px-0"
            )}
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut className="size-4 flex-shrink-0" />
            {!sidebarCollapsed && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar - Mobile */}
        <header className="lg:hidden h-14 bg-card border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-semibold text-xs">EP</span>
            </div>
            <span className="text-sm font-semibold">Admin</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-card border-b border-border p-2 space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3"
                  onClick={() => handleNavigation(item.id)}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </Button>
              );
            })}
          </div>
        )}

        <main className="flex-1 overflow-auto">{renderPageContent()}</main>
      </div>
    </div>
  );
}
