import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  MessageSquare, 
  Users, 
  FileText, 
  Video, 
  User, 
  Settings, 
  LogOut, 
  Bell,
  Search,
  Home,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Calendar,
  Clock,
  PenTool
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Whiteboard from "../admin/Whiteboard";

const navItems = [
  { id: "home", icon: Home, label: "Home", badge: null },
  { id: "messages", icon: MessageSquare, label: "Messages", badge: "5" },
  { id: "team", icon: Users, label: "Team", badge: null },
  { id: "files", icon: FileText, label: "Files", badge: null },
  { id: "meetings", icon: Video, label: "Meetings", badge: "2" },
  { id: "whiteboard", icon: PenTool, label: "Whiteboard", badge: null },
];

export default function EmployeeDashboard() {
  const [activeNav, setActiveNav] = useState("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const initials = `${userData?.first_name?.[0] || ""}${userData?.last_name?.[0] || ""}`.toUpperCase() || "U";
  const fullName = `${userData?.first_name || ""} ${userData?.last_name || ""}`.trim() || "User";

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
                <p className="text-xs text-muted-foreground">Workspace</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                activeNav === item.id 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${
                activeNav !== item.id ? "group-hover:scale-110" : ""
              }`} />
              {!sidebarCollapsed && (
                <span className="flex-1 text-left animate-fade-in">{item.label}</span>
              )}
              {!sidebarCollapsed && item.badge && (
                <Badge variant={activeNav === item.id ? "secondary" : "default"} className="h-5 px-1.5 text-xs animate-fade-in">
                  {item.badge}
                </Badge>
              )}
              {sidebarCollapsed && item.badge && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <Separator />

        {/* Settings */}
        <div className="p-3">
          <button
            onClick={() => navigate("/profile")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted"
            title={sidebarCollapsed ? "Profile" : undefined}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="animate-fade-in">Settings</span>}
          </button>
        </div>

        {/* Collapse */}
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

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ease-in-out ${sidebarCollapsed ? "ml-[70px]" : "ml-64"}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-md border-b flex items-center justify-between px-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
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
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium leading-none">{fullName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{userData?.email}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{fullName}</p>
                    <p className="text-xs text-muted-foreground">{userData?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
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
          {activeNav === "home" && <HomePage userData={userData} />}
          {activeNav === "whiteboard" && <Whiteboard />}
          {activeNav !== "home" && activeNav !== "whiteboard" && (
            <PlaceholderPage 
              title={navItems.find(i => i.id === activeNav)?.label || ""} 
              icon={navItems.find(i => i.id === activeNav)?.icon || Home}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function HomePage({ userData }) {
  const stats = [
    { label: "Channels", value: "5", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { label: "Team Members", value: "12", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { label: "Active Tasks", value: "8", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
    { label: "Meetings Today", value: "3", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  ];

  const messages = [
    { name: "Sarah Connor", message: "Can you review the latest design?", time: "2m ago", unread: true },
    { name: "John Smith", message: "Meeting rescheduled to 3pm", time: "15m ago", unread: true },
    { name: "Emily Davis", message: "Thanks for your help!", time: "1h ago", unread: false },
  ];

  const meetings = [
    { title: "Team Standup", time: "9:00 AM", duration: "30 min" },
    { title: "Project Review", time: "11:30 AM", duration: "1 hr" },
    { title: "Client Call", time: "2:00 PM", duration: "45 min" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Good morning, {userData?.first_name || "User"} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Here's what's happening today</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="h-4 w-4" />
          View Calendar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={stat.label} className="group hover:shadow-md transition-all duration-300">
            <CardContent className="p-5">
              <div className={`h-10 w-10 rounded-xl ${stat.color} flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110`}>
                <span className="text-lg font-bold">{stat.value}</span>
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Messages */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Recent Messages</CardTitle>
              <CardDescription>Your latest conversations</CardDescription>
            </div>
            <Badge variant="secondary">5 new</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <Avatar className="h-9 w-9 ring-2 ring-background">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {msg.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {msg.name}
                      </p>
                      {msg.unread && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{msg.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{msg.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Meetings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Today's Meetings</CardTitle>
              <CardDescription>Your scheduled calls</CardDescription>
            </div>
            <Badge variant="secondary">3 today</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {meetings.map((meeting, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Video className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{meeting.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {meeting.time} • {meeting.duration}
                      </div>
                    </div>
                  </div>
                  <Button size="sm">Join</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PlaceholderPage({ title, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-1">{title}</h2>
      <p className="text-muted-foreground text-sm">This feature is coming soon</p>
      <Badge variant="secondary" className="mt-4">Coming Soon</Badge>
    </div>
  );
}
