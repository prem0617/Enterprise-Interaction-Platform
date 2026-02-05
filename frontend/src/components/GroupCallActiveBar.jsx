import React, { useEffect, useRef } from "react";
import { PhoneOff, Mic, MicOff, Users } from "lucide-react";

const GroupCallActiveBar = ({
  channelName,
  participants,
  remoteStreams,
  isMuted,
  onToggleMute,
  onHangUp,
  currentUserId,
}) => {
  const currentUserIdStr = currentUserId != null ? String(currentUserId) : null;
  const audioRefs = useRef({});

  const others = participants.filter((p) => p.id !== currentUserIdStr);

  useEffect(() => {
    Object.entries(remoteStreams).forEach(([userId, stream]) => {
      const el = audioRefs.current[userId];
      if (el && stream) {
        el.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] w-full max-w-lg px-4">
      <div className="bg-white rounded-2xl shadow-xl border-2 border-teal-200 overflow-hidden">
        {Object.entries(remoteStreams).map(([userId, stream]) => (
          <audio
            key={userId}
            ref={(r) => {
              audioRefs.current[userId] = r;
            }}
            autoPlay
            playsInline
          />
        ))}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-white truncate">{channelName || "Group call"}</h3>
                <p className="text-white/80 text-sm">
                  {others.length + 1} participant{(others.length + 1) !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={onToggleMute}
                className="p-3 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={onHangUp}
                className="p-3 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors"
                title="Leave call"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
          {others.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {others.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/20 text-white text-xs font-medium"
                >
                  {p.name?.charAt(0) || "?"}
                  <span className="truncate max-w-[80px]">{p.name || "User"}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupCallActiveBar;
