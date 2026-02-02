import React from "react";
import { PhoneOff, Loader2 } from "lucide-react";

const OutgoingCallModal = ({ remoteUser, onHangUp }) => {
  if (!remoteUser) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border-2 border-teal-200">
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <p className="text-white/90 text-sm font-medium uppercase tracking-wider">
            Calling...
          </p>
          <h2 className="text-xl font-bold text-white mt-2 truncate px-2">
            {remoteUser.name}
          </h2>
          <p className="text-white/80 text-sm mt-1">Waiting for response</p>
        </div>
        <div className="p-6">
          <button
            onClick={onHangUp}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors shadow-md"
          >
            <PhoneOff className="w-5 h-5" />
            Cancel call
          </button>
        </div>
      </div>
    </div>
  );
};

export default OutgoingCallModal;
