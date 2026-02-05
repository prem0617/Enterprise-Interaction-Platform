import React from "react";
import { Phone, X } from "lucide-react";

const GroupCallIncomingBanner = ({
  channelName,
  initiatorName,
  onJoin,
  onDismiss,
}) => {
  return (
    <div className="mb-2 flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200">
      <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
        <Phone className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-teal-900 truncate">
          {initiatorName} started a group call
        </p>
        <p className="text-xs text-teal-600 truncate">{channelName || "Group"}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onDismiss}
          className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"
          title="Dismiss"
        >
        
        </button>
        <button
          onClick={onJoin}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold rounded-xl hover:shadow-md transition-all"
        >
          <Phone className="w-4 h-4" />
          Join
        </button>
      </div>
    </div>
  );
};

export default GroupCallIncomingBanner;
