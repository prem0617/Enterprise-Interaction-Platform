import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { BACKEND_URL } from "@/config";
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
}) => {
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState("chat"); // "chat" | "participants"
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pinnedUserId, setPinnedUserId] = useState(null);
  const containerRef = useRef(null);

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

  // Remote tiles
  remoteParticipants.forEach((p) => {
    const uid = String(p.userId);
    const rState = meetingCall.remoteMediaStates[uid] || {};
    allTiles.push({
      id: uid,
      name: p.name || "User",
      isLocal: false,
      stream: meetingCall.remoteStreams[uid] || null,
      isMuted: rState.isMuted ?? false,
      isVideoOff: rState.isVideoOff ?? false,
      handRaised: rState.handRaised ?? false,
      isScreenSharing: meetingCall.screenShareUserId === uid,
      isHost: false,
    });
  });

  // Layout: if pinned, pinned tile is large, rest are small strip on side
  const pinnedTile = pinnedUserId
    ? allTiles.find((t) => t.id === pinnedUserId)
    : null;
  const unpinnedTiles = pinnedTile
    ? allTiles.filter((t) => t.id !== pinnedUserId)
    : allTiles;

  const totalUnpinned = unpinnedTiles.length;
  const gridCols = pinnedTile
    ? 1
    : Math.min(3, Math.max(1, totalUnpinned));
  const gridRows = pinnedTile
    ? 1
    : Math.ceil(totalUnpinned / gridCols) || 1;

  // Unread chat counter
  const [unreadChat, setUnreadChat] = useState(0);
  const lastChatCountRef = useRef(chatMessages.length);

  useEffect(() => {
    if (sidebarTab === "chat" && showSidebar) {
      setUnreadChat(0);
      lastChatCountRef.current = chatMessages.length;
    } else if (chatMessages.length > lastChatCountRef.current) {
      setUnreadChat((prev) => prev + (chatMessages.length - lastChatCountRef.current));
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
      if (el && tile.stream) {
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
    <div
      ref={containerRef}
      className="fixed inset-0 z-40 flex flex-col bg-zinc-950"
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
              {activeMeeting.meeting_code && (
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
                  meetingCall.isScreenSharing
                    ? "Stop sharing"
                    : "Share screen"
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
              </button>
            </div>

            {/* Tab content */}
            {sidebarTab === "participants" ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
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
                    const isOwn =
                      String(msg.userId) === String(currentUserId);
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
                            {new Date(msg.createdAt).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" }
                            )}
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
  );
};

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

  const videoRefs = useRef({});
  const localVideoRef = useRef(null);
  const chatContainerRef = useRef(null);

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
      if (!activeMeeting || payload.meetingId !== activeMeeting._id) return;
      setRoomParticipants(payload.participants || []);
    };

    const handleMessage = (payload) => {
      if (!activeMeeting || payload.meetingId !== activeMeeting._id) return;
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
      if (!activeMeeting || payload.meetingId !== activeMeeting._id) return;
      toast("Meeting ended by host", { icon: "ℹ️" });
      if (localMediaStream) {
        localMediaStream.getTracks().forEach((t) => t.stop());
        setLocalMediaStream(null);
      }
      meetingCall.cleanup();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, activeMeeting, currentUserId]);

  // ---- Join code from URL ----
  useEffect(() => {
    const joinCode = searchParams.get("joinCode");
    if (joinCode) {
      setJoinCodeInput(joinCode.toUpperCase());
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // ---- Form helpers ----
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

  // ---- Instant meeting ----
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
          title: `Instant Meeting ${now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          meeting_type: "internal",
          scheduled_at: now.toISOString(),
          duration_minutes: 30,
          participants: [],
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
        meetingId: meeting._id,
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

  // ---- Calendar helpers ----
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
    return now >= start && meeting.status !== "cancelled";
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

  // ---- Join by code ----
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
      const msg =
        err.response?.data?.error ||
        (err.response?.status === 404
          ? "Meeting not found"
          : "Failed to join");
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
      .then(() => toast.success("Link copied to clipboard"));
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

  // ======================== RENDER ========================

  // ---- Active meeting room (full-screen overlay) ----
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
      />
    );
  }

  // ---- Main view (calendar + meeting list) ----
  return (
    <div className="w-full h-[calc(100vh-3.5rem)] px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white mb-1">Meetings</h1>
          <p className="text-sm text-zinc-400">
            Schedule, manage and get reminders for your meetings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstantMeeting}
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
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Schedule meeting</span>
          </button>
        </div>
      </div>

      {/* Join by code */}
      <div className="mb-4 p-4 bg-zinc-900 rounded-xl border border-zinc-700/50">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
          <Link2 className="w-4 h-4" />
          Join by meeting code
        </h3>
        <p className="text-xs text-zinc-400 mb-3">
          Enter a meeting code shared by the host to join.
        </p>
        <form onSubmit={handleJoinByCode} className="flex gap-2">
          <input
            type="text"
            value={joinCodeInput}
            onChange={(e) =>
              setJoinCodeInput(e.target.value.toUpperCase())
            }
            placeholder="e.g. ABC12345"
            className="flex-1 max-w-xs px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 text-sm text-white font-mono uppercase placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            maxLength={12}
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

      {/* Calendar + list */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-700/50 p-5 w-full lg:max-w-[1000px]">
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
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (d) => (
                <div key={d} className="text-center py-1.5">
                  {d}
                </div>
              )
            )}
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-sm">
            {calendarDays.map((day, idx) => {
              if (!day) {
                return (
                  <div
                    key={`blank-${idx}`}
                    className="h-45 rounded-lg bg-zinc-900/50"
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
                    "h-30 rounded-lg flex flex-col items-center justify-center border text-sm font-medium transition-all cursor-pointer",
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
                  <span className="leading-none">
                    {day.getDate()}
                  </span>
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

        {/* Selected day meeting list */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-700/50 p-4 flex flex-col w-full lg:w-[535px] lg:max-h-[800px]">
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-100 hover:bg-zinc-700"
              >
                <Plus className="w-3 h-3" />
                New meeting
              </button>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[560px] pr-1">
              {selectedDateMeetings.map((m) => {
                const d = m.scheduled_at
                  ? new Date(m.scheduled_at)
                  : null;
                const timeLabel = d
                  ? d.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "--";
                const isCancelled = m.status === "cancelled";
                const isEnded = m.status === "ended";
                const isPast =
                  d && d.getTime() < Date.now() && !isCancelled && !isEnded;
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
                        {isCancelled ? (
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
                        <div className="flex gap-1">
                          {m.meeting_code && (
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
                          {canEnterMeeting(m) && isParticipant(m) && (
                            <button
                              type="button"
                              onClick={() => handleEnterMeeting(m)}
                              className="px-2 py-0.5 rounded text-[10px] bg-indigo-600 text-white hover:bg-indigo-500"
                            >
                              {isHost(m)
                                ? "Start meeting"
                                : "Join meeting"}
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
                          <span className="text-zinc-200">
                            {m.location}
                          </span>
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
                  {editingMeeting
                    ? "Edit meeting"
                    : "Schedule a meeting"}
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
                  onChange={(e) =>
                    handleFormChange("title", e.target.value)
                  }
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
                    onChange={(e) =>
                      handleFormChange("date", e.target.value)
                    }
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
                    onChange={(e) =>
                      handleFormChange("time", e.target.value)
                    }
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
                      handleFormChange(
                        "duration_minutes",
                        e.target.value
                      )
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
                  onChange={(e) =>
                    handleFormChange("location", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Meeting room, office..."
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Participants
                </label>
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        searchUsers(searchQuery);
                      }
                    }}
                    placeholder="Search users by name or email"
                    className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => searchUsers(searchQuery)}
                    disabled={searchingUsers}
                    className="px-3 py-2 rounded-lg bg-zinc-800 text-xs text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
                  >
                    {searchingUsers ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Search"
                    )}
                  </button>
                </div>
                {searchError && (
                  <p className="mt-1 text-[11px] text-red-400">
                    {searchError}
                  </p>
                )}
                {searchResults.length > 0 && (
                  <div className="mt-1 max-h-28 overflow-y-auto border border-zinc-700/60 rounded-lg bg-zinc-900/80">
                    {searchResults.map((u) => (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => addParticipant(u)}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-zinc-200 hover:bg-zinc-800"
                      >
                        <span className="truncate">
                          {u.full_name || u.email || "User"}
                        </span>
                        {u.email && (
                          <span className="ml-2 text-[10px] text-zinc-500 truncate">
                            {u.email}
                          </span>
                        )}
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
                  {creating && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  <span>
                    {editingMeeting
                      ? "Save changes"
                      : "Create meeting"}
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
