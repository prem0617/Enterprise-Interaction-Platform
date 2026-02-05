import React from "react";
import { Loader2, X } from "lucide-react";

const GroupCallWaitingModal = ({ channelName, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Starting group call</h3>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-center py-8">
          <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-medium mb-1">{channelName || "Group"}</p>
          <p className="text-sm text-gray-500">Waiting for others to join...</p>
        </div>
        <button
          onClick={onCancel}
          className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default GroupCallWaitingModal;
