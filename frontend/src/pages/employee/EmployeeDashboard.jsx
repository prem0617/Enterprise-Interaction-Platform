import { useState, useEffect } from "react";
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
  Menu,
  X,
  Building2,
  Calendar,
  Clock,
  PenTool,
  ChevronDown,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Whiteboard from "../admin/Whiteboard";

const navItems = [
  { id: "home", icon: Home, label: "Home" },
  { id: "messages", icon: MessageSquare, label: "Messages", badge: "5" },
  { id: "team", icon: Users, label: "Team" },
  { id: "files", icon: FileText, label: "Files" },
  { id: "meetings", icon: Video, label: "Meetings", badge: "2" },
  { id: "whiteboard", icon: PenTool, label: "Whiteboard" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export default function EmployeeDashboard() {
  const [activeNav, setActiveNav] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const data = localStorage.getItem("userData");
    if (data) setUserData(JSON.parse(data));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userData");
    navigate("/login");
  };

  const initials = `${userData?.first_name?.[0] || ""}${userData?.last_name?.[0] || ""}`.toUpperCase() || "U";
  const fullName = `${userData?.first_name || ""} ${userData?.last_name || ""}`.trim() || "User";

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
            <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-sm">Enterprise</h1>
              <p className="text-xs text-gray-500">Workspace</p>
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
                setActiveNav(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeNav === item.id 
                  ? "bg-emerald-600 text-white" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <Badge variant={activeNav === item.id ? "secondary" : "default"} className="h-5 px-1.5 text-xs">
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
              <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fullName}</p>
              <p className="text-xs text-gray-500 truncate">{userData?.email}</p>
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
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-medium">{fullName}</p>
                  <p className="text-xs text-gray-500 font-normal">{userData?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveNav("settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
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
          {activeNav === "home" && <HomePage userData={userData} />}
          {activeNav === "whiteboard" && <Whiteboard embedded={true} />}
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
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

  const messages = [
    { name: "Sarah Connor", message: "Can you review the latest design?", time: "2m", unread: true },
    { name: "John Smith", message: "Meeting rescheduled to 3pm", time: "15m", unread: true },
    { name: "Emily Davis", message: "Thanks for your help!", time: "1h", unread: false },
  ];

  const meetings = [
    { title: "Team Standup", time: "9:00 AM", duration: "30 min" },
    { title: "Project Review", time: "11:30 AM", duration: "1 hr" },
    { title: "Client Call", time: "2:00 PM", duration: "45 min" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-gray-500 text-sm">{greeting} 👋</p>
          <h1 className="text-2xl font-bold mt-1">{userData?.first_name || "Welcome"}</h1>
        </div>
        <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Calendar className="h-4 w-4" />
          View Calendar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Messages", value: "5", icon: MessageSquare, color: "bg-blue-500" },
          { label: "Team", value: "12", icon: Users, color: "bg-emerald-500" },
          { label: "Tasks", value: "8", icon: FileText, color: "bg-amber-500" },
          { label: "Meetings", value: "3", icon: Video, color: "bg-violet-500" },
        ].map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Messages */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">Messages</CardTitle>
              <CardDescription>Recent conversations</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-emerald-600">
              View all <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 text-xs">
                      {msg.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate group-hover:text-emerald-600 transition-colors">
                        {msg.name}
                      </p>
                      {msg.unread && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{msg.message}</p>
                  </div>
                  <span className="text-xs text-gray-400">{msg.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Meetings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">Today's Meetings</CardTitle>
              <CardDescription>Scheduled calls</CardDescription>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">3 today</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {meetings.map((meeting, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between p-3 rounded-lg border hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                      <Video className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{meeting.title}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {meeting.time} • {meeting.duration}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">Join</Button>
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
