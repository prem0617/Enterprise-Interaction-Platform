import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  Video,
  Plus,
  Calendar,
  Clock,
  Users,
  Zap,
  Loader2,
  Trash2,
  LogIn,
  MessageCircle,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Link2,
  Copy,
} from "lucide-react";
import { BACKEND_URL } from "@/config";
import { useAuthContext } from "@/context/AuthContextProvider";
import { useMeetingCall } from "@/hooks/useMeetingCall";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const MEETING_TYPES = [
  { value: "internal", label: "Internal" },
  { value: "support", label: "Customer Support" },
];

const DURATIONS = [15, 30, 45, 60];

export default function AdminMeetings() {
  const { socket, user } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingInstant, setCreatingInstant] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [roomParticipants, setRoomParticipants] = useState([]);
  const [localMediaStream, setLocalMediaStream] = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    meeting_type: "internal",
    date: "",
    time: "",
    duration_minutes: 30,
    participants: [],
  });
  const videoRefs = useRef({});
  const localVideoRef = useRef(null);

  const token = localStorage.getItem("token");
  const axiosConfig = useMemo(
    () => ({ headers: { Authorization: token ? `Bearer ${token}` : undefined } }),
    [token]
  );

  const currentUserId = user?.id || user?._id;
  const currentUserName =
    user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "You" : "You";

  const meetingCall = useMeetingCall(
    socket,
    currentUserId,
    currentUserName,
    activeMeeting?._id,
    roomParticipants
  );

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setMonth(to.getMonth() + 2);
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const { data } = await axios.get(`${BACKEND_URL}/meetings?${params}`, axiosConfig);
      setMeetings(data.data || []);
    } catch (err) {
      toast.error("Failed to load meetings");
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  useEffect(() => {
    const joinCode = searchParams.get("joinCode");
    if (joinCode) {
      setJoinCodeInput(joinCode.toUpperCase());
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!showScheduleForm) return;
    const loadEmployees = async () => {
      try {
        const { data } = await axios.get(`${BACKEND_URL}/employees/`, axiosConfig);
        setEmployees(data.employees || data.data || data || []);
      } catch {
        setEmployees([]);
      }
    };
    loadEmployees();
  }, [showScheduleForm, axiosConfig]);

  useEffect(() => {
    if (!socket) return;
    const handleSync = ({ event, meeting }) => {
      setMeetings((prev) => {
        if (event === "created") return [...prev, meeting];
        if (event === "updated")
          return prev.map((m) => (m._id === meeting._id ? meeting : m));
        if (event === "cancelled")
          return prev.map((m) =>
            m._id === meeting._id ? { ...m, status: "cancelled" } : m
          );
        return prev;
      });
    };
    socket.on("meeting-sync", handleSync);
    return () => socket.off("meeting-sync", handleSync);
  }, [socket]);

  useEffect(() => {
    if (!socket || !activeMeeting) return;
    const handleParticipants = (payload) => {
      if (payload.meetingId !== activeMeeting._id) return;
      setRoomParticipants(payload.participants || []);
    };
    const handleMessage = (payload) => {
      if (payload.meetingId !== activeMeeting._id || !payload.message) return;
      setChatMessages((prev) => [...prev, payload.message]);
    };
    const handleEnded = (payload) => {
      if (payload.meetingId !== activeMeeting._id) return;
      toast.info("Meeting ended");
      setLocalMediaStream((prev) => {
        if (prev) {
          prev.getTracks().forEach((t) => t.stop());
        }
        return null;
      });
      meetingCall.cleanup();
      setActiveMeeting(null);
      setRoomParticipants([]);
      setChatMessages([]);
      loadMeetings();
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

  const handleInstantMeeting = async () => {
    if (!socket) {
      toast.error("Connecting... Please wait");
      return;
    }
    setCreatingInstant(true);
    let stream;
    try {
      stream = await meetingCall.startMedia();
      setLocalMediaStream(stream);
    } catch (err) {
      toast.error(meetingCall.mediaError || "Camera/microphone access denied");
      setCreatingInstant(false);
      return;
    }
    try {
      const now = new Date();
      const { data } = await axios.post(
        `${BACKEND_URL}/meetings`,
        {
          title: `Instant Meeting ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          meeting_type: "internal",
          scheduled_at: now.toISOString(),
          duration_minutes: 30,
          participants: [],
        },
        axiosConfig
      );
      const meeting = data.data;
      setMeetings((prev) => [...prev, meeting]);
      setActiveMeeting({ ...meeting, isHost: true });
      setChatMessages([]);
      setChatInput("");
      socket.emit("meeting-join", { meetingId: meeting._id, name: currentUserName });
      await axios.put(
        `${BACKEND_URL}/meetings/${meeting._id}`,
        { status: "active", started_at: new Date().toISOString() },
        axiosConfig
      );
      setMeetings((prev) =>
        prev.map((m) =>
          m._id === meeting._id ? { ...m, status: "active" } : m
        )
      );
      toast.success("Meeting started");
    } catch (err) {
      meetingCall.cleanup();
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      setLocalMediaStream(null);
      toast.error(err.response?.data?.error || "Failed to start meeting");
    } finally {
      setCreatingInstant(false);
    }
  };

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.date || !form.time) {
      toast.error("Date and time are required");
      return;
    }
    setSaving(true);
    try {
      const scheduledAt = new Date(`${form.date}T${form.time}:00`);
      const { data } = await axios.post(
        `${BACKEND_URL}/meetings`,
        {
          title: form.title.trim(),
          description: form.description || undefined,
          meeting_type: form.meeting_type,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: Number(form.duration_minutes) || 30,
          participants: (form.participants || []).map((p) => p._id || p.id),
        },
        axiosConfig
      );
      setMeetings((prev) => [...prev, data.data]);
      setShowScheduleForm(false);
      setForm({
        title: "",
        description: "",
        meeting_type: "internal",
        date: "",
        time: "",
        duration_minutes: 30,
        participants: [],
      });
      toast.success("Meeting scheduled");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelMeeting = async (meeting) => {
    if (!window.confirm("Cancel this meeting?")) return;
    try {
      await axios.delete(`${BACKEND_URL}/meetings/${meeting._id}`, axiosConfig);
      setMeetings((prev) =>
        prev.map((m) =>
          m._id === meeting._id ? { ...m, status: "cancelled" } : m
        )
      );
      toast.success("Meeting cancelled");
    } catch {
      toast.error("Failed to cancel");
    }
  };

  const isHost = (m) =>
    currentUserId && String(m.host_id?._id || m.host_id) === String(currentUserId);

  const canJoin = (m) => {
    if (!m.scheduled_at) return false;
    const start = new Date(m.scheduled_at).getTime();
    return Date.now() >= start && m.status !== "cancelled";
  };

  const handleJoinMeeting = async (meeting) => {
    if (!socket) {
      toast.error("Connecting... Please wait");
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
      if (host && meeting.status !== "active") {
        await axios.put(
          `${BACKEND_URL}/meetings/${meeting._id}`,
          { status: "active", started_at: new Date().toISOString() },
          axiosConfig
        );
        setMeetings((prev) =>
          prev.map((m) =>
            m._id === meeting._id ? { ...m, status: "active" } : m
          )
        );
      }
    } catch {
      toast.error("Failed to start meeting");
      meetingCall.cleanup();
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setLocalMediaStream(null);
      return;
    }
    setActiveMeeting({ ...meeting, isHost: host });
    setChatMessages([]);
    setChatInput("");
    socket.emit("meeting-join", { meetingId: meeting._id, name: currentUserName });
  };

  const handleLeaveMeeting = () => {
    if (!activeMeeting || !socket) return;
    if (localMediaStream) {
      localMediaStream.getTracks().forEach((t) => t.stop());
      setLocalMediaStream(null);
    }
    meetingCall.cleanup();
    socket.emit("meeting-leave", { meetingId: activeMeeting._id });
    if (activeMeeting.isHost && activeMeeting.status !== "ended") {
      axios
        .put(
          `${BACKEND_URL}/meetings/${activeMeeting._id}`,
          { status: "ended", ended_at: new Date().toISOString() },
          axiosConfig
        )
        .then(() => socket.emit("meeting-end", { meetingId: activeMeeting._id }));
    }
    setActiveMeeting(null);
    setRoomParticipants([]);
    setChatMessages([]);
    loadMeetings();
  };

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
      await handleJoinMeeting(meeting);
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
    const base = window.location.origin;
    return `${base}/join/${code}`;
  };

  const copyMeetingLink = (meeting) => {
    const link = getMeetingJoinLink(meeting);
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => toast.success("Link copied to clipboard"));
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!activeMeeting || !socket || !chatInput.trim()) return;
    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: currentUserId,
      name: currentUserName,
      content: chatInput.trim(),
      createdAt: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, { ...msg, isLocal: true }]);
    setChatInput("");
    socket.emit("meeting-message", { meetingId: activeMeeting._id, message: msg });
  };

  const upcomingMeetings = useMemo(
    () =>
      meetings
        .filter(
          (m) =>
            m.status !== "cancelled" &&
            new Date(m.scheduled_at) >= new Date()
        )
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
        .slice(0, 20),
    [meetings]
  );

  // Attach video streams to DOM elements
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

  // Active meeting room with video
  if (activeMeeting) {
    const remoteParticipants = roomParticipants.filter(
      (p) => String(p.userId) !== String(currentUserId)
    );
    const participantCount = Math.max(1, roomParticipants.length);
    const totalVideos = (displayLocalStream ? 1 : 0) + remoteParticipants.length;
    const gridCols = Math.min(2, Math.max(1, totalVideos));
    const gridRows = Math.ceil(totalVideos / gridCols) || 1;

    return (
      <div className="flex h-[calc(100vh-3.5rem)] bg-slate-950">
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
                    {participantCount} participant
                    {participantCount !== 1 ? "s" : ""} in call
                  </p>
                  {activeMeeting.meeting_code && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs font-mono text-slate-400">
                        {activeMeeting.meeting_code}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-slate-400 hover:text-white"
                        onClick={() => copyMeetingLink(activeMeeting)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLeaveMeeting}
              className="gap-1"
            >
              <PhoneOff className="w-4 h-4" />
              Leave
            </Button>
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

              {remoteParticipants
                .map((p) => {
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
                    <p className="text-[10px] text-emerald-400">You {activeMeeting.isHost ? "(host)" : ""}</p>
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
                <div className="flex gap-2 mb-2">
                  <Button
                    variant={meetingCall.isMuted ? "destructive" : "secondary"}
                    size="icon"
                    onClick={meetingCall.toggleMute}
                    title={meetingCall.isMuted ? "Unmute" : "Mute"}
                  >
                    {meetingCall.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant={meetingCall.isVideoOff ? "destructive" : "secondary"}
                    size="icon"
                    onClick={meetingCall.toggleVideo}
                    title={meetingCall.isVideoOff ? "Turn on camera" : "Turn off camera"}
                  >
                    {meetingCall.isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 mb-2 max-h-24">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "text-xs",
                        msg.userId === currentUserId ? "text-right" : ""
                      )}
                    >
                      <span className="text-slate-500 text-[10px] mr-1">{msg.name}:</span>
                      {msg.content}
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendChat} className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="h-8 text-xs flex-1"
                  />
                  <Button type="submit" size="icon" className="h-8 w-8">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Meetings</h1>
        <p className="text-sm text-muted-foreground">
          Start instant meetings or schedule ahead. Real-time updates.
        </p>
      </div>

      <Tabs defaultValue="instant" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="instant" className="gap-2">
            <Zap className="size-4" />
            Instant
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2">
            <Calendar className="size-4" />
            Scheduled
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instant" className="space-y-6">
          <div className="rounded-xl border border-dashed border-border p-16">
            <div className="flex flex-col items-center justify-center">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Video className="size-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Start an instant meeting</h3>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                Create a meeting room immediately with video and audio. Invite participants via the room link.
              </p>
              <Button
                size="lg"
                onClick={handleInstantMeeting}
                disabled={creatingInstant || !socket}
                className="gap-2"
              >
                {creatingInstant ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Zap className="size-4" />
                )}
                {creatingInstant ? "Starting..." : "Start instant meeting"}
              </Button>
              {!socket && (
                <p className="text-xs text-muted-foreground mt-3">Connecting...</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border p-6">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Link2 className="size-4" />
              Join by meeting code
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enter a meeting code shared by the host to join.
            </p>
            <form onSubmit={handleJoinByCode} className="flex gap-2">
              <Input
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. ABC12345"
                className="max-w-xs font-mono uppercase"
                maxLength={12}
              />
              <Button type="submit" disabled={joiningByCode || !joinCodeInput.trim()}>
                {joiningByCode ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                Join
              </Button>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowScheduleForm(true)} className="gap-2">
              <Plus className="size-4" />
              Schedule meeting
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : upcomingMeetings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <Calendar className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                No upcoming meetings. Schedule one to get started.
              </p>
              <Button variant="outline" onClick={() => setShowScheduleForm(true)}>
                Schedule meeting
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingMeetings.map((m) => {
                const d = m.scheduled_at ? new Date(m.scheduled_at) : null;
                const timeStr = d
                  ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "--";
                const dateStr = d
                  ? d.toLocaleDateString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  : "--";
                const participants = (m.participants || []).map(
                  (p) =>
                    p.full_name ||
                    `${p.first_name || ""} ${p.last_name || ""}`.trim() ||
                    p.email ||
                    "User"
                );

                return (
                  <div key={m._id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{m.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3.5" />
                            {dateStr}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5" />
                            {timeStr} • {m.duration_minutes || 30} min
                          </span>
                          {participants.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="size-3.5" />
                              {participants.join(", ")}
                            </span>
                          )}
                        </div>
                        {m.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {m.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="px-2 py-0.5 rounded-md bg-muted text-xs font-medium">
                          {MEETING_TYPES.find((t) => t.value === m.meeting_type)?.label ||
                            m.meeting_type}
                        </span>
                        {canJoin(m) && (
                          <Button
                            size="sm"
                            onClick={() => handleJoinMeeting(m)}
                            className="gap-1"
                          >
                            <LogIn className="size-3.5" />
                            {isHost(m) ? "Start" : "Join"}
                          </Button>
                        )}
                        {!canJoin(m) && isHost(m) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelMeeting(m)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Schedule meeting dialog */}
      <Dialog open={showScheduleForm} onOpenChange={setShowScheduleForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule meeting</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleScheduleMeeting} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Team sync, client call..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.meeting_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, meeting_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEETING_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Select
                  value={String(form.duration_minutes)}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, duration_minutes: Number(v) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Participants (optional)</Label>
              <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1.5">
                {(employees || []).map((emp) => {
                  const id = emp._id || emp.id;
                  const name =
                    emp.full_name ||
                    `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
                    emp.email;
                  const selected = (form.participants || []).some(
                    (p) => String(p._id || p.id) === String(id)
                  );
                  return (
                    <label
                      key={id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          if (selected) {
                            setForm((f) => ({
                              ...f,
                              participants: (f.participants || []).filter(
                                (p) => String(p._id || p.id) !== String(id)
                              ),
                            }));
                          } else {
                            setForm((f) => ({
                              ...f,
                              participants: [...(f.participants || []), emp],
                            }));
                          }
                        }}
                        className="rounded"
                      />
                      {name}
                    </label>
                  );
                })}
                {employees.length === 0 && (
                  <p className="text-xs text-muted-foreground">No employees</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Meeting agenda..."
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowScheduleForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
