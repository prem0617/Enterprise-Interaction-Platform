import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  Loader2,
  Plus,
  Users,
  X,
  MessageCircle,
  Link2,
  Copy,
  LogIn,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Zap,
  Monitor,
  MonitorOff,
  Hand,
  Maximize,
  Minimize,
  PanelRightClose,
  PanelRightOpen,
  Pin,
  PinOff,
  Send,
  Trash2,
  Search,
  Filter,
  Radio,
  Circle,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { BACKEND_URL } from "../../config";
import { useAuthContext } from "../context/AuthContextProvider";
import { useMeetingCall } from "@/hooks/useMeetingCall";

// ---- Elapsed timer hook ----
function useElapsedTimer(startTime) {
  const [elapsed, setElapsed] = useState("00:00");
  useEffect(() => {
    if (!startTime) return;
    const start = new Date(startTime).getTime();
    const tick = () => {
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(
        h > 0
          ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
          : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  return elapsed;
}

const MEETING_TYPES = [
  { value: "internal", label: "Internal" },
  { value: "customer_consultation", label: "Customer Consultation" },
  { value: "support", label: "Customer Support" },
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

/** Local date as YYYY-MM-DD (no UTC shift). */
function toLocalDateString(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildMonthGrid(currentMonth) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < startWeekday; i += 1) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    days.push(new Date(year, month, d));
  }
  return days;
}

function getInitials(name) {
  return (name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getRelativeTime(dateStr) {
  if (!dateStr) return "";
  const now = Date.now();
  const target = new Date(dateStr).getTime();
  const diffMs = target - now;
  const absDiff = Math.abs(diffMs);
  const minutes = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);

  if (diffMs > 0) {
    // Future
    if (minutes < 1) return "starting now";
    if (minutes < 60) return `in ${minutes} min`;
    if (hours < 24) return `in ${hours}h ${minutes % 60}m`;
    return `in ${days} day${days !== 1 ? "s" : ""}`;
  } else {
    // Past
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }
}

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "scheduled", label: "Upcoming" },
  { value: "active", label: "Active" },
  { value: "ended", label: "Ended" },
  { value: "cancelled", label: "Cancelled" },
];

// ======================== Meeting Room Component ========================
const MeetingRoom = ({
  activeMeeting,
  roomParticipants,
  currentUserId,
  currentUserName,
  meetingCall,
  displayLocalStream,
  localVideoRef,
  videoRefs,
  chatMessages,
  chatInput,
  setChatInput,
  handleSendChat,
  chatContainerRef,
  copyMeetingLink,
  handleLeaveMeeting,
  onUploadRecordings,
  lobbyRequests = [],
  onAdmitToLobby,
}) => {
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState("chat"); // "chat" | "participants"
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pinnedUserId, setPinnedUserId] = useState(null);
  const [lobbyBoxOpen, setLobbyBoxOpen] = useState(false);
  const [uploadingRecordings, setUploadingRecordings] = useState(false);
  const containerRef = useRef(null);

  const handleRecordingToggle = async () => {
    if (meetingCall.isRecording) {
      const segments = await meetingCall.stopRecording();
      if (segments.length > 0 && onUploadRecordings) {
        setUploadingRecordings(true);
        try {
          await onUploadRecordings(activeMeeting._id, segments);
          toast.success("Recordings uploaded");
        } catch (e) {
          toast.error("Failed to upload some recordings");
        } finally {
          setUploadingRecordings(false);
        }
      }
    } else {
      meetingCall.startRecording(roomParticipants);
    }
  };

  const elapsed = useElapsedTimer(
    activeMeeting.started_at || activeMeeting.scheduled_at
  );

  const remoteParticipants = roomParticipants.filter(
    (p) => String(p.userId) !== String(currentUserId)
  );
  const participantCount = Math.max(1, roomParticipants.length);

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Auto-pin screen-sharer
  useEffect(() => {
    if (meetingCall.screenShareUserId) {
      setPinnedUserId(meetingCall.screenShareUserId);
    } else {
      setPinnedUserId(null);
    }
  }, [meetingCall.screenShareUserId]);

  const togglePin = (userId) => {
    setPinnedUserId((prev) => (prev === userId ? null : userId));
  };

  // Build video tiles
  const allTiles = [];

  // Local tile
  if (displayLocalStream) {
    allTiles.push({
      id: String(currentUserId),
      name: "You",
      isLocal: true,
      stream: displayLocalStream,
      isMuted: meetingCall.isMuted,
      isVideoOff: meetingCall.isVideoOff,
      handRaised: meetingCall.handRaised,
      isScreenSharing:
        meetingCall.isScreenSharing &&
        meetingCall.screenShareUserId === String(currentUserId),
      isHost: activeMeeting.isHost,
    });
  }

  // Remote tiles: camera + optional screen tile when sharing
  remoteParticipants.forEach((p) => {
    const uid = String(p.userId);
    const rState = meetingCall.remoteMediaStates[uid] || {};
    const screenStream = meetingCall.remoteScreenStreams?.[uid];
    const isSharing = meetingCall.screenShareUserId === uid;
    allTiles.push({
      id: uid,
      name: p.name || "User",
      isLocal: false,
      stream: meetingCall.remoteStreams[uid] || null,
      isMuted: rState.isMuted ?? false,
      isVideoOff: rState.isVideoOff ?? false,
      handRaised: rState.handRaised ?? false,
      isScreenSharing: false,
      isHost: false,
    });
    if (isSharing && screenStream) {
      allTiles.push({
        id: `${uid}-screen`,
        name: `${p.name || "User"} (screen)`,
        isLocal: false,
        stream: screenStream,
        isMuted: rState.isMuted ?? false,
        isVideoOff: false,
        handRaised: rState.handRaised ?? false,
        isScreenSharing: true,
        isHost: false,
      });
    }
  });

  // Layout: if pinned, pinned tile is large, rest are small strip on side
  const pinnedTile = pinnedUserId
    ? allTiles.find((t) => t.id === pinnedUserId)
    : null;
  const unpinnedTiles = pinnedTile
    ? allTiles.filter((t) => t.id !== pinnedUserId)
    : allTiles;

  const totalUnpinned = unpinnedTiles.length;
  const gridCols = pinnedTile ? 1 : Math.min(3, Math.max(1, totalUnpinned));
  const gridRows = pinnedTile ? 1 : Math.ceil(totalUnpinned / gridCols) || 1;

  // Unread chat counter
  const [unreadChat, setUnreadChat] = useState(0);
  const lastChatCountRef = useRef(chatMessages.length);

  useEffect(() => {
    if (sidebarTab === "chat" && showSidebar) {
      setUnreadChat(0);
      lastChatCountRef.current = chatMessages.length;
    } else if (chatMessages.length > lastChatCountRef.current) {
      setUnreadChat(
        (prev) => prev + (chatMessages.length - lastChatCountRef.current)
      );
      lastChatCountRef.current = chatMessages.length;
    }
  }, [chatMessages.length, sidebarTab, showSidebar]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Only trigger if not typing in an input
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      )
        return;
      if (e.key === "m" || e.key === "M") meetingCall.toggleMute();
      if (e.key === "v" || e.key === "V") meetingCall.toggleVideo();
      if (e.key === "s" || e.key === "S") meetingCall.toggleScreenShare();
      if (e.key === "h" || e.key === "H") meetingCall.toggleHandRaise();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [meetingCall]);

  // Surface screen-share / media errors as toasts
  useEffect(() => {
    if (meetingCall.mediaError) {
      toast.error(meetingCall.mediaError, { duration: 6000 });
    }
  }, [meetingCall.mediaError]);

  const renderTile = (tile, className = "") => {
    const refCb = (el) => {
      if (tile.isLocal) {
        localVideoRef.current = el;
      } else {
        videoRefs.current[tile.id] = el;
      }
      if (el && tile.stream && el.srcObject !== tile.stream) {
        el.srcObject = tile.stream;
        el.play().catch(() => {});
      }
    };

    return (
      <div
        key={tile.id}
        className={`relative bg-zinc-900 rounded-xl overflow-hidden border border-zinc-700/60 group ${className}`}
      >
        {tile.stream && !tile.isVideoOff ? (
          <video
            ref={refCb}
            autoPlay
            playsInline
            muted={tile.isLocal}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800/90">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-2">
                <span className="text-indigo-400 font-semibold text-3xl">
                  {getInitials(tile.name)}
                </span>
              </div>
              <p className="text-white text-sm font-medium">{tile.name}</p>
              {!tile.stream && !tile.isLocal && (
                <p className="text-xs text-zinc-500 mt-0.5">Connecting...</p>
              )}
            </div>
          </div>
        )}
        {/* Attach video even when hidden so stream is received */}
        {tile.stream && tile.isVideoOff && (
          <video
            ref={refCb}
            autoPlay
            playsInline
            muted={tile.isLocal}
            className="hidden"
          />
        )}

        {/* Bottom bar overlay */}
        <div className="absolute bottom-0 inset-x-0 px-3 py-1.5 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white text-xs font-medium truncate max-w-[120px]">
              {tile.name}
              {tile.isHost && (
                <span className="ml-1 text-[10px] text-amber-400">(host)</span>
              )}
            </span>
            {tile.isMuted && (
              <MicOff className="w-3 h-3 text-red-400 flex-shrink-0" />
            )}
            {tile.isVideoOff && (
              <VideoOff className="w-3 h-3 text-red-400 flex-shrink-0" />
            )}
            {tile.isScreenSharing && (
              <Monitor className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            )}
          </div>
          {tile.handRaised && (
            <span className="text-amber-400 animate-bounce">
              <Hand className="w-4 h-4" />
            </span>
          )}
        </div>

        {/* Pin button */}
        <button
          type="button"
          onClick={() => togglePin(tile.id)}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-zinc-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          title={pinnedUserId === tile.id ? "Unpin" : "Pin"}
        >
          {pinnedUserId === tile.id ? (
            <PinOff className="w-3.5 h-3.5" />
          ) : (
            <Pin className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    );
  };

  return (
    <>
      {/* Join requests popup - centered window */}
      {lobbyBoxOpen && activeMeeting.isHost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setLobbyBoxOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-xl border border-zinc-600 bg-zinc-900 shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-800/80">
              <h3 className="text-sm font-semibold text-white">Join requests</h3>
              <button
                type="button"
                onClick={() => setLobbyBoxOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto p-3">
              {lobbyRequests.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-6">No one waiting to join</p>
              ) : (
                <ul className="space-y-2">
                  {lobbyRequests.map((r) => (
                    <li
                      key={r.userId}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-800"
                    >
                      <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-sm text-amber-200 font-medium flex-shrink-0">
                        {getInitials(r.name)}
                      </div>
                      <p className="flex-1 text-sm font-medium text-zinc-100 truncate min-w-0">
                        {r.name || "Guest"}
                      </p>
                      {onAdmitToLobby && (
                        <button
                          type="button"
                          onClick={() => onAdmitToLobby(r.userId)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 flex-shrink-0"
                        >
                          Admit
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 flex flex-col min-h-0 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden"
      >
      {/* ---- Top bar ---- */}
      <div className="h-12 px-4 border-b border-zinc-800 flex items-center justify-between flex-shrink-0 bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-full bg-indigo-500/80 flex items-center justify-center flex-shrink-0">
            <Video className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">
              {activeMeeting.title}
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span>{elapsed}</span>
              <span>&bull;</span>
              <span>
                {participantCount} participant
                {participantCount !== 1 ? "s" : ""}
              </span>
              {activeMeeting.isHost && activeMeeting.meeting_code && (
                <>
                  <span>&bull;</span>
                  <span className="font-mono text-zinc-400">
                    {activeMeeting.meeting_code}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyMeetingLink(activeMeeting)}
                    className="p-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
                    title="Copy invite link"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowSidebar((s) => !s)}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors relative"
            title={showSidebar ? "Hide sidebar" : "Show sidebar"}
          >
            {showSidebar ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
            {!showSidebar && unreadChat > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-indigo-500 text-[9px] text-white flex items-center justify-center font-bold">
                {unreadChat > 9 ? "9+" : unreadChat}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ---- Main content area ---- */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <div className="flex-1 p-2 min-h-0 flex gap-2">
            {pinnedTile ? (
              <>
                {/* Pinned large view */}
                <div className="flex-1 min-h-0 min-w-0">
                  {renderTile(pinnedTile, "w-full h-full")}
                </div>
                {/* Unpinned strip */}
                {unpinnedTiles.length > 0 && (
                  <div className="w-44 flex flex-col gap-2 overflow-y-auto">
                    {unpinnedTiles.map((t) =>
                      renderTile(t, "w-full aspect-video flex-shrink-0")
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Grid layout */
              <div
                className="flex-1 grid gap-2 min-h-0 min-w-0"
                style={{
                  gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
                }}
              >
                {unpinnedTiles.map((t) => renderTile(t, "min-h-[180px]"))}
              </div>
            )}
          </div>

          {/* ---- Bottom control bar ---- */}
          <div className="h-16 flex-shrink-0 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="flex items-center gap-2">
              {/* Mute */}
              <button
                type="button"
                onClick={meetingCall.toggleMute}
                title={meetingCall.isMuted ? "Unmute (m)" : "Mute (m)"}
                className={`p-3 rounded-full transition-colors ${
                  meetingCall.isMuted
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                {meetingCall.isMuted ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              {/* Camera */}
              <button
                type="button"
                onClick={meetingCall.toggleVideo}
                title={
                  meetingCall.isVideoOff
                    ? "Turn on camera (v)"
                    : "Turn off camera (v)"
                }
                className={`p-3 rounded-full transition-colors ${
                  meetingCall.isVideoOff
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                {meetingCall.isVideoOff ? (
                  <VideoOff className="w-5 h-5" />
                ) : (
                  <Video className="w-5 h-5" />
                )}
              </button>

              {/* Screen share */}
              <button
                type="button"
                onClick={meetingCall.toggleScreenShare}
                title={
                  meetingCall.isScreenSharing ? "Stop sharing" : "Share screen"
                }
                className={`p-3 rounded-full transition-colors ${
                  meetingCall.isScreenSharing
                    ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                {meetingCall.isScreenSharing ? (
                  <MonitorOff className="w-5 h-5" />
                ) : (
                  <Monitor className="w-5 h-5" />
                )}
              </button>

              {/* Hand raise */}
              <button
                type="button"
                onClick={meetingCall.toggleHandRaise}
                title={meetingCall.handRaised ? "Lower hand" : "Raise hand"}
                className={`p-3 rounded-full transition-colors ${
                  meetingCall.handRaised
                    ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                <Hand className="w-5 h-5" />
              </button>

              {/* Recording (host only) */}
              {activeMeeting.isHost && (
                <button
                  type="button"
                  onClick={handleRecordingToggle}
                  disabled={uploadingRecordings}
                  title={
                    meetingCall.isRecording
                      ? "Stop recording"
                      : "Start recording (saves to cloud)"
                  }
                  className={`p-3 rounded-full transition-colors ${
                    meetingCall.isRecording
                      ? "bg-red-500/30 text-red-400 hover:bg-red-500/40"
                      : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  } ${uploadingRecordings ? "opacity-50 pointer-events-none" : ""}`}
                >
                  {uploadingRecordings ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Circle
                      className={`w-5 h-5 ${meetingCall.isRecording ? "fill-current" : ""}`}
                    />
                  )}
                </button>
              )}

              <div className="w-px h-8 bg-zinc-700 mx-1" />

              {/* Leave / End */}
              <button
                type="button"
                onClick={handleLeaveMeeting}
                className="px-4 py-2.5 rounded-full bg-red-600 text-white hover:bg-red-500 flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <PhoneOff className="w-4 h-4" />
                {activeMeeting.isHost ? "End" : "Leave"}
              </button>
            </div>
          </div>
        </div>

        {/* ---- Sidebar ---- */}
        {showSidebar && (
          <div className="w-80 border-l border-zinc-800 flex flex-col bg-zinc-900/60">
            {/* Sidebar tabs */}
            <div className="flex border-b border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setSidebarTab("chat");
                  setUnreadChat(0);
                }}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  sidebarTab === "chat"
                    ? "text-white border-b-2 border-indigo-500"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Chat
                {unreadChat > 0 && sidebarTab !== "chat" && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-500 text-[9px] text-white font-bold">
                    {unreadChat}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab("participants")}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  sidebarTab === "participants"
                    ? "text-white border-b-2 border-indigo-500"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                People ({participantCount})
                {activeMeeting.isHost && lobbyRequests.length > 0 && (
                  <span
                    className="ml-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                    title={`${lobbyRequests.length} waiting to join`}
                  >
                    {lobbyRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab content */}
            {sidebarTab === "participants" ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 relative">
                {/* Join requests button (host only) */}
                {activeMeeting.isHost && (
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={() => setLobbyBoxOpen(true)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors ${
                        lobbyRequests.length > 0
                          ? "bg-amber-500/15 border border-amber-500/40 text-amber-200 hover:bg-amber-500/25"
                          : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      <span>Join requests</span>
                      {lobbyRequests.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/30 text-xs font-semibold text-amber-100">
                          {lobbyRequests.length}
                        </span>
                      )}
                    </button>
                  </div>
                )}

                {/* Current user */}
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-800/80">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/30 flex items-center justify-center text-xs text-indigo-200 font-medium">
                    {getInitials(currentUserName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">
                      {currentUserName}
                    </p>
                    <p className="text-[10px] text-emerald-400">
                      You {activeMeeting.isHost ? "(host)" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {meetingCall.isMuted && (
                      <MicOff className="w-3 h-3 text-red-400" />
                    )}
                    {meetingCall.isVideoOff && (
                      <VideoOff className="w-3 h-3 text-red-400" />
                    )}
                    {meetingCall.handRaised && (
                      <Hand className="w-3 h-3 text-amber-400" />
                    )}
                    {meetingCall.isScreenSharing && (
                      <Monitor className="w-3 h-3 text-emerald-400" />
                    )}
                  </div>
                </div>

                {/* Remote participants */}
                {remoteParticipants.map((p) => {
                  const uid = String(p.userId);
                  const rState = meetingCall.remoteMediaStates[uid] || {};
                  return (
                    <div
                      key={uid}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-800/40 hover:bg-zinc-800/60 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-100 font-medium">
                        {getInitials(p.name)}
                      </div>
                      <p className="flex-1 text-xs font-medium text-zinc-100 truncate">
                        {p.name || "User"}
                      </p>
                      <div className="flex items-center gap-1">
                        {rState.isMuted && (
                          <MicOff className="w-3 h-3 text-red-400" />
                        )}
                        {rState.isVideoOff && (
                          <VideoOff className="w-3 h-3 text-red-400" />
                        )}
                        {rState.handRaised && (
                          <Hand className="w-3 h-3 text-amber-400 animate-bounce" />
                        )}
                        {meetingCall.screenShareUserId === uid && (
                          <Monitor className="w-3 h-3 text-emerald-400" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Chat tab */
              <div className="flex-1 flex flex-col min-h-0">
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-3 space-y-3"
                >
                  {chatMessages.length === 0 && (
                    <div className="text-center py-8">
                      <MessageCircle className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                      <p className="text-xs text-zinc-500">
                        No messages yet. Say hello!
                      </p>
                    </div>
                  )}
                  {chatMessages.map((msg) => {
                    const isOwn = String(msg.userId) === String(currentUserId);
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isOwn ? "items-end" : "items-start"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-medium text-zinc-400">
                            {isOwn ? "You" : msg.name}
                          </span>
                          <span className="text-[9px] text-zinc-600">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div
                          className={`px-3 py-1.5 rounded-xl text-xs max-w-[85%] ${
                            isOwn
                              ? "bg-indigo-600 text-white rounded-br-sm"
                              : "bg-zinc-800 text-zinc-200 rounded-bl-sm"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form
                  onSubmit={handleSendChat}
                  className="p-3 border-t border-zinc-800 flex gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

const MeetingModule = () => {
  const { socket, user } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() =>
    startOfDay(new Date())
  );
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingInstant, setCreatingInstant] = useState(false);
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
  const [meetingSearchQuery, setMeetingSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showInstantMeetingDialog, setShowInstantMeetingDialog] = useState(false);
  const [lobbyMeeting, setLobbyMeeting] = useState(null);
  const [lobbyRequests, setLobbyRequests] = useState([]);
  const [recordingsExpandedId, setRecordingsExpandedId] = useState(null);
  const [recordingsByMeeting, setRecordingsByMeeting] = useState({});
  const [loadingRecordingsId, setLoadingRecordingsId] = useState(null);

  const videoRefs = useRef({});
  const localVideoRef = useRef(null);
  const chatContainerRef = useRef(null);
  const participantSearchTimeoutRef = useRef(null);

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
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
      user.email ||
      "You"
    : "You";

  const meetingCall = useMeetingCall(
    socket,
    currentUserId,
    currentUserName,
    activeMeeting?._id,
    roomParticipants,
    activeMeeting?.isHost ?? false
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

  // ---- Computed values ----
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
      const d = new Date(m.scheduled_at);
      const key = toLocalDateString(d);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [meetings]);

  const selectedDateMeetings = useMemo(() => {
    let filtered = meetings.filter((m) =>
      m.scheduled_at ? isSameDay(new Date(m.scheduled_at), selectedDate) : false
    );
    if (statusFilter !== "all") {
      filtered = filtered.filter((m) => m.status === statusFilter);
    }
    if (meetingSearchQuery.trim()) {
      const q = meetingSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title?.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.meeting_code?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [meetings, selectedDate, statusFilter, meetingSearchQuery]);

  // ---- Data loading ----
  const loadMeetings = async (dateAnchor) => {
    try {
      setLoading(true);
      const from = new Date(dateAnchor || currentMonth);
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

  // ---- Real-time meeting sync (created/updated/cancelled by others) ----
  useEffect(() => {
    if (!socket) return;

    const handleSync = ({ event, meeting }) => {
      if (!meeting) return;
      setMeetings((prev) => {
        if (event === "deleted") {
          return prev.filter((m) => m._id !== meeting._id);
        }
        // Prevent duplicates — if the meeting already exists, update it
        const exists = prev.some((m) => m._id === meeting._id);
        if (event === "created") {
          return exists
            ? prev.map((m) => (m._id === meeting._id ? meeting : m))
            : [...prev, meeting];
        }
        if (event === "updated") {
          return prev.map((m) => (m._id === meeting._id ? meeting : m));
        }
        if (event === "cancelled") {
          return prev.map((m) =>
            m._id === meeting._id ? { ...m, status: "cancelled" } : m
          );
        }
        return prev;
      });
    };

    socket.on("meeting-sync", handleSync);
    return () => socket.off("meeting-sync", handleSync);
  }, [socket]);

  // ---- Meeting reminders ----
  useEffect(() => {
    if (!socket) return;

    const handleReminder = (payload) => {
      toast(
        (t) => (
          <div className="text-left">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-white">
                Upcoming meeting
              </span>
            </div>
            <p className="text-sm text-zinc-200">{payload.title}</p>
            <p className="text-xs text-zinc-400">
              Starts in {payload.minutes_before} minutes
            </p>
          </div>
        ),
        {
          duration: 8000,
          id: `meeting-${payload.meetingId}-${payload.minutes_before}`,
        }
      );
    };

    socket.on("meeting-reminder", handleReminder);
    return () => {
      socket.off("meeting-reminder", handleReminder);
    };
  }, [socket]);

  // ---- Meeting room socket events ----
  useEffect(() => {
    if (!socket) return;

    const handleParticipants = (payload) => {
      if (!activeMeeting || String(payload.meetingId) !== String(activeMeeting._id)) return;
      setRoomParticipants(payload.participants || []);
    };

    const handleMessage = (payload) => {
      if (!activeMeeting || String(payload.meetingId) !== String(activeMeeting._id)) return;
      if (!payload.message) return;
      // Prevent duplicate: ignore messages we sent locally
      if (
        String(payload.message.userId) === String(currentUserId) &&
        payload.message.id
      ) {
        setChatMessages((prev) => {
          // If we already have this message (from local add), skip it
          if (prev.some((m) => m.id === payload.message.id)) return prev;
          return [...prev, payload.message];
        });
        return;
      }
      setChatMessages((prev) => [...prev, payload.message]);
    };

    const handleEnded = (payload) => {
      if (!activeMeeting || String(payload.meetingId) !== String(activeMeeting._id)) return;
      toast("Meeting ended by host", { icon: "ℹ️" });
      if (localMediaStream) {
        localMediaStream.getTracks().forEach((t) => t.stop());
        setLocalMediaStream(null);
      }
      meetingCall.cleanup();
      setActiveMeeting(null);
      setLobbyRequests([]);
      setRoomParticipants([]);
      setChatMessages([]);
      setChatInput("");
    };

    const handleLobbyRequest = (payload) => {
      if (!activeMeeting || String(payload.meetingId) !== String(activeMeeting._id)) return;
      setLobbyRequests((prev) => {
        if (prev.some((r) => r.userId === payload.userId)) return prev;
        return [...prev, { userId: payload.userId, name: payload.name }];
      });
    };
    const handleLobbyLeft = (payload) => {
      if (!activeMeeting || String(payload.meetingId) !== String(activeMeeting._id)) return;
      setLobbyRequests((prev) => prev.filter((r) => r.userId !== payload.userId));
    };

    socket.on("meeting-participants", handleParticipants);
    socket.on("meeting-message", handleMessage);
    socket.on("meeting-ended", handleEnded);
    socket.on("meeting-lobby-request", handleLobbyRequest);
    socket.on("meeting-lobby-left", handleLobbyLeft);

    return () => {
      socket.off("meeting-participants", handleParticipants);
      socket.off("meeting-message", handleMessage);
      socket.off("meeting-ended", handleEnded);
      socket.off("meeting-lobby-request", handleLobbyRequest);
      socket.off("meeting-lobby-left", handleLobbyLeft);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, activeMeeting, currentUserId]);

  // Guest in lobby: listen for admission or meeting ended
  useEffect(() => {
    if (!socket || !lobbyMeeting) return;
    const handleAdmitted = (payload) => {
      if (payload.meetingId !== lobbyMeeting._id) return;
      const meetingToEnter = lobbyMeeting;
      setLobbyMeeting(null);
      (async () => {
        try {
          const code = meetingToEnter.meeting_code || meetingToEnter.code;
          const { data } = await axios.get(
            `${BACKEND_URL}/meetings/join?code=${encodeURIComponent(String(code).toUpperCase())}`,
            axiosConfig
          );
          const meeting = data.data;
          setMeetings((prev) => {
            const exists = prev.some((m) => m._id === meeting._id);
            if (exists) return prev.map((m) => (m._id === meeting._id ? meeting : m));
            return [...prev, meeting];
          });
          await handleEnterMeeting(meeting);
        } catch (err) {
          toast.error(err.response?.data?.error || "Failed to join after admission");
        }
      })();
    };
    const handleEndedWhileInLobby = (payload) => {
      if (String(payload.meetingId) !== String(lobbyMeeting._id)) return;
      setLobbyMeeting(null);
      toast.info("The meeting has ended.");
    };
    socket.on("meeting-admitted", handleAdmitted);
    socket.on("meeting-ended", handleEndedWhileInLobby);
    return () => {
      socket.off("meeting-admitted", handleAdmitted);
      socket.off("meeting-ended", handleEndedWhileInLobby);
    };
  }, [socket, lobbyMeeting, axiosConfig]);

  // ---- Join from link: when URL has joinCode, auto-join (meeting/lobby shown in Meeting tab) ----
  const hasAutoJoinedRef = useRef(false);
  useEffect(() => {
    const joinCode = searchParams.get("joinCode");
    if (!joinCode) {
      hasAutoJoinedRef.current = false;
      return;
    }
    if (hasAutoJoinedRef.current) return;
    hasAutoJoinedRef.current = true;
    const code = String(joinCode).trim().toUpperCase();
    setJoinCodeInput(code);

    (async () => {
      if (!socket) {
        toast.error("Connecting... Please wait");
        hasAutoJoinedRef.current = false;
        setSearchParams({}, { replace: true });
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
        if (meeting.status === "ended") {
          toast.error("This meeting has already ended");
          return;
        }
        setJoinCodeInput("");
        setMeetings((prev) => {
          const exists = prev.some((m) => m._id === meeting._id);
          if (exists) return prev.map((m) => (m._id === meeting._id ? meeting : m));
          return [...prev, meeting];
        });
        if (meeting.open_to_everyone === false) {
          setLobbyMeeting(meeting);
          socket.emit("meeting-join-request", {
            meetingId: meeting._id,
            name: currentUserName,
          });
          toast.info("Waiting for the host to admit you.");
        } else {
          await handleEnterMeeting(meeting);
        }
      } catch (err) {
        const msg =
          err.response?.data?.error ||
          (err.response?.status === 404 ? "Meeting not found" : "Failed to join");
        toast.error(msg);
      } finally {
        setJoiningByCode(false);
        setSearchParams({}, { replace: true });
      }
    })();
  }, [searchParams]);

  // ---- Form helpers ----
  const openCreateForm = () => {
    const dateStr = toLocalDateString(selectedDate);
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
      date: d ? toLocalDateString(d) : "",
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
        `${BACKEND_URL}/direct_chat/search?query=${encodeURIComponent(query.trim())}`,
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

  // Debounced search by name/email (same pattern as chat module)
  const handleParticipantSearchInput = useCallback(
    (e) => {
      const query = e.target.value;
      setSearchQuery(query);
      if (participantSearchTimeoutRef.current) {
        clearTimeout(participantSearchTimeoutRef.current);
      }
      if (!query.trim()) {
        setSearchResults([]);
        setSearchError("");
        return;
      }
      participantSearchTimeoutRef.current = setTimeout(() => {
        searchUsers(query);
      }, 300);
    },
    []
  );

  const addParticipant = (u) => {
    setForm((prev) => {
      if (prev.participants.some((p) => p._id === u._id)) return prev;
      return {
        ...prev,
        participants: [
          ...prev.participants,
          {
            _id: u._id,
            full_name: u.full_name,
            email: u.email,
          },
        ],
      };
    });
  };

  // ---- Create / Edit meeting ----
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
    const scheduledAt = new Date(`${form.date}T${form.time}:00`);
    if (scheduledAt.getTime() < Date.now()) {
      toast.error("Schedule date and time must be in the future");
      return;
    }

    try {
      setCreating(true);
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
        setMeetings((prev) => {
          if (prev.some((m) => m._id === created._id)) return prev;
          return [...prev, created];
        });
        toast.success("Meeting created");
      }

      resetFormState();
    } catch (error) {
      console.error("Failed to save meeting", error);
      const msg =
        error.response?.data?.error ||
        (editingMeeting
          ? "Failed to update meeting"
          : "Failed to create meeting");
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  // ---- Instant meeting: dialog then start ----
  const startInstantMeetingFlow = () => {
    setShowInstantMeetingDialog(true);
  };

  const handleInstantMeeting = async (openToEveryone = true) => {
    setShowInstantMeetingDialog(false);
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
          title: `Instant Meeting ${now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          meeting_type: "internal",
          scheduled_at: now.toISOString(),
          duration_minutes: 30,
          participants: [],
          open_to_everyone: openToEveryone,
        },
        axiosConfig
      );
      const meeting = data.data;
      setMeetings((prev) => {
        if (prev.some((m) => m._id === meeting._id)) return prev;
        return [...prev, meeting];
      });
      setActiveMeeting({ ...meeting, isHost: true });
      setChatMessages([]);
      setChatInput("");
      socket.emit("meeting-join", {
        meetingId: String(meeting._id),
        name: currentUserName,
      });
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
      toast.success("Meeting started. Copy the link below to invite others.");
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

  // ---- Cancel meeting ----
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

  // ---- Delete meeting permanently ----
  const handleDeleteMeeting = async (meeting) => {
    if (
      !window.confirm("Permanently delete this meeting? This cannot be undone.")
    )
      return;
    try {
      await axios.delete(
        `${BACKEND_URL}/meetings/${meeting._id}/permanent`,
        axiosConfig
      );
      setMeetings((prev) => prev.filter((m) => m._id !== meeting._id));
      toast.success("Meeting deleted");
    } catch (error) {
      console.error("Failed to delete meeting", error);
      toast.error(error.response?.data?.error || "Failed to delete meeting");
    }
  };

  // ---- Calendar helpers ----
  const changeMonth = (offset) => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + offset);
      return new Date(next.getFullYear(), next.getMonth(), 1);
    });
  };

  const today = startOfDay(new Date());
  const todayLocalStr = toLocalDateString(today);
  // Derived only from calendar-clicked date: true when selected day is before today (date-only)
  const isSelectedDatePast = useMemo(() => {
    const sy = selectedDate.getFullYear();
    const sm = selectedDate.getMonth();
    const sd = selectedDate.getDate();
    const now = new Date();
    const ty = now.getFullYear();
    const tm = now.getMonth();
    const td = now.getDate();
    if (sy !== ty) return sy < ty;
    if (sm !== tm) return sm < tm;
    return sd < td;
  }, [selectedDate]);

  const handleCalendarDayClick = useCallback((day) => {
    const dateAtMidnight = startOfDay(day);
    setSelectedDate(dateAtMidnight);
  }, []);

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
    if (meeting.status === "cancelled" || meeting.status === "ended")
      return false;
    // Active meetings can always be entered
    if (meeting.status === "active") return true;
    // Scheduled meetings: allow entry 5 minutes before start, or if host
    if (!meeting.scheduled_at) return false;
    const start = new Date(meeting.scheduled_at).getTime();
    const now = Date.now();
    const earlyJoinMs = 5 * 60 * 1000; // 5 minutes early
    return now >= start - earlyJoinMs;
  };

  // ---- Enter / Leave meeting room ----
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
        meeting = { ...updated };
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

    const meetingIdStr = String(meeting._id);
    if (!host) {
      const hostId = meeting.host_id?._id ?? meeting.host_id;
      const hostName =
        (meeting.host_id?.first_name || meeting.host_id?.last_name)
          ? `${meeting.host_id?.first_name || ""} ${meeting.host_id?.last_name || ""}`.trim()
          : (meeting.host_id?.email || "Host");
      setRoomParticipants([
        { userId: String(hostId), name: hostName },
        { userId: String(currentUserId), name: currentUserName },
      ]);
    }

    socket.emit("meeting-join", {
      meetingId: meetingIdStr,
      name: currentUserName,
    });
  };

  const handleLeaveMeeting = async () => {
    if (!activeMeeting || !socket) {
      setActiveMeeting(null);
      return;
    }
    // Confirm before ending if host
    if (activeMeeting.isHost) {
      if (!window.confirm("End this meeting for all participants?")) return;
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

  // ---- Parse meeting code from input (raw code or full join URL) ----
  const parseMeetingCodeFromInput = (input) => {
    const raw = String(input || "").trim();
    if (!raw) return "";
    const joinMatch = raw.match(/\/join\/([A-Za-z0-9_-]+)/i);
    if (joinMatch) return joinMatch[1].toUpperCase();
    return raw.toUpperCase().replace(/\s/g, "").slice(0, 20);
  };

  // ---- Join by code or link ----
  const handleJoinByCode = async (e) => {
    e?.preventDefault?.();
    const code = parseMeetingCodeFromInput(joinCodeInput);
    if (!code) {
      toast.error("Enter a meeting code or paste the meeting link");
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
      if (meeting.status === "ended") {
        toast.error("This meeting has already ended");
        return;
      }
      setJoinCodeInput("");
      setMeetings((prev) => {
        const exists = prev.some((m) => m._id === meeting._id);
        if (exists)
          return prev.map((m) => (m._id === meeting._id ? meeting : m));
        return [...prev, meeting];
      });
      if (meeting.open_to_everyone === false) {
        setLobbyMeeting(meeting);
        socket.emit("meeting-join-request", {
          meetingId: meeting._id,
          name: currentUserName,
        });
        toast.info("Waiting for the host to admit you.");
        return;
      }
      await handleEnterMeeting(meeting);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        (err.response?.status === 404 ? "Meeting not found" : "Failed to join");
      toast.error(msg);
    } finally {
      setJoiningByCode(false);
    }
  };

  // ---- Share link helpers ----
  const getMeetingJoinLink = (meeting) => {
    const code = meeting?.meeting_code || meeting?.code;
    if (!code) return "";
    return `${window.location.origin}/join/${code}`;
  };

  const copyMeetingLink = (meeting) => {
    const link = getMeetingJoinLink(meeting);
    if (!link) return;
    navigator.clipboard
      .writeText(link)
      .then(() => toast.success("Link copied to clipboard", { duration: 500 }));
  };

  const handleUploadRecordings = useCallback(
    async (meetingId, segments) => {
      for (const seg of segments) {
        const form = new FormData();
        const recordingBlob = seg.blob.type && seg.blob.type.startsWith("video/")
          ? seg.blob
          : new Blob([seg.blob], { type: "video/webm" });
        form.append("recording", recordingBlob, `recording-${seg.participantId}-${seg.type}.webm`);
        form.append("participant_id", seg.participantId);
        form.append("participant_name", seg.participantName);
        form.append("type", seg.type);
        form.append("started_at", seg.startedAt.toISOString());
        form.append("ended_at", seg.endedAt.toISOString());
        await axios.post(`${BACKEND_URL}/meetings/${meetingId}/recordings`, form, {
          headers: {
            ...axiosConfig.headers,
          },
        });
      }
    },
    [axiosConfig]
  );

  const fetchMeetingRecordings = useCallback(
    async (meetingId) => {
      setLoadingRecordingsId(meetingId);
      try {
        const { data } = await axios.get(
          `${BACKEND_URL}/meetings/${meetingId}/recordings`,
          axiosConfig
        );
        setRecordingsByMeeting((prev) => ({ ...prev, [meetingId]: data.data || [] }));
      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to load recordings");
        setRecordingsByMeeting((prev) => ({ ...prev, [meetingId]: [] }));
      } finally {
        setLoadingRecordingsId(null);
      }
    },
    [axiosConfig]
  );

  const toggleRecordings = useCallback(
    (meetingId) => {
      const next = recordingsExpandedId === meetingId ? null : meetingId;
      setRecordingsExpandedId(next);
      if (next) fetchMeetingRecordings(next);
    },
    [recordingsExpandedId, fetchMeetingRecordings]
  );

  const handleAdmitToLobby = async (userId) => {
    if (!activeMeeting?.isHost || !socket) return;
    try {
      await axios.post(
        `${BACKEND_URL}/meetings/${activeMeeting._id}/admit`,
        { userId },
        axiosConfig
      );
      socket.emit("meeting-admit", {
        meetingId: activeMeeting._id,
        userId,
      });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to admit");
    }
  };

  // ---- In-meeting chat ----
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

  // ---- Scroll chat to bottom on new messages ----
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // ---- Video stream attachment ----
  const displayLocalStream = localMediaStream || meetingCall.localStream;

  useEffect(() => {
    if (!displayLocalStream || !localVideoRef.current) return;
    const video = localVideoRef.current;
    if (video.srcObject !== displayLocalStream) {
      video.srcObject = displayLocalStream;
      video.play().catch(() => {});
    }
    return () => {
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
    };
  }, [displayLocalStream]);

  useEffect(() => {
    const allRemote = {
      ...meetingCall.remoteStreams,
      ...Object.fromEntries(
        Object.entries(meetingCall.remoteScreenStreams || {}).map(([k, v]) => [`${k}-screen`, v])
      ),
    };
    Object.entries(allRemote).forEach(([userId, stream]) => {
      const videoEl = videoRefs.current[userId];
      if (videoEl && stream) {
        if (videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
          videoEl.play().catch(() => {});
        }
      }
    });
  }, [meetingCall.remoteStreams, meetingCall.remoteScreenStreams]);

  // ======================== RENDER ========================

  // ---- Guest waiting in lobby ----
  if (lobbyMeeting) {
    return (
      <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 bg-zinc-950 rounded-xl border border-zinc-800">
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Waiting to join</h2>
          <p className="text-sm text-zinc-400 mb-2">{lobbyMeeting.title}</p>
          <p className="text-sm text-zinc-500 mb-6">The host will admit you shortly.</p>
          <button
            type="button"
            onClick={() => setLobbyMeeting(null)}
            className="px-4 py-2 rounded-lg text-zinc-300 hover:bg-zinc-800 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ---- Active meeting room ----
  if (activeMeeting) {
    return (
      <MeetingRoom
        activeMeeting={activeMeeting}
        roomParticipants={roomParticipants}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        meetingCall={meetingCall}
        displayLocalStream={displayLocalStream}
        localVideoRef={localVideoRef}
        videoRefs={videoRefs}
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        handleSendChat={handleSendChat}
        chatContainerRef={chatContainerRef}
        copyMeetingLink={copyMeetingLink}
        handleLeaveMeeting={handleLeaveMeeting}
        onUploadRecordings={handleUploadRecordings}
        lobbyRequests={lobbyRequests}
        onAdmitToLobby={handleAdmitToLobby}
      />
    );
  }

  // ---- Main view (calendar + meeting list) ----
  return (
    <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden px-4 sm:px-6 lg:px-8 py-6">
      {/* Instant meeting: is it open for everyone with the link? (Yes / No only) */}
      {showInstantMeetingDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" role="dialog" aria-modal="true">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">Start instant meeting</h3>
            <p className="text-sm text-zinc-400 mb-6">Is it open for everyone with the link?</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleInstantMeeting(true)}
                className="flex-1 px-4 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => handleInstantMeeting(false)}
                className="flex-1 px-4 py-3 rounded-lg bg-zinc-700 text-white font-medium hover:bg-zinc-600"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white mb-1">Meetings</h1>
          <p className="text-sm text-zinc-400">
            Schedule, manage and get reminders for your meetings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startInstantMeetingFlow}
            disabled={creatingInstant || !socket}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition shadow-sm disabled:opacity-50"
          >
            {creatingInstant ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {creatingInstant ? "Starting..." : "Instant meeting"}
            </span>
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            disabled={isSelectedDatePast}
            title={isSelectedDatePast ? "Select a current or future date to schedule" : undefined}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Schedule meeting</span>
          </button>
        </div>
      </div>

      {/* Join by code or link */}
      <div className="flex-shrink-0 mb-4 p-4 bg-zinc-900 rounded-xl border border-zinc-700/50">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
          <Link2 className="w-4 h-4" />
          Join by meeting code or link
        </h3>
        <p className="text-xs text-zinc-400 mb-3">
          Enter the meeting code or paste the full meeting link to join.
        </p>
        <form onSubmit={handleJoinByCode} className="flex gap-2">
          <input
            type="text"
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value)}
            placeholder="e.g. ABC12345 or https://.../join/ABC12345"
            className="flex-1 min-w-0 max-w-md px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 text-sm text-white font-mono placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={joiningByCode || !joinCodeInput.trim()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition disabled:opacity-50"
          >
            {joiningByCode ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            Join
          </button>
        </form>
      </div>

      {/* Calendar + list: fills remaining space, no page scroll */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Calendar */}
        <div className="flex-shrink-0 bg-zinc-900 rounded-xl border border-zinc-700/50 p-5 w-full lg:max-w-[1000px]">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
            >
              &#8592; Prev
            </button>
            <div className="text-base font-semibold text-white tracking-wide">
              {monthLabel}
            </div>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
            >
              Next &#8594;
            </button>
          </div>

          <div className="grid grid-cols-7 text-xs font-medium text-zinc-400 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center py-1.5">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-sm">
            {calendarDays.map((day, idx) => {
              if (!day) {
                return (
                  <div
                    key={`blank-${idx}`}
                    className="h-[5.5rem] rounded-lg bg-zinc-900/50"
                  />
                );
              }

              const key = toLocalDateString(day);
              const dayMeetings = meetingsByDay[key] || [];
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDate);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleCalendarDayClick(day)}
                  className={[
                    "h-[5.5rem] rounded-lg flex flex-col items-center justify-center border text-sm font-medium transition-all cursor-pointer",
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/20 text-white shadow-sm shadow-indigo-500/20"
                      : "border-zinc-700/40 text-zinc-200 hover:bg-zinc-800/80 hover:border-zinc-600",
                    isToday && !isSelected
                      ? "ring-2 ring-indigo-500/50 ring-offset-1 ring-offset-zinc-900"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="leading-none">{day.getDate()}</span>
                  {dayMeetings.length > 0 && (
                    <div className="flex items-center gap-0.5 mt-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {dayMeetings.length > 1 && (
                        <span className="text-[9px] text-emerald-400 font-medium leading-none">
                          {dayMeetings.length}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {loading && (
            <div className="flex items-center gap-2 mt-4 text-xs text-zinc-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading meetings...
            </div>
          )}
        </div>

        {/* Selected day meeting list: fills remaining height, scrolls internally */}
        <div className="flex-1 min-h-0 flex flex-col min-w-0 w-full lg:w-[535px] bg-zinc-900 rounded-xl border border-zinc-700/50 p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-zinc-400 mb-0.5">Selected day</p>
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

          {/* Search & Filter bar */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                value={meetingSearchQuery}
                onChange={(e) => setMeetingSearchQuery(e.target.value)}
                placeholder="Search meetings..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700/60 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700/60 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {selectedDateMeetings.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <CalendarDays className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-sm text-zinc-400 mb-1">
                No meetings scheduled
              </p>
              <p className="text-xs text-zinc-500 mb-2">
                Schedule your first meeting for this day
              </p>
              <button
                type="button"
                onClick={openCreateForm}
                disabled={isSelectedDatePast}
                title={isSelectedDatePast ? "Select a current or future date to schedule" : undefined}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-100 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
              >
                <Plus className="w-3 h-3" />
                New meeting
              </button>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              {selectedDateMeetings.map((m) => {
                const d = m.scheduled_at ? new Date(m.scheduled_at) : null;
                const timeLabel = d
                  ? d.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "--";
                const isActive = m.status === "active";
                const isCancelled = m.status === "cancelled";
                const isEnded = m.status === "ended";
                const isPast =
                  d &&
                  d.getTime() < Date.now() &&
                  !isCancelled &&
                  !isEnded &&
                  !isActive;
                const relTime = d ? getRelativeTime(d) : "";
                const participants = (m.participants || []).map(
                  (p) =>
                    p.full_name ||
                    `${p.first_name || ""} ${p.last_name || ""}`.trim() ||
                    p.email ||
                    "User"
                );

                return (
                  <div
                    key={m._id}
                    className="rounded-lg border border-zinc-700/60 bg-zinc-800/60 p-3 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {m.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeLabel}
                            {m.duration_minutes
                              ? ` • ${m.duration_minutes} min`
                              : ""}
                          </span>
                          {m.meeting_type && (
                            <span className="px-1.5 py-0.5 rounded-full bg-zinc-900 text-[10px] uppercase tracking-wide">
                              {MEETING_TYPES.find(
                                (t) => t.value === m.meeting_type
                              )?.label || m.meeting_type}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {isActive ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/30 inline-flex items-center gap-1">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Live
                          </span>
                        ) : isCancelled ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                            Cancelled
                          </span>
                        ) : isEnded ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-700/60">
                            Ended
                          </span>
                        ) : isPast ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-700/60">
                            Past
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Upcoming
                          </span>
                        )}
                        {relTime && (
                          <span className="text-[10px] text-zinc-500">
                            {relTime}
                          </span>
                        )}
                        <div className="flex gap-1">
                          {m.meeting_code && isHost(m) && (
                            <button
                              type="button"
                              onClick={() => copyMeetingLink(m)}
                              className="px-2 py-0.5 rounded text-[10px] bg-zinc-900 text-zinc-200 hover:bg-zinc-800 inline-flex items-center gap-1"
                              title="Copy invite link"
                            >
                              <Copy className="w-3 h-3" />
                              Link
                            </button>
                          )}
                          {!isCancelled && !isEnded && isHost(m) && (
                            <button
                              type="button"
                              onClick={() => openEditForm(m)}
                              className="px-2 py-0.5 rounded text-[10px] bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                            >
                              Edit
                            </button>
                          )}
                          {!isCancelled && !isEnded && isHost(m) && (
                            <button
                              type="button"
                              onClick={() => handleCancelMeeting(m)}
                              className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            >
                              Cancel
                            </button>
                          )}
                          {(isCancelled || isEnded) && isHost(m) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMeeting(m)}
                              className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500/20 inline-flex items-center gap-1"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
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
                      <p className="text-[11px] text-zinc-300 mt-1 line-clamp-2">
                        {m.description}
                      </p>
                    )}

                    {isEnded && isParticipant(m) && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => toggleRecordings(m._id)}
                          disabled={loadingRecordingsId === m._id}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] bg-zinc-800 text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                        >
                          {loadingRecordingsId === m._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Circle className="w-3 h-3" />
                          )}
                          {recordingsExpandedId === m._id ? "Hide recordings" : "View recordings"}
                        </button>
                        {recordingsExpandedId === m._id && (
                          <div className="mt-2 pt-2 border-t border-zinc-700/50 space-y-2">
                            {loadingRecordingsId === m._id ? (
                              <p className="text-[11px] text-zinc-500">Loading...</p>
                            ) : (recordingsByMeeting[m._id] || []).length === 0 ? (
                              <p className="text-[11px] text-zinc-500">No recordings for this meeting.</p>
                            ) : (
                              (recordingsByMeeting[m._id] || []).map((rec) => (
                                <div key={rec._id} className="rounded-lg bg-zinc-900/80 p-2">
                                  <p className="text-[11px] text-zinc-300 mb-1">
                                    {rec.participant_name || rec.participant_id} • {rec.type}
                                    {rec.duration_seconds != null && ` • ${Math.round(rec.duration_seconds)}s`}
                                  </p>
                                  <video
                                    src={rec.cloudinary_url}
                                    controls
                                    className="w-full max-h-48 rounded border border-zinc-700/60 bg-black"
                                    preload="metadata"
                                  >
                                    Your browser does not support video playback.
                                  </video>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-1 space-y-1">
                      {participants.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                          <Users className="w-3 h-3" />
                          <span className="truncate">
                            {participants.join(", ")}
                          </span>
                        </div>
                      )}
                      {m.location && (
                        <p className="text-[11px] text-zinc-400">
                          Location:{" "}
                          <span className="text-zinc-200">{m.location}</span>
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
          <div className="bg-zinc-900 rounded-xl border border-zinc-700/60 shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700/50">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {editingMeeting ? "Edit meeting" : "Schedule a meeting"}
                </h2>
                <p className="text-xs text-zinc-400">
                  Set meeting details, participants and reminders
                </p>
              </div>
              <button
                type="button"
                onClick={resetFormState}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="px-4 py-3 space-y-3 overflow-y-auto text-xs"
            >
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleFormChange("title", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Team sync, client call, support session..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    min={todayLocalStr}
                    onChange={(e) => handleFormChange("date", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={form.time}
                    min={
                      form.date === todayLocalStr
                        ? `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`
                        : undefined
                    }
                    onChange={(e) => handleFormChange("time", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Type
                  </label>
                  <select
                    value={form.meeting_type}
                    onChange={(e) =>
                      handleFormChange("meeting_type", e.target.value)
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {MEETING_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.duration_minutes}
                    onChange={(e) =>
                      handleFormChange("duration_minutes", e.target.value)
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    handleFormChange("description", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  placeholder="Agenda, notes, goals..."
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => handleFormChange("location", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Meeting room, office..."
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Participants
                </label>
                <p className="text-[10px] text-zinc-500 mb-1.5">
                  Only added participants will see this meeting and can join when it starts.
                </p>
                <div className="mb-1 flex flex-wrap gap-1">
                  {form.participants.length === 0 && (
                    <span className="text-[11px] text-zinc-500">
                      No participants added yet
                    </span>
                  )}
                  {form.participants.map((p) => (
                    <span
                      key={p._id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/70 text-[11px] text-zinc-100"
                    >
                      {p.full_name || p.email || "User"}
                      <button
                        type="button"
                        onClick={() => removeParticipant(p._id)}
                        className="p-0.5 rounded-full hover:bg-zinc-700 text-zinc-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleParticipantSearchInput}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (searchQuery.trim()) searchUsers(searchQuery);
                      }
                    }}
                    placeholder="Search by name or email..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {searchError && (
                  <p className="mt-1 text-[11px] text-red-400">{searchError}</p>
                )}
                {searchingUsers && (
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Searching...
                  </div>
                )}
                {!searchingUsers && searchQuery.trim() && searchResults.length === 0 && (
                  <p className="mt-1.5 text-[11px] text-zinc-500">No users found</p>
                )}
                {!searchingUsers && searchResults.length > 0 && (
                  <div className="mt-1.5 max-h-36 overflow-y-auto border border-zinc-700/60 rounded-lg bg-zinc-900/80 divide-y divide-zinc-700/50">
                    {searchResults
                      .filter(
                        (u) => !form.participants.some((p) => String(p._id) === String(u._id))
                      )
                      .map((u) => (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() => addParticipant(u)}
                          className="w-full flex items-center justify-between px-3 py-2 text-left text-[11px] text-zinc-200 hover:bg-zinc-800 transition"
                        >
                          <span className="truncate font-medium">
                            {u.full_name || u.email || "User"}
                          </span>
                          {u.email && (
                            <span className="ml-2 text-[10px] text-zinc-500 truncate shrink-0 max-w-[140px]">
                              {u.email}
                            </span>
                          )}
                          <span className="ml-2 text-[10px] text-indigo-400 shrink-0">Add</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
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
                            : "bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700",
                        ].join(" ")}
                      >
                        {m} min before
                      </button>
                    );
                  })}
                  {form.reminders.length === 0 && (
                    <span className="text-[11px] text-zinc-500">
                      No reminders selected
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-zinc-700/50 mt-2">
                <button
                  type="button"
                  onClick={resetFormState}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-200 hover:bg-zinc-700"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-xs text-white hover:bg-indigo-500 disabled:opacity-60 inline-flex items-center gap-1.5"
                >
                  {creating && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>
                    {editingMeeting ? "Save changes" : "Create meeting"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingModule;
