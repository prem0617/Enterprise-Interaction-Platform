import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Home,
  MessageSquare,
  Users,
  FileText,
  Video,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import EmployeeHome from "@/components/EmployeeHome";
import ChatInterface from "@/components/ChatInterface";
import MeetingModule from "@/components/MeetingModule";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function EmployeeDashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [searchParams] = useSearchParams();
  const userData = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (searchParams.get("joinCode")) {
      setActiveTab("meetings");
    }
  }, [searchParams]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("adminData");
    window.location.href = "/login";
  };

  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "messages", icon: MessageSquare, label: "Messages" },
    { id: "team", icon: Users, label: "Team" },
    { id: "files", icon: FileText, label: "Files" },
    { id: "meetings", icon: Video, label: "Meetings" },
  ];

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">EP</span>
              </div>
              <span className="text-sm font-semibold hidden sm:block">
                Enterprise Platform
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                    onClick={() => setActiveTab(item.id)}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <Avatar className="size-7">
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {userData?.first_name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium">
                      {userData?.first_name || "User"}
                    </span>
                    <ChevronDown className="size-3.5 text-muted-foreground hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium truncate">
                      {userData?.first_name} {userData?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{userData?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => (window.location.href = "/profile")}>
                    <User className="size-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </Button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border py-2 space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn("w-full justify-start gap-3")}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      <main className="flex-1 overflow-hidden">
        {activeTab === "home" && <EmployeeHome onNavigate={setActiveTab} />}
        {activeTab === "messages" && <ChatInterface />}

        {activeTab === "team" && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-xl font-semibold mb-1">Team</h1>
            <p className="text-sm text-muted-foreground mb-6">Manage your team members</p>
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Users className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Team management coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === "files" && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-xl font-semibold mb-1">Files</h1>
            <p className="text-sm text-muted-foreground mb-6">Manage shared files</p>
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <FileText className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">File management coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === "meetings" && <MeetingModule />}
      </main>
    </div>
  );
}
