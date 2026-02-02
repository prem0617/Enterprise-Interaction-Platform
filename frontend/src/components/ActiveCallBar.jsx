import React, { useEffect, useRef } from "react";
import { PhoneOff, Mic, MicOff, Loader2 } from "lucide-react";

const ActiveCallBar = ({
  remoteUser,
  remoteStream,
  isMuted,
  onToggleMute,
  onHangUp,
  isConnecting,
  errorMessage,
}) => {
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (remoteStream && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!remoteUser) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] w-full max-w-md px-4">
      <div className="bg-white rounded-2xl shadow-xl border-2 border-teal-200 overflow-hidden">
        <audio ref={remoteAudioRef} autoPlay playsInline />
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              {isConnecting ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <span className="text-white font-bold text-lg">
                  {remoteUser.name?.charAt(0) || "?"}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-white truncate max-w-[180px]">
                {remoteUser.name}
              </h3>
              <p className="text-white/80 text-sm">
                {isConnecting ? "Connecting..." : "Live"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              title="End call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
        {errorMessage && (
          <div className="px-4 py-2 bg-orange-50 border-t border-orange-200 text-orange-800 text-sm">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveCallBar;
