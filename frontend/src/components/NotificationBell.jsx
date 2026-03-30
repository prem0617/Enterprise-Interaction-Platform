import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Bell, Check, CheckCheck, MessageSquare, Video, Phone, Calendar,
  Users, Shield, Clock, Ticket, UserPlus, Megaphone,
  Trash2, X, Loader2, Smartphone
} from "lucide-react";
import { BACKEND_URL } from "../../config";
import { useAuthContext } from "@/context/AuthContextProvider";
import { toast } from "sonner";
import {
  isWebPushSupported,
  enableWebPush,
  disableWebPush,
  restoreWebPush,
  getLocalPushSubscription,
} from "@/lib/webPushClient";

const PRIORITY_STYLES = {
  urgent: "border-l-red-500 bg-red-500/5",
  high: "border-l-orange-500 bg-orange-500/5",
  medium: "border-l-blue-500 bg-blue-500/5",
  low: "border-l-zinc-500 bg-zinc-500/5",
};

const TYPE_ICONS = {
  message: MessageSquare,
  mention: MessageSquare,
  channel_invite: Users,
  channel_removed: Users,
  role_change: Shield,
  meeting_created: Calendar,
  meeting_reminder: Clock,
  meeting_cancelled: Calendar,
  meeting_started: Video,
  call_missed: Phone,
  leave_approved: Check,
  leave_rejected: X,
  leave_requested: Clock,
  ticket_message: Ticket,
  ticket_assigned: Ticket,
  employee_added: UserPlus,
  attendance_late: Clock,
  group_call: Phone,
  system: Megaphone,
};

