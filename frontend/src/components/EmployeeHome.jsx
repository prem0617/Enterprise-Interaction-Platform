import { useState, useEffect } from "react";
import axios from "axios";
import {
  MessageSquare,
  Video,
  Users,
  FileText,
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Bell,
  Zap,
  Shield,
  Headphones,
  LogIn,
  LogOut,
  CalendarCheck,
  Building2,
  Laptop2,
  Home as HomeIcon,
} from "lucide-react";
import { BACKEND_URL } from "../../config";
import { toast } from "sonner";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function EmployeeHome({ onNavigate }) {
  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  const firstName = userData?.first_name || "there";
  const department = userData?.employee?.department?.name || userData?.employee?.department || "";
  const position = userData?.employee?.position || "";
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // ─── Attendance state ───
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [selectedWorkType, setSelectedWorkType] = useState("office");
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const fetchTodayAttendance = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/attendance/today`, { headers });
      setTodayAttendance(res.data.attendance);
    } catch {
      setTodayAttendance(null);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/attendance/check-in`, { work_type: selectedWorkType }, { headers });
      toast.success("Checked in successfully!");
      setTodayAttendance(res.data.attendance);
    } catch (err) {
      toast.error(err.response?.data?.error || "Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/attendance/check-out`, {}, { headers });
      toast.success(`Checked out! Total: ${res.data.attendance.total_hours}h`);
      setTodayAttendance(res.data.attendance);
    } catch (err) {
      toast.error(err.response?.data?.error || "Check-out failed");
    } finally {
      setCheckingOut(false);
    }
  };

  const hasCheckedIn = !!todayAttendance?.check_in;
  const hasCheckedOut = !!todayAttendance?.check_out;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchUpcomingMeetings();
    fetchTodayAttendance();
  }, []);

  const fetchUpcomingMeetings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/meetings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const now = new Date();
      const upcoming = (res.data.data || [])
        .filter(
          (m) => m.status === "scheduled" && new Date(m.scheduled_at) > now
        )
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
        .slice(0, 3);
      setUpcomingMeetings(upcoming);
    } catch {
      // silently fail
    }
  };

  const quickActions = [
    {
      id: "attendance",
      icon: CalendarCheck,
      label: "Attendance",
      description: "Check in & manage leaves",
      color: "from-indigo-500/20 to-indigo-600/10",
      iconColor: "text-indigo-400",
      borderColor: "border-indigo-500/20",
    },
    {
      id: "messages",
      icon: MessageSquare,
      label: "Messages",
      description: "Chat with your team",
      color: "from-blue-500/20 to-blue-600/10",
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/20",
    },
    {
      id: "meetings",
      icon: Video,
      label: "Meetings",
      description: "Schedule or join a call",
      color: "from-violet-500/20 to-violet-600/10",
      iconColor: "text-violet-400",
      borderColor: "border-violet-500/20",
    },
    {
      id: "team",
      icon: Users,
      label: "Team",
      description: "View your team members",
      color: "from-emerald-500/20 to-emerald-600/10",
      iconColor: "text-emerald-400",
      borderColor: "border-emerald-500/20",
    },
    {
      id: "files",
      icon: FileText,
      label: "Files",
      description: "Access shared documents",
      color: "from-amber-500/20 to-amber-600/10",
      iconColor: "text-amber-400",
      borderColor: "border-amber-500/20",
    },
  ];

  const platformFeatures = [
    {
      icon: Zap,
      title: "Real-time Messaging",
      desc: "Instant communication with your team through direct and group chats.",
      color: "text-yellow-400",
    },
    {
      icon: Video,
      title: "Video Conferencing",
      desc: "HD video calls with screen sharing, hand raise, and more.",
      color: "text-indigo-400",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      desc: "Enterprise-grade security with encrypted communications.",
      color: "text-emerald-400",
    },
    {
      icon: Headphones,
      title: "Audio Calls",
      desc: "Crystal-clear voice calls for quick one-on-one or group conversations.",
      color: "text-pink-400",
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Greeting */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800/50 p-6 sm:p-8">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
              <Calendar className="size-3.5" />
              <span>{getFormattedDate()}</span>
              <span className="text-zinc-700">•</span>
              <Clock className="size-3.5" />
              <span>
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1.5">
              {getGreeting()},{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
                {firstName}
              </span>
              <span className="inline-block ml-2 animate-[wave_2s_ease-in-out_infinite]">
                👋
              </span>
            </h1>

            <p className="text-sm text-zinc-400 max-w-lg">
              Welcome back to your workspace. Let's make today productive!
            </p>

            {(department || position) && (
              <div className="flex items-center gap-2 mt-3">
                {position && (
                  <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium border border-indigo-500/20">
                    {position}
                  </span>
                )}
                {department && (
                  <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium border border-zinc-700/50">
                    {department}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Check-In Widget */}
        <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800/50 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`size-12 rounded-xl flex items-center justify-center ${
                hasCheckedOut ? "bg-emerald-500/15" : hasCheckedIn ? "bg-amber-500/15" : "bg-indigo-500/15"
              }`}>
                {hasCheckedOut ? (
                  <CheckCircle2 className="size-6 text-emerald-400" />
                ) : hasCheckedIn ? (
                  <Clock className="size-6 text-amber-400" />
                ) : (
                  <CalendarCheck className="size-6 text-indigo-400" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  {attendanceLoading
                    ? "Loading..."
                    : hasCheckedOut
                    ? "Day Complete"
                    : hasCheckedIn
                    ? "You're clocked in"
                    : "You haven't clocked in yet"}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {hasCheckedIn && todayAttendance?.check_in
                    ? `Checked in at ${new Date(todayAttendance.check_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}${todayAttendance.work_type === "wfh" ? " · Work from Home" : todayAttendance.work_type === "hybrid" ? " · Hybrid" : " · Office"}`
                    : hasCheckedOut
                    ? `${todayAttendance?.total_hours || 0}h logged today`
                    : "Start your day by checking in"}
                </p>
              </div>
            </div>

            {!attendanceLoading && (
              <div className="flex items-center gap-2">
                {!hasCheckedIn && (
                  <>
                    {/* Work type selector */}
                    <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
                      {[
                        { value: "office", icon: Building2, tip: "Office" },
                        { value: "wfh", icon: Laptop2, tip: "WFH" },
                        { value: "hybrid", icon: HomeIcon, tip: "Hybrid" },
                      ].map((wt) => {
                        const WtIcon = wt.icon;
                        return (
                          <button
                            key={wt.value}
                            title={wt.tip}
                            onClick={() => setSelectedWorkType(wt.value)}
                            className={`px-3 py-2 transition-colors ${
                              selectedWorkType === wt.value
                                ? "bg-indigo-500/20 text-indigo-300"
                                : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            <WtIcon className="size-4" />
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={handleCheckIn}
                      disabled={checkingIn}
                      className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <LogIn className="size-4" />
                      {checkingIn ? "Checking In..." : "Check In"}
                    </button>
                  </>
                )}

                {hasCheckedIn && !hasCheckedOut && (
                  <button
                    onClick={handleCheckOut}
                    disabled={checkingOut}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <LogOut className="size-4" />
                    {checkingOut ? "Checking Out..." : "Check Out"}
                  </button>
                )}

                {hasCheckedOut && (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium">
                    <CheckCircle2 className="size-4" />
                    {todayAttendance?.total_hours || 0}h logged
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="size-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-300">
              Quick Actions
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => onNavigate(action.id)}
                  className={`group relative rounded-xl border ${action.borderColor} bg-gradient-to-br ${action.color} p-4 text-left transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 active:scale-[0.98]`}
                >
                  <div
                    className={`size-10 rounded-lg bg-zinc-900/80 flex items-center justify-center mb-3 ${action.iconColor}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <p className="text-sm font-semibold text-white mb-0.5">
                    {action.label}
                  </p>
                  <p className="text-xs text-zinc-400">{action.description}</p>
                  <ArrowRight className="absolute top-4 right-4 size-4 text-zinc-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle Row: Upcoming Meetings + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Upcoming Meetings */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-zinc-300">
                  Upcoming Meetings
                </h3>
              </div>
              <button
                onClick={() => onNavigate("meetings")}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                View all <ArrowRight className="size-3" />
              </button>
            </div>

            {upcomingMeetings.length === 0 ? (
              <div className="text-center py-6">
                <Video className="size-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">
                  No upcoming meetings scheduled
                </p>
                <button
                  onClick={() => onNavigate("meetings")}
                  className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Schedule one →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingMeetings.map((m) => {
                  const d = new Date(m.scheduled_at);
                  return (
                    <div
                      key={m._id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/30 hover:bg-zinc-800 transition-colors"
                    >
                      <div className="size-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                        <Video className="size-4 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {m.title}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {d.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          at{" "}
                          {d.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {m.duration_minutes
                            ? ` · ${m.duration_minutes}min`
                            : ""}
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                        Upcoming
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Getting Started / Tips */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="size-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-zinc-300">
                Getting Started
              </h3>
            </div>
            <div className="space-y-3">
              {[
                {
                  text: "Send your first message",
                  action: "messages",
                  done: true,
                },
                {
                  text: "Join or schedule a meeting",
                  action: "meetings",
                  done: false,
                },
                {
                  text: "Complete your profile",
                  action: "profile",
                  done: false,
                },
                {
                  text: "Explore team directory",
                  action: "team",
                  done: false,
                },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() =>
                    item.action === "profile"
                      ? (window.location.href = "/profile")
                      : onNavigate(item.action)
                  }
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/20 hover:bg-zinc-800/70 transition-colors text-left group"
                >
                  <CheckCircle2
                    className={`size-4 flex-shrink-0 ${
                      item.done
                        ? "text-emerald-400"
                        : "text-zinc-600 group-hover:text-zinc-400"
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      item.done ? "text-zinc-500 line-through" : "text-zinc-300"
                    }`}
                  >
                    {item.text}
                  </span>
                  <ArrowRight className="size-3.5 text-zinc-700 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Platform Features */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="size-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-300">
              Platform Features
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {platformFeatures.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4 hover:bg-zinc-900/60 transition-colors"
                >
                  <Icon className={`size-5 ${f.color} mb-3`} />
                  <p className="text-sm font-medium text-white mb-1">
                    {f.title}
                  </p>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-4">
          <p className="text-xs text-zinc-600">
            Enterprise Interaction Platform · Built for teams that move fast
          </p>
        </div>
      </div>
    </div>
  );
}
