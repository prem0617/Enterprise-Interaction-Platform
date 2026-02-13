import { useState, useRef, useEffect, useCallback } from "react";
import { requestMediaPermissions, PermissionDeniedError } from "./useMediaPermissions";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/**
 * Meeting video call hook. Mesh WebRTC: each participant connects to every other.
 * Uses meeting-join/meeting-leave for room membership, meeting-webrtc-* for signaling.
 *
 * Features:
 *  - Camera & microphone toggle
 *  - Screen sharing (replaces video track on peers, reverts on stop)
 *  - Media-state broadcast (mute / video-off indicators for remote users)
 *  - Hand raise broadcast
 */
export function useMeetingCall(socket, currentUserId, currentUserName, meetingId, roomParticipants) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareUserId, setScreenShareUserId] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  // Remote media states { [userId]: { isMuted, isVideoOff, handRaised } }
  const [remoteMediaStates, setRemoteMediaStates] = useState({});

  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const originalVideoTrackRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const socketRef = useRef(socket);
  const meetingIdRef = useRef(meetingId);

  const currentUserIdStr = currentUserId != null ? String(currentUserId) : null;

  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { meetingIdRef.current = meetingId; }, [meetingId]);

  // ---- Shared peer-connection factory (single source of truth) ----
  const getOrCreatePeerConnection = useCallback((remoteIdStr) => {
    if (peerConnectionsRef.current[remoteIdStr]) {
      return peerConnectionsRef.current[remoteIdStr];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current[remoteIdStr] = pc;

    // Attach local tracks if available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) =>
        pc.addTrack(track, localStreamRef.current)
      );
    }

    pc.ontrack = (e) => {
      if (e.streams?.[0]) {
        setRemoteStreams((prev) => ({ ...prev, [remoteIdStr]: e.streams[0] }));
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current?.connected) {
        socketRef.current.emit("meeting-webrtc-ice", {
          meetingId: meetingIdRef.current,
          toUserId: remoteIdStr,
          candidate: e.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        try { pc.close(); } catch (_) {}
        delete peerConnectionsRef.current[remoteIdStr];
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[remoteIdStr];
          return next;
        });
      }
    };

    return pc;
  }, []);

  // ---- Cleanup ----
  const cleanup = useCallback(() => {
    Object.values(peerConnectionsRef.current).forEach((pc) => {
      try { pc.close(); } catch (_) {}
    });
    peerConnectionsRef.current = {};
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    originalVideoTrackRef.current = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStreams({});
    setMediaError(null);
    setIsScreenSharing(false);
    setScreenShareUserId(null);
    setRemoteMediaStates({});
  }, []);

  // ---- Toggle mute ----
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      const newMuted = !isMuted;
      audioTrack.enabled = !newMuted;
      setIsMuted(newMuted);
      // Broadcast state
      if (socketRef.current?.connected && meetingIdRef.current) {
        socketRef.current.emit("meeting-media-state", {
          meetingId: meetingIdRef.current,
          isMuted: newMuted,
          isVideoOff,
        });
      }
    }
  }, [isMuted, isVideoOff]);

  // ---- Toggle video ----
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      const newVideoOff = !isVideoOff;
      videoTrack.enabled = !newVideoOff;
      setIsVideoOff(newVideoOff);
      // Broadcast state
      if (socketRef.current?.connected && meetingIdRef.current) {
        socketRef.current.emit("meeting-media-state", {
          meetingId: meetingIdRef.current,
          isMuted,
          isVideoOff: newVideoOff,
        });
      }
    }
  }, [isVideoOff, isMuted]);

  // ---- Screen sharing ----
  const startScreenShare = useCallback(async () => {
    if (isScreenSharing) return;
    try {
      // Use minimal constraints for maximum compatibility (especially Linux/Wayland).
      // Overly specific constraints can cause empty picker on some platforms.
      let screenStream;
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: "always",
          },
          audio: false,
        });
      } catch (firstErr) {
        // Fallback: try with bare minimum constraints
        if (firstErr.name === "NotAllowedError" || firstErr.name === "AbortError") {
          throw firstErr; // user cancelled — don't retry
        }
        console.warn("[MEETING_CALL] Retrying getDisplayMedia with minimal constraints", firstErr);
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      }

      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) {
        screenStream.getTracks().forEach((t) => t.stop());
        throw new Error("No video track returned from screen share");
      }
      screenStreamRef.current = screenStream;

      // Save original camera track
      if (localStreamRef.current) {
        originalVideoTrackRef.current = localStreamRef.current.getVideoTracks()[0] || null;
      }

      // Replace video track on all peer connections
      Object.values(peerConnectionsRef.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(screenTrack).catch((err) =>
            console.error("[MEETING_CALL] replaceTrack screen error:", err)
          );
        }
      });

      // Also replace in local stream so local preview shows screen
      if (localStreamRef.current && originalVideoTrackRef.current) {
        localStreamRef.current.removeTrack(originalVideoTrackRef.current);
        localStreamRef.current.addTrack(screenTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }

      setIsScreenSharing(true);
      setScreenShareUserId(currentUserIdStr);

      // Notify others via socket
      if (socketRef.current?.connected && meetingIdRef.current) {
        socketRef.current.emit("meeting-screen-share-start", {
          meetingId: meetingIdRef.current,
        });
      }

      // Auto-stop when user clicks "Stop sharing" in browser UI
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "AbortError") {
        // User cancelled the picker — do nothing
        console.log("[MEETING_CALL] Screen share cancelled by user");
        return;
      }
      console.error("[MEETING_CALL] startScreenShare error:", err);

      // Detect Wayland/PipeWire issue and show helpful message
      const isLinux = navigator.userAgent.includes("Linux");
      if (isLinux && (err.name === "NotFoundError" || err.name === "NotReadableError" || err.message?.includes("track"))) {
        const msg =
          "Screen sharing failed. On Linux (Wayland), launch Chrome with:\n" +
          "google-chrome --enable-features=WebRTCPipeWireCapturer";
        console.warn(msg);
        setMediaError(msg);
      }
    }
  }, [isScreenSharing, currentUserIdStr]);

  const stopScreenShare = useCallback(() => {
    if (!isScreenSharing && !screenStreamRef.current) return;

    // Stop screen tracks
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    // Restore original camera track
    const origTrack = originalVideoTrackRef.current;
    if (origTrack && localStreamRef.current) {
      const screenTrack = localStreamRef.current.getVideoTracks()[0];
      if (screenTrack) localStreamRef.current.removeTrack(screenTrack);
      localStreamRef.current.addTrack(origTrack);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

      // Replace back on all peers
      Object.values(peerConnectionsRef.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(origTrack).catch((err) =>
            console.error("[MEETING_CALL] replaceTrack revert error:", err)
          );
        }
      });
    }

    screenStreamRef.current = null;
    originalVideoTrackRef.current = null;
    setIsScreenSharing(false);
    setScreenShareUserId(null);

    if (socketRef.current?.connected && meetingIdRef.current) {
      socketRef.current.emit("meeting-screen-share-stop", {
        meetingId: meetingIdRef.current,
      });
    }
  }, [isScreenSharing]);

  const toggleScreenShare = useCallback(() => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  // ---- Hand raise ----
  const [handRaised, setHandRaised] = useState(false);
  const toggleHandRaise = useCallback(() => {
    const newRaised = !handRaised;
    setHandRaised(newRaised);
    if (socketRef.current?.connected && meetingIdRef.current) {
      socketRef.current.emit("meeting-hand-raise", {
        meetingId: meetingIdRef.current,
        raised: newRaised,
      });
    }
  }, [handRaised]);

  // ---- Start media ----
  const startMedia = useCallback(async () => {
    setMediaError(null);
    try {
      const stream = await requestMediaPermissions({ audio: true, video: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoOff(false);
      setIsMuted(false);
      setHandRaised(false);
      return stream;
    } catch (err) {
      const msg =
        err instanceof PermissionDeniedError
          ? err.message
          : "Camera and microphone access denied";
      setMediaError(msg);
      throw err;
    }
  }, []);

  // ---- Listen for remote media-state / hand-raise / screen-share events ----
  useEffect(() => {
    if (!socket || !meetingId) return;

    const handleMediaState = (data) => {
      if (data.meetingId !== meetingId) return;
      setRemoteMediaStates((prev) => ({
        ...prev,
        [data.userId]: {
          ...(prev[data.userId] || {}),
          isMuted: data.isMuted,
          isVideoOff: data.isVideoOff,
        },
      }));
    };

    const handleHandRaise = (data) => {
      if (data.meetingId !== meetingId) return;
      if (String(data.userId) === currentUserIdStr) return; // own event echoed
      setRemoteMediaStates((prev) => ({
        ...prev,
        [data.userId]: {
          ...(prev[data.userId] || {}),
          handRaised: data.raised,
        },
      }));
    };

    const handleScreenStart = (data) => {
      if (data.meetingId !== meetingId) return;
      setScreenShareUserId(String(data.userId));
    };

    const handleScreenStop = (data) => {
      if (data.meetingId !== meetingId) return;
      setScreenShareUserId((prev) =>
        prev === String(data.userId) ? null : prev
      );
    };

    socket.on("meeting-media-state", handleMediaState);
    socket.on("meeting-hand-raise", handleHandRaise);
    socket.on("meeting-screen-share-start", handleScreenStart);
    socket.on("meeting-screen-share-stop", handleScreenStop);

    return () => {
      socket.off("meeting-media-state", handleMediaState);
      socket.off("meeting-hand-raise", handleHandRaise);
      socket.off("meeting-screen-share-start", handleScreenStart);
      socket.off("meeting-screen-share-stop", handleScreenStop);
    };
  }, [socket, meetingId, currentUserIdStr]);

  // ---- WebRTC signaling listeners ----
  useEffect(() => {
    if (!socket || !currentUserIdStr || !meetingId) return;

    const handleOffer = async (data) => {
      const { fromUserId, meetingId: evtMeetingId, sdp } = data;
      if (evtMeetingId !== meetingId) return;
      const fromIdStr = String(fromUserId);
      if (fromIdStr === currentUserIdStr) return;

      const pc = getOrCreatePeerConnection(fromIdStr);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("meeting-webrtc-answer", {
          meetingId,
          toUserId: fromIdStr,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.error("[MEETING_CALL] handleOffer error:", err);
      }
    };

    const handleAnswer = async (data) => {
      const { fromUserId, meetingId: evtMeetingId, sdp } = data;
      if (evtMeetingId !== meetingId) return;
      const fromIdStr = String(fromUserId);
      const pc = peerConnectionsRef.current[fromIdStr];
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error("[MEETING_CALL] setRemoteDescription answer error:", err);
      }
    };

    const handleIce = async (data) => {
      const { fromUserId, meetingId: evtMeetingId, candidate } = data;
      if (evtMeetingId !== meetingId || !candidate) return;
      const fromIdStr = String(fromUserId);
      const pc = getOrCreatePeerConnection(fromIdStr);
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("[MEETING_CALL] addIceCandidate error:", err);
      }
    };

    socket.on("meeting-webrtc-offer", handleOffer);
    socket.on("meeting-webrtc-answer", handleAnswer);
    socket.on("meeting-webrtc-ice", handleIce);

    return () => {
      socket.off("meeting-webrtc-offer", handleOffer);
      socket.off("meeting-webrtc-answer", handleAnswer);
      socket.off("meeting-webrtc-ice", handleIce);
    };
  }, [socket, currentUserIdStr, meetingId, getOrCreatePeerConnection]);

  // ---- Create offers to other participants when we have local stream ----
  useEffect(() => {
    if (!socket || !currentUserIdStr || !meetingId || !localStreamRef.current) return;

    const others = (roomParticipants || [])
      .map((p) => String(p.userId))
      .filter((id) => id !== currentUserIdStr);

    const createOffersTo = async (remoteIdStr) => {
      if (peerConnectionsRef.current[remoteIdStr]) return;
      const pc = getOrCreatePeerConnection(remoteIdStr);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("meeting-webrtc-offer", {
          meetingId,
          toUserId: remoteIdStr,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.error("[MEETING_CALL] createOffer error:", err);
      }
    };

    others.forEach((id) => createOffersTo(id));
  }, [socket, currentUserIdStr, meetingId, roomParticipants, localStream, getOrCreatePeerConnection]);

  // ---- Remove peer connections for participants who left ----
  useEffect(() => {
    if (!meetingId) return;
    const currentIds = new Set(
      (roomParticipants || []).map((p) => String(p.userId)).filter((id) => id !== currentUserIdStr)
    );
    Object.keys(peerConnectionsRef.current).forEach((remoteId) => {
      if (!currentIds.has(remoteId)) {
        const pc = peerConnectionsRef.current[remoteId];
        if (pc) {
          try { pc.close(); } catch (_) {}
          delete peerConnectionsRef.current[remoteId];
        }
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[remoteId];
          return next;
        });
        // Clean up remote state
        setRemoteMediaStates((prev) => {
          const next = { ...prev };
          delete next[remoteId];
          return next;
        });
      }
    });
  }, [meetingId, roomParticipants, currentUserIdStr]);

  return {
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    isScreenSharing,
    screenShareUserId,
    handRaised,
    remoteMediaStates,
    mediaError,
    startMedia,
    cleanup,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleHandRaise,
  };
}