const TYPE_COLORS = {
  message: "text-blue-400",
  mention: "text-cyan-400",
  channel_invite: "text-indigo-400",
  channel_removed: "text-red-400",
  role_change: "text-violet-400",
  meeting_created: "text-emerald-400",
  meeting_reminder: "text-amber-400",
  meeting_cancelled: "text-red-400",
  meeting_started: "text-emerald-400",
  call_missed: "text-red-400",
  leave_approved: "text-emerald-400",
  leave_rejected: "text-red-400",
  leave_requested: "text-amber-400",
  ticket_message: "text-orange-400",
  ticket_assigned: "text-orange-400",
  employee_added: "text-indigo-400",
  attendance_late: "text-amber-400",
  group_call: "text-emerald-400",
  system: "text-zinc-400",
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationBell() {
  const { socket } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const dropdownRef = useRef(null);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem("token")}` }), []);

  const pushCapable = typeof window !== "undefined" && isWebPushSupported();

  useEffect(() => {
    if (!token || !pushCapable) return;
    let cancelled = false;

    (async () => {
      // If the user already granted notification permission, silently restore
      // the push subscription. Privacy-focused browsers (Helium, Brave, etc.)
      // clear SW registrations and push subscriptions between sessions — this
      // re-registers the SW and re-creates the subscription automatically so
      // the user never has to click "Enable" again after the first time.
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const result = await restoreWebPush(authHeaders);
        if (!cancelled) setPushOn(result.ok);
        return;
      }

      // Permission not yet granted — just reflect whatever local state exists.
      const sub = await getLocalPushSubscription();
      if (!cancelled) setPushOn(!!sub);
    })();

    return () => {
      cancelled = true;
    };
  }, [token, pushCapable, authHeaders]);

  const handleEnablePush = async () => {
    setPushBusy(true);
    try {
      const result = await enableWebPush(authHeaders);
      if (result.ok) {
        setPushOn(true);
        toast.success("Browser notifications enabled", {
          description: "You’ll get alerts even when this tab is closed (where the browser allows it).",
        });
      } else {
        toast.error("Could not enable push", { description: result.reason });
      }
    } finally {
      setPushBusy(false);
    }
  };

  const handleDisablePush = async () => {
    setPushBusy(true);
    try {
      await disableWebPush(authHeaders);
      setPushOn(false);
      toast.message("Browser notifications turned off");
    } finally {
      setPushBusy(false);
    }
  };

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/notifications?limit=20`, { headers: authHeaders() });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [authHeaders]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/notifications/unread-count`, { headers: authHeaders() });
      setUnreadCount(res.data.unread_count || 0);
    } catch { /* silent */ }
  }, [authHeaders]);

  // Initial load — only if authenticated
  useEffect(() => { if (token) fetchUnreadCount(); }, [token]);

  // Fetch full list when opening
  useEffect(() => { if (open) fetchNotifications(); }, [open]);

  // Listen for real-time notifications via socket
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 30));
      setUnreadCount((prev) => prev + 1);

      // Show toast based on priority — "low" is silent (bell update only)
      const priority = notification.priority || "medium";
      if (priority === "urgent") {
        toast.error(notification.title, { description: notification.body });
      } else if (priority === "high") {
        toast.warning(notification.title, { description: notification.body });
      } else if (priority === "medium") {
        toast(notification.title, { description: notification.body });
      }
      // "low" priority notifications update the bell counter silently
    };

    socket.on("notification", handleNotification);
    return () => socket.off("notification", handleNotification);
  }, [socket]);

  // Handle pushsubscriptionchange fallback: the SW sends this message when it
  // cannot rotate the subscription itself (no oldEndpoint available). We use
  // the authenticated subscribe route from the main thread instead.
  useEffect(() => {
    if (!token || !pushCapable) return;
    const handleSWMessage = (event) => {
      if (event.data?.type === "PUSH_SUBSCRIPTION_CHANGED") {
        const json = event.data.subscription;
        if (json?.endpoint && json?.keys?.p256dh && json?.keys?.auth) {
          axios.post(`${BACKEND_URL}/notifications/push/subscribe`, json, { headers: authHeaders() }).catch(() => {});
        }
      }
    };
    navigator.serviceWorker.addEventListener("message", handleSWMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleSWMessage);
  }, [token, pushCapable, authHeaders]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAsRead = async (id) => {
    try {
      await axios.put(`${BACKEND_URL}/notifications/${id}/read`, {}, { headers });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, is_read: true, read_at: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${BACKEND_URL}/notifications/read-all`, {}, { headers });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const deleteNotif = async (id) => {
    try {
      await axios.delete(`${BACKEND_URL}/notifications/${id}`, { headers });
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setUnreadCount((prev) => {
        const wasUnread = notifications.find((n) => n._id === id && !n.is_read);
        return wasUnread ? Math.max(0, prev - 1) : prev;
      });
    } catch { /* silent */ }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center size-9 rounded-lg hover:bg-white/[0.06] transition-colors"
      >
        <Bell className="size-[18px] text-zinc-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white leading-none animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-[200] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-800/60 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-zinc-200">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                  >
                    <CheckCheck className="size-3" /> Mark all read
                  </button>
                )}
              </div>
            </div>
            {token && pushCapable && (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-zinc-800/40 px-2.5 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Smartphone className="size-3.5 text-zinc-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-zinc-300">Alerts when away</p>
                    <p className="text-[10px] text-zinc-600 leading-tight">System notifications if the tab is closed</p>
                  </div>
                </div>
                {pushOn ? (
                  <button
                    type="button"
                    disabled={pushBusy}
                    onClick={handleDisablePush}
                    className="text-[11px] shrink-0 px-2 py-1 rounded-md border border-zinc-600 text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {pushBusy ? <Loader2 className="size-3.5 animate-spin" /> : "Off"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pushBusy}
                    onClick={handleEnablePush}
                    className="text-[11px] shrink-0 px-2 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {pushBusy ? <Loader2 className="size-3.5 animate-spin" /> : "Enable"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-zinc-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <Bell className="size-8 mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] || Bell;
                const iconColor = TYPE_COLORS[n.type] || "text-zinc-400";
                const priorityStyle = PRIORITY_STYLES[n.priority] || PRIORITY_STYLES.medium;

                return (
                  <div
                    key={n._id}
                    className={`relative flex items-start gap-3 px-4 py-3 border-b border-zinc-800/40 border-l-2 transition-colors cursor-pointer hover:bg-white/[0.02] ${priorityStyle} ${!n.is_read ? "bg-white/[0.02]" : ""}`}
                    onClick={() => !n.is_read && markAsRead(n._id)}
                  >
                    <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs leading-snug ${n.is_read ? "text-zinc-400" : "text-zinc-200 font-medium"}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-zinc-600 whitespace-nowrap flex-shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      {n.body && (
                        <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      {n.actor_id && (
                        <p className="text-[10px] text-zinc-600 mt-1">
                          by {n.actor_id.first_name} {n.actor_id.last_name}
                        </p>
                      )}
                    </div>
                    {/* Unread dot */}
                    {!n.is_read && (
                      <div className="absolute top-3 right-3 size-2 rounded-full bg-indigo-500" />
                    )}
                    {/* Delete on hover */}
                    <button
                      className="absolute top-2 right-8 opacity-0 hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-red-400 transition-all"
                      onClick={(e) => { e.stopPropagation(); deleteNotif(n._id); }}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-zinc-800/60 text-center">
              <span className="text-[11px] text-zinc-500">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
