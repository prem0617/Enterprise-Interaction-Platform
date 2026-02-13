import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, Clock, Loader2, Plus, Users, X, MessageCircle, Link2, Copy, LogIn, Video, VideoOff, Mic, MicOff, PhoneOff } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { BACKEND_URL } from "@/config";
import { useAuthContext } from "../context/AuthContextProvider";
import { useMeetingCall } from "@/hooks/useMeetingCall";

const MEETING_TYPES = [
  { value: "internal", label: "Internal" },
  { value: "support", label: "Customer support" },
];

const DEFAULT_REMINDERS = [5, 15, 30];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMonthGrid(currentMonth) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0-6, Sunday start

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  // Leading blanks
  for (let i = 0; i < startWeekday; i += 1) {
    days.push(null);
  }
  // Month days
  for (let d = 1; d <= daysInMonth; d += 1) {
    days.push(new Date(year, month, d));
  }
  return days;
}

const MeetingModule = () => {
  const { socket, user } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [roomParticipants, setRoomParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [localMediaStream, setLocalMediaStream] = useState(null);

  const videoRefs = useRef({});
  const localVideoRef = useRef(null);

  const token = localStorage.getItem("token");
  const axiosConfig = useMemo(
    () => ({
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    }),
    [token]
  );

  const currentUserId = user?.id || user?._id;
  const currentUserName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "You"
    : "You";

  const meetingCall = useMeetingCall(
    socket,
    currentUserId,
    currentUserName,
    activeMeeting?._id,
    roomParticipants
  );

  const [form, setForm] = useState({
    title: "",
    description: "",
    meeting_type: "internal",
    date: "",
    time: "",
    duration_minutes: 30,
    location: "",
    participants: [],
    reminders: [...DEFAULT_REMINDERS],
  });

  const monthLabel = useMemo(
    () =>
      currentMonth.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [currentMonth]
  );

  const calendarDays = useMemo(
    () => buildMonthGrid(currentMonth),
    [currentMonth]
  );

  const meetingsByDay = useMemo(() => {
    const map = {};
    meetings.forEach((m) => {
      if (!m.scheduled_at) return;
      const d = startOfDay(new Date(m.scheduled_at));
      const key = d.toISOString();
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [meetings]);

  const selectedDateMeetings = useMemo(
    () =>
      meetings.filter((m) =>
        m.scheduled_at
          ? isSameDay(new Date(m.scheduled_at), selectedDate)
          : false
      ),
    [meetings, selectedDate]
  );

  const loadMeetings = async (dateAnchor) => {
    try {
      setLoading(true);
      const from = new Date(dateAnchor);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setMonth(to.getMonth() + 1);
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const { data } = await axios.get(
        `${BACKEND_URL}/meetings?${params.toString()}`,
        axiosConfig
      );
      setMeetings(data.data || []);
    } catch (error) {
      console.error("Failed to load meetings", error);
      toast.error("Failed to load meetings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings(currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth.getFullYear(), currentMonth.getMonth()]);

  useEffect(() => {
    if (!socket) return;

    const handleReminder = (payload) => {
      toast((t) => (
        <div className="text-left">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white">
              Upcoming meeting
            </span>
          </div>
          <p className="text-sm text-slate-200">{payload.title}</p>
          <p className="text-xs text-slate-400">
            Starts in {payload.minutes_before} minutes
          </p>
        </div>
      ), { duration: 5000, id: `meeting-${payload.meetingId}-${payload.minutes_before}` });
    };

    socket.on("meeting-reminder", handleReminder);
    return () => {
      socket.off("meeting-reminder", handleReminder);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleParticipants = (payload) => {
      if (!activeMeeting || payload.meetingId !== activeMeeting._id) return;
      setRoomParticipants(payload.participants || []);
    };

    const handleMessage = (payload) => {
      if (!activeMeeting || payload.meetingId !== activeMeeting._id) return;
      if (!payload.message) return;
      setChatMessages((prev) => [...prev, payload.message]);
    };

    const handleEnded = (payload) => {
      if (!activeMeeting || payload.meetingId !== activeMeeting._id) return;
      toast("Meeting ended by host", { icon: "ℹ️" });
      setActiveMeeting(null);
      setRoomParticipants([]);
      setChatMessages([]);
      setChatInput("");
    };

    socket.on("meeting-participants", handleParticipants);
    socket.on("meeting-message", handleMessage);
    socket.on("meeting-ended", handleEnded);

    return () => {
      socket.off("meeting-participants", handleParticipants);
      socket.off("meeting-message", handleMessage);
      socket.off("meeting-ended", handleEnded);
    };
  }, [socket, activeMeeting]);

  const openCreateForm = () => {
    const dateStr = selectedDate.toISOString().slice(0, 10);
    const timeStr = "09:00";
    setEditingMeeting(null);
    setForm({
      title: "",
      description: "",
      meeting_type: "internal",
      date: dateStr,
      time: timeStr,
      duration_minutes: 30,
      location: "",
      participants: [],
      reminders: [...DEFAULT_REMINDERS],
    });
    setShowForm(true);
  };

  const openEditForm = (meeting) => {
    const d = meeting.scheduled_at ? new Date(meeting.scheduled_at) : null;
    setEditingMeeting(meeting);
    setForm({
      title: meeting.title || "",
      description: meeting.description || "",
      meeting_type: meeting.meeting_type || "internal",
      date: d ? d.toISOString().slice(0, 10) : "",
      time: d
        ? `${String(d.getHours()).padStart(2, "0")}:${String(
            d.getMinutes()
          ).padStart(2, "0")}`
        : "",
      duration_minutes: meeting.duration_minutes || 30,
      location: meeting.location || "",
      participants: (meeting.participants || []).map((p) => ({
        _id: p._id || p,
        full_name:
          p.full_name ||
          `${p.first_name || ""} ${p.last_name || ""}`.trim() ||
          p.email ||
          "User",
        email: p.email,
      })),
      reminders: Array.isArray(meeting.reminders)
        ? meeting.reminders.map((r) => Number(r.minutes_before))
        : [],
    });
    setShowForm(true);
  };

  const resetFormState = () => {
    setShowForm(false);
    setCreating(false);
    setEditingMeeting(null);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleReminder = (minutes) => {
    setForm((prev) => {
      const exists = prev.reminders.includes(minutes);
      const next = exists
        ? prev.reminders.filter((m) => m !== minutes)
        : [...prev.reminders, minutes];
      return { ...prev, reminders: next };
    });
  };

  const removeParticipant = (id) => {
    setForm((prev) => ({
      ...prev,
      participants: prev.participants.filter((p) => p._id !== id),
    }));
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchError("");
      return;
    }
    try {
      setSearchingUsers(true);
      setSearchError("");
      const { data } = await axios.get(
        `${BACKEND_URL}/direct_chat/search?query=${encodeURIComponent(query)}`,
        axiosConfig
      );
      setSearchResults(data.users || []);
    } catch (error) {
      console.error("Failed to search users", error);
      setSearchError("Failed to search users");
    } finally {
      setSearchingUsers(false);
    }
  };

  const addParticipant = (user) => {
    setForm((prev) => {
      if (prev.participants.some((p) => p._id === user._id)) return prev;
      return {
        ...prev,
        participants: [
          ...prev.participants,
          {
            _id: user._id,
            full_name: user.full_name,
            email: user.email,
          },
        ],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.date || !form.time) {
      toast.error("Date and time are required");
      return;
    }

    try {
      setCreating(true);
      const scheduledAt = new Date(`${form.date}T${form.time}:00`);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        meeting_type: form.meeting_type,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: Number(form.duration_minutes) || 30,
        location: form.location.trim() || undefined,
        participants: form.participants.map((p) => p._id),
        reminders: (form.reminders || []).map((m) => ({
          minutes_before: Number(m),
        })),
      };

      if (editingMeeting) {
        const { data } = await axios.put(
          `${BACKEND_URL}/meetings/${editingMeeting._id}`,
          payload,
          axiosConfig
        );
        const updated = data.data;
        setMeetings((prev) =>
          prev.map((m) => (m._id === updated._id ? updated : m))
        );
        toast.success("Meeting updated");
      } else {
        const { data } = await axios.post(
          `${BACKEND_URL}/meetings`,
          payload,
          axiosConfig
        );
        const created = data.data;
        setMeetings((prev) => [...prev, created]);
        toast.success("Meeting created");
      }

      resetFormState();
    } catch (error) {
      console.error("Failed to save meeting", error);
      const msg =
        error.response?.data?.error ||
        (editingMeeting ? "Failed to update meeting" : "Failed to create meeting");
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleCancelMeeting = async (meeting) => {
    if (!window.confirm("Cancel this meeting?")) return;
    try {
      const { data } = await axios.delete(
        `${BACKEND_URL}/meetings/${meeting._id}`,
        axiosConfig
      );
      const cancelled = data.data;
      setMeetings((prev) =>
        prev.map((m) => (m._id === cancelled._id ? cancelled : m))
      );
      toast.success("Meeting cancelled");
    } catch (error) {
      console.error("Failed to cancel meeting", error);
      toast.error("Failed to cancel meeting");
    }
  };

  const changeMonth = (offset) => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + offset);
      return new Date(next.getFullYear(), next.getMonth(), 1);
    });
  };

  const today = startOfDay(new Date());

  const isHost = (meeting) =>
    currentUserId &&
    String(meeting.host_id?._id || meeting.host_id) === String(currentUserId);

  const isParticipant = (meeting) => {
    if (isHost(meeting)) return true;
    if (!currentUserId) return false;
    return (meeting.participants || []).some(
      (p) => String(p._id || p) === String(currentUserId)
    );
  };

  const canEnterMeeting = (meeting) => {
    if (!meeting.scheduled_at) return false;
    const start = new Date(meeting.scheduled_at).getTime();
    const now = Date.now();
    // Allow from scheduled time onwards
    return now >= start && meeting.status !== "cancelled";
  };

  const handleEnterMeeting = async (meeting) => {
    if (!socket) {
      toast.error("Socket not connected");
      return;
    }
    const host = isHost(meeting);
    let stream;
    try {
      stream = await meetingCall.startMedia();
      setLocalMediaStream(stream);
    } catch (err) {
      toast.error(meetingCall.mediaError || "Camera/microphone access denied");
      return;
    }
    try {
      // If host and meeting not active, mark as active
      if (host && meeting.status !== "active") {
        const { data } = await axios.put(
          `${BACKEND_URL}/meetings/${meeting._id}`,
          {
            status: "active",
            started_at: new Date().toISOString(),
          },
          axiosConfig
        );
        const updated = data.data;
        meeting = updated;
        setMeetings((prev) =>
          prev.map((m) => (m._id === updated._id ? updated : m))
        );
      }
    } catch (error) {
      console.error("Failed to start meeting", error);
      meetingCall.cleanup();
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setLocalMediaStream(null);
      toast.error("Failed to start meeting");
      return;
    }

    setActiveMeeting({ ...meeting, isHost: host });
    setChatMessages([]);
    setChatInput("");

    socket.emit("meeting-join", {
      meetingId: meeting._id,
      name: currentUserName,
    });
  };

  const handleLeaveMeeting = async () => {
    if (!activeMeeting || !socket) {
      setActiveMeeting(null);
      return;
    }
    if (localMediaStream) {
      localMediaStream.getTracks().forEach((t) => t.stop());
      setLocalMediaStream(null);
    }
    meetingCall.cleanup();
    const meetingId = activeMeeting._id;

    socket.emit("meeting-leave", { meetingId });

    // If host, mark meeting as ended
    if (activeMeeting.isHost && activeMeeting.status !== "ended") {
      try {
        const { data } = await axios.put(
          `${BACKEND_URL}/meetings/${meetingId}`,
          {
            status: "ended",
            ended_at: new Date().toISOString(),
          },
          axiosConfig
        );
        const updated = data.data;
        setMeetings((prev) =>
          prev.map((m) => (m._id === updated._id ? updated : m))
        );
        socket.emit("meeting-end", { meetingId });
      } catch (error) {
        console.error("Failed to end meeting", error);
      }
    }

    setActiveMeeting(null);
    setRoomParticipants([]);
    setChatMessages([]);
    setChatInput("");
  };

  useEffect(() => {
    const joinCode = searchParams.get("joinCode");
    if (joinCode) {
      setJoinCodeInput(joinCode.toUpperCase());
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleJoinByCode = async (e) => {
    e?.preventDefault?.();
    const code = String(joinCodeInput || "").trim().toUpperCase();
    if (!code) {
      toast.error("Enter a meeting code");
      return;
    }
    setJoiningByCode(true);
    try {
      const { data } = await axios.get(
        `${BACKEND_URL}/meetings/join?code=${encodeURIComponent(code)}`,
        axiosConfig
      );
      const meeting = data.data;
      if (meeting.status === "cancelled") {
        toast.error("This meeting has been cancelled");
        return;
      }
      setJoinCodeInput("");
      if (!meetings.some((m) => m._id === meeting._id)) {
        setMeetings((prev) => [...prev, meeting]);
      }
      await handleEnterMeeting(meeting);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.status === 404 ? "Meeting not found" : "Failed to join";
      toast.error(msg);
    } finally {
      setJoiningByCode(false);
    }
  };

  const getMeetingJoinLink = (meeting) => {
    const code = meeting?.meeting_code || meeting?.code;
    if (!code) return "";
    return `${window.location.origin}/join/${code}`;
  };

  const copyMeetingLink = (meeting) => {
    const link = getMeetingJoinLink(meeting);
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => toast.success("Link copied to clipboard"));
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!activeMeeting || !socket || !chatInput.trim()) return;
    const meetingId = activeMeeting._id;
    const message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: currentUserId,
      name: currentUserName,
      content: chatInput.trim(),
      createdAt: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, { ...message, isLocal: true }]);
    setChatInput("");
    socket.emit("meeting-message", { meetingId, message });
  };

  const displayLocalStream = localMediaStream || meetingCall.localStream;
  useEffect(() => {
    if (!displayLocalStream || !localVideoRef.current) return;
    const video = localVideoRef.current;
    video.srcObject = displayLocalStream;
    video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [displayLocalStream]);

  useEffect(() => {
    Object.entries(meetingCall.remoteStreams).forEach(([userId, stream]) => {
      const videoEl = videoRefs.current[userId];
      if (videoEl && stream) {
        videoEl.srcObject = stream;
        videoEl.play().catch(() => {});
      }
    });
  }, [meetingCall.remoteStreams]);

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] px-4 sm:px-6 lg:px-8 py-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white mb-1">Meetings</h1>
          <p className="text-sm text-slate-400">
            Schedule, manage and get reminders for your meetings
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule meeting</span>
        </button>
      </div>

      <div className="mb-4 p-4 bg-slate-900 rounded-xl border border-slate-700/50">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
          <Link2 className="w-4 h-4" />
          Join by meeting code
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          Enter a meeting code shared by the host to join.
        </p>
        <form onSubmit={handleJoinByCode} className="flex gap-2">
          <input
            type="text"
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
            placeholder="e.g. ABC12345"
            className="flex-1 max-w-xs px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/60 text-sm text-white font-mono uppercase placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            maxLength={12}
          />
          <button
            type="submit"
            disabled={joiningByCode || !joinCodeInput.trim()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition disabled:opacity-50"
          >
            {joiningByCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Join
          </button>
        </form>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100%-3rem)]">
        {/* Calendar */}
        <div className="bg-slate-900 rounded-xl border border-slate-700/50 p-4 flex-1 min-h-[360px]">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="px-2 py-1 text-slate-300 hover:bg-slate-800 rounded-lg text-xs"
            >
              &#8592; Prev
            </button>
            <div className="text-sm font-medium text-white">{monthLabel}</div>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="px-2 py-1 text-slate-300 hover:bg-slate-800 rounded-lg text-xs"
            >
              Next &#8594;
            </button>
          </div>

          <div className="grid grid-cols-7 text-[11px] text-slate-400 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-xs mb-2">
            {calendarDays.map((day, idx) => {
              if (!day) {
                return (
                  <div
                    key={`blank-${idx}`}
                    className="h-9 rounded-lg bg-slate-900"
                  />
                );
              }

              const key = startOfDay(day).toISOString();
              const dayMeetings = meetingsByDay[key] || [];
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDate);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(startOfDay(day))}
                  className={[
                    "h-9 rounded-lg flex flex-col items-center justify-center border text-xs transition-colors",
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/20 text-white"
                      : "border-slate-700/50 text-slate-200 hover:bg-slate-800/70",
                    isToday && !isSelected ? "ring-1 ring-indigo-500/60" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="leading-none mb-0.5">
                    {day.getDate()}
                  </span>
                  {dayMeetings.length > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>

          {loading && (
            <div className="flex items-center gap-2 mt-4 text-xs text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading meetings...
            </div>
          )}
        </div>

        {/* Meetings List */}
        <div className="bg-slate-900 rounded-xl border border-slate-700/50 p-4 flex flex-col w-full lg:w-[360px] max-h-full">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Selected day</p>
              <p className="text-sm font-medium text-white">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {selectedDateMeetings.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <CalendarDays className="w-8 h-8 text-slate-700 mb-2" />
              <p className="text-sm text-slate-400 mb-1">
                No meetings scheduled
              </p>
              <p className="text-xs text-slate-500 mb-2">
                Schedule your first meeting for this day
              </p>
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-100 hover:bg-slate-700"
              >
                <Plus className="w-3 h-3" />
                New meeting
              </button>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1">
              {selectedDateMeetings.map((m) => {
                const d = m.scheduled_at ? new Date(m.scheduled_at) : null;
                const timeLabel = d
                  ? d.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "--";
                const isCancelled = m.status === "cancelled";
                const isPast =
                  d && d.getTime() < Date.now() && !isCancelled;
                const participants = (m.participants || []).map((p) => {
                  const fullName =
                    p.full_name ||
                    `${p.first_name || ""} ${p.last_name || ""}`.trim() ||
                    p.email ||
                    "User";
                  return fullName;
                });

                return (
                  <div
                    key={m._id}
                    className="rounded-lg border border-slate-700/60 bg-slate-800/60 p-3 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {m.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeLabel}
                            {m.duration_minutes
                              ? ` • ${m.duration_minutes} min`
                              : ""}
                          </span>
                          {m.meeting_type && (
                            <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-[10px] uppercase tracking-wide">
                              {MEETING_TYPES.find(
                                (t) => t.value === m.meeting_type
                              )?.label || m.meeting_type}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {isCancelled ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                            Cancelled
                          </span>
                        ) : isPast ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-700/60">
                            Past
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Upcoming
                          </span>
                        )}
                        <div className="flex gap-1">
                          {!isCancelled && (
                            <button
                              type="button"
                              onClick={() => openEditForm(m)}
                              className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-200 hover:bg-slate-800"
                            >
                              Edit
                            </button>
                          )}
                          {!isCancelled && (
                            <button
                              type="button"
                              onClick={() => handleCancelMeeting(m)}
                              className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            >
                              Cancel
                            </button>
                          )}
                          {canEnterMeeting(m) && isParticipant(m) && (
                            <button
                              type="button"
                              onClick={() => handleEnterMeeting(m)}
                              className="px-2 py-0.5 rounded text-[10px] bg-indigo-600 text-white hover:bg-indigo-500"
                            >
                              {isHost(m) ? "Start meeting" : "Join meeting"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {m.description && (
                      <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">
                        {m.description}
                      </p>
                    )}

                    <div className="mt-1 space-y-1">
                      {participants.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Users className="w-3 h-3" />
                          <span className="truncate">
                            {participants.join(", ")}
                          </span>
                        </div>
                      )}
                      {m.location && (
                        <p className="text-[11px] text-slate-400">
                          Location:{" "}
                          <span className="text-slate-200">{m.location}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Meeting Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700/60 shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {editingMeeting ? "Edit meeting" : "Schedule a meeting"}
                </h2>
                <p className="text-xs text-slate-400">
                  Set meeting details, participants and reminders
                </p>
              </div>
              <button
                type="button"
                onClick={resetFormState}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="px-4 py-3 space-y-3 overflow-y-auto text-xs"
            >
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleFormChange("title", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/60 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Team sync, client call, support session..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => handleFormChange("date", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/60 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => handleFormChange("time", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/60 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Type
                  </label>
                  <select
                    value={form.meeting_type}
                    onChange={(e) =>
                      handleFormChange("meeting_type", e.target.value)
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/60 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {MEETING_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.duration_minutes}
                    onChange={(e) =>
                      handleFormChange("duration_minutes", e.target.value)
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/60 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    handleFormChange("description", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/60 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  placeholder="Agenda, notes, goals..."
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) =>
                    handleFormChange("location", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/60 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Meeting room, office..."
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Participants
                </label>
                <div className="mb-1 flex flex-wrap gap-1">
                  {form.participants.length === 0 && (
                    <span className="text-[11px] text-slate-500">
                      No participants added yet
                    </span>
                  )}
                  {form.participants.map((p) => (
                    <span
                      key={p._id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/70 text-[11px] text-slate-100"
                    >
                      {p.full_name || p.email || "User"}
                      <button
                        type="button"
                        onClick={() => removeParticipant(p._id)}
                        className="p-0.5 rounded-full hover:bg-slate-700 text-slate-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                    onBlur={() => {
                      // no-op: keep results
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        searchUsers(searchQuery);
                      }
                    }}
                    placeholder="Search users by name or email"
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/60 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => searchUsers(searchQuery)}
                    disabled={searchingUsers}
                    className="px-3 py-2 rounded-lg bg-slate-800 text-xs text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                  >
                    {searchingUsers ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Search"
                    )}
                  </button>
                </div>
                {searchError && (
                  <p className="mt-1 text-[11px] text-red-400">{searchError}</p>
                )}
                {searchResults.length > 0 && (
                  <div className="mt-1 max-h-28 overflow-y-auto border border-slate-700/60 rounded-lg bg-slate-900/80">
                    {searchResults.map((u) => (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => addParticipant(u)}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-800"
                      >
                        <span className="truncate">
                          {u.full_name || u.email || "User"}
                        </span>
                        {u.email && (
                          <span className="ml-2 text-[10px] text-slate-500 truncate">
                            {u.email}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Reminders
                </label>
                <div className="flex flex-wrap gap-1">
                  {DEFAULT_REMINDERS.map((m) => {
                    const active = form.reminders.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleReminder(m)}
                        className={[
                          "px-2.5 py-1 rounded-full text-[11px] border transition-colors",
                          active
                            ? "bg-indigo-600 text-white border-indigo-500"
                            : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700",
                        ].join(" ")}
                      >
                        {m} min before
                      </button>
                    );
                  })}
                  {form.reminders.length === 0 && (
                    <span className="text-[11px] text-slate-500">
                      No reminders selected
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-700/50 mt-2">
                <button
                  type="button"
                  onClick={resetFormState}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-200 hover:bg-slate-700"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-xs text-white hover:bg-indigo-500 disabled:opacity-60 inline-flex items-center gap-1.5"
                >
                  {creating && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  <span>{editingMeeting ? "Save changes" : "Create meeting"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live meeting room with video */}
      {activeMeeting && (
        <div className="fixed inset-0 z-40 flex flex-col bg-slate-950">
          {(() => {
            const remoteParticipants = roomParticipants.filter(
              (p) => String(p.userId) !== String(currentUserId)
            );
            const participantCount = Math.max(1, roomParticipants.length);
            const totalVideos = (displayLocalStream ? 1 : 0) + remoteParticipants.length;
            const gridCols = Math.min(2, Math.max(1, totalVideos));
            const gridRows = Math.ceil(totalVideos / gridCols) || 1;

            return (
              <div className="flex-1 flex flex-col bg-slate-900 min-h-0">
                <div className="h-14 px-4 border-b border-slate-700/50 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/80 flex items-center justify-center">
                      <Video className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{activeMeeting.title}</h3>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-500">
                          {participantCount} participant{participantCount !== 1 ? "s" : ""}
                        </p>
                        {activeMeeting.meeting_code && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-xs font-mono text-slate-400">
                              {activeMeeting.meeting_code}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyMeetingLink(activeMeeting)}
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                              title="Copy invite link"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={meetingCall.toggleMute}
                      title={meetingCall.isMuted ? "Unmute" : "Mute"}
                      className={`p-2 rounded-lg transition-colors ${
                        meetingCall.isMuted
                          ? "bg-red-500/20 text-red-400"
                          : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                      }`}
                    >
                      {meetingCall.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={meetingCall.toggleVideo}
                      title={meetingCall.isVideoOff ? "Turn on camera" : "Turn off camera"}
                      className={`p-2 rounded-lg transition-colors ${
                        meetingCall.isVideoOff
                          ? "bg-red-500/20 text-red-400"
                          : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                      }`}
                    >
                      {meetingCall.isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleLeaveMeeting}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center gap-1"
                    >
                      <PhoneOff className="w-4 h-4" />
                      {activeMeeting.isHost ? "End meeting" : "Leave"}
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex min-h-0 overflow-hidden">
                  <div
                    className="flex-1 grid gap-2 p-2 min-h-0 min-w-0"
                    style={{
                      gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
                    }}
                  >
                    {displayLocalStream && (
                      <div className="relative bg-slate-900 rounded-lg overflow-hidden border-2 border-slate-700 min-h-[200px]">
                        <video
                          ref={(el) => {
                            localVideoRef.current = el;
                            if (el && displayLocalStream) {
                              el.srcObject = displayLocalStream;
                              el.play().catch(() => {});
                            }
                          }}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover min-h-[200px]"
                        />
                        {meetingCall.isVideoOff && (
                          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                            <VideoOff className="w-8 h-8 text-slate-600" />
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-white text-xs font-medium">
                          You {meetingCall.isMuted && <MicOff className="w-3 h-3 inline ml-1" />}
                        </div>
                      </div>
                    )}

                    {remoteParticipants.map((p) => {
                      const stream = meetingCall.remoteStreams[p.userId];
                      return (
                        <div
                          key={p.userId}
                          className="relative bg-slate-900 rounded-lg overflow-hidden border-2 border-slate-700 min-h-[200px]"
                        >
                          {stream ? (
                            <video
                              ref={(r) => {
                                videoRefs.current[p.userId] = r;
                              }}
                              autoPlay
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800">
                              <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-2">
                                  <span className="text-indigo-400 font-semibold text-2xl">
                                    {(p.name || "?").charAt(0)}
                                  </span>
                                </div>
                                <p className="text-white text-sm font-medium">{p.name || "User"}</p>
                                <p className="text-xs text-slate-400">Connecting...</p>
                              </div>
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-white text-xs font-medium">
                            {p.name || "User"}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="w-72 border-l border-slate-700/50 flex flex-col">
                    <div className="p-2 border-b border-slate-700/30">
                      <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Participants
                      </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-800/80">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/30 flex items-center justify-center text-[11px] text-indigo-200">
                          {currentUserName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{currentUserName}</p>
                          <p className="text-[10px] text-emerald-400">
                            You {activeMeeting.isHost ? "(host)" : ""}
                          </p>
                        </div>
                      </div>
                      {roomParticipants
                        .filter((p) => String(p.userId) !== String(currentUserId))
                        .map((p) => (
                          <div key={p.userId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-800/40">
                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[11px] text-slate-100">
                              {(p.name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <p className="text-xs font-medium text-slate-100 truncate">{p.name || "User"}</p>
                          </div>
                        ))}
                    </div>
                    <div className="p-2 border-t border-slate-700/30">
                      <div className="flex-1 overflow-y-auto space-y-2 mb-2 max-h-24">
                        {chatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`text-xs ${msg.userId === currentUserId ? "text-right" : ""}`}
                          >
                            <span className="text-slate-500 text-[10px] mr-1">{msg.name}:</span>
                            {msg.content}
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleSendChat} className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/60 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={!chatInput.trim()}
                          className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default MeetingModule;

