import { useState, useRef, useEffect, useCallback } from "react";
import { requestMediaPermissions, PermissionDeniedError } from "./useMediaPermissions";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/**
 * Meeting video call hook. Mesh WebRTC: host creates offers to all others so that
 * joiners reliably receive the host's video; joiners only respond to offers.
 * Uses meeting-join/meeting-leave for room membership, meeting-webrtc-* for signaling.
 *
 * Features:
 *  - Camera & microphone toggle
 *  - Screen sharing (replaces video track on peers, reverts on stop)
 *  - Media-state broadcast (mute / video-off indicators for remote users)
 *  - Hand raise broadcast
 */
export function useMeetingCall(socket, currentUserId, currentUserName, meetingId, roomParticipants, isHost = false) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [remoteScreenStreams, setRemoteScreenStreams] = useState({});
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
  const iceCandidateBufferRef = useRef({});
  const remoteStreamsRef = useRef({});
  const remoteScreenStreamsRef = useRef({});
  const socketRef = useRef(socket);
  const meetingIdRef = useRef(meetingId);

  const currentUserIdStr = currentUserId != null ? String(currentUserId) : null;

  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { meetingIdRef.current = meetingId; }, [meetingId]);

  const drainIceCandidates = useCallback(async (remoteIdStr) => {
    const pc = peerConnectionsRef.current[remoteIdStr];
    const buffer = iceCandidateBufferRef.current[remoteIdStr];
    if (!pc || !buffer?.length) return;
    delete iceCandidateBufferRef.current[remoteIdStr];
    for (const c of buffer) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (err) {
        console.warn("[MEETING_CALL] addIceCandidate (drain) error:", err);
      }
    }
  }, []);

  // ---- Shared peer-connection factory (single source of truth) ----
  const getOrCreatePeerConnection = useCallback((remoteIdStr) => {
    if (peerConnectionsRef.current[remoteIdStr]) {
      return peerConnectionsRef.current[remoteIdStr];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current[remoteIdStr] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) =>
        pc.addTrack(track, localStreamRef.current)
      );
    }

    if (!remoteStreamsRef.current[remoteIdStr]) {
      remoteStreamsRef.current[remoteIdStr] = new MediaStream();
    }
    if (!remoteScreenStreamsRef.current[remoteIdStr]) {
      remoteScreenStreamsRef.current[remoteIdStr] = new MediaStream();
    }

    pc.ontrack = (e) => {
      if (!e.track) return;
      // Screen: explicit displaySurface (sender) or second video track from this peer (receiver fallback)
      const isVideo = e.track.kind === "video";
      const explicitScreen =
        isVideo &&
        (e.track.getSettings?.().displaySurface === "monitor" ||
          e.track.getSettings?.().displaySurface === "window" ||
          e.track.getSettings?.().displaySurface === "browser");
      const cameraStream = remoteStreamsRef.current[remoteIdStr];
      const alreadyHasVideo = cameraStream && cameraStream.getVideoTracks().length > 0;
      const isScreen =
        explicitScreen || (isVideo && alreadyHasVideo);
      const streamRef = isScreen ? remoteScreenStreamsRef : remoteStreamsRef;
      const setState = isScreen ? setRemoteScreenStreams : setRemoteStreams;
      const stream = streamRef.current[remoteIdStr];
      if (stream) {
        stream.addTrack(e.track);
        if (stream.getTracks().length === 1) {
          setState((prev) => ({ ...prev, [remoteIdStr]: stream }));
        } else if (isScreen) {
          setState((prev) => ({ ...prev, [remoteIdStr]: stream }));
        }
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
        delete remoteStreamsRef.current[remoteIdStr];
        delete remoteScreenStreamsRef.current[remoteIdStr];
        delete iceCandidateBufferRef.current[remoteIdStr];
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[remoteIdStr];
          return next;
        });
        setRemoteScreenStreams((prev) => {
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
    iceCandidateBufferRef.current = {};
    remoteStreamsRef.current = {};
    remoteScreenStreamsRef.current = {};
    setRemoteScreenStreams({});
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

      // Save original camera track (keep it; we add screen as second track)
      if (localStreamRef.current) {
        originalVideoTrackRef.current = localStreamRef.current.getVideoTracks()[0] || null;
      }

      // Add screen track to all peer connections (keep camera track so both are sent)
      const screenStreamForSend = new MediaStream([screenTrack]);
      const socket = socketRef.current;
      const meetingId = meetingIdRef.current;
      for (const remoteIdStr of Object.keys(peerConnectionsRef.current)) {
        const pc = peerConnectionsRef.current[remoteIdStr];
        if (!pc) continue;
        try {
          pc.addTrack(screenTrack, screenStreamForSend);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (socket?.connected && meetingId) {
            socket.emit("meeting-webrtc-offer", {
              meetingId,
              toUserId: remoteIdStr,
              sdp: pc.localDescription,
            });
          }
        } catch (err) {
          console.error("[MEETING_CALL] addTrack/createOffer screen error:", err);
        }
      }

      // Local preview: show screen (camera still in peer send)
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

  const stopScreenShare = useCallback(async () => {
    if (!isScreenSharing && !screenStreamRef.current) return;

    // Stop screen tracks and remove senders; renegotiate so remote stops receiving
    const screenStream = screenStreamRef.current;
    const socket = socketRef.current;
    const meetingId = meetingIdRef.current;
    if (screenStream) {
      const screenTrack = screenStream.getVideoTracks()[0];
      screenStream.getTracks().forEach((t) => t.stop());
      if (screenTrack) {
        for (const remoteIdStr of Object.keys(peerConnectionsRef.current)) {
          const pc = peerConnectionsRef.current[remoteIdStr];
          if (!pc) continue;
          const sender = pc.getSenders().find((s) => s.track === screenTrack);
          if (sender) {
            pc.removeTrack(sender);
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              if (socket?.connected && meetingId) {
                socket.emit("meeting-webrtc-offer", {
                  meetingId,
                  toUserId: remoteIdStr,
                  sdp: pc.localDescription,
                });
              }
            } catch (err) {
              console.warn("[MEETING_CALL] renegotiate after stopScreenShare:", err);
            }
          }
        }
      }
    }

    // Restore local preview to camera
    const origTrack = originalVideoTrackRef.current;
    if (origTrack && localStreamRef.current) {
      const currentVideo = localStreamRef.current.getVideoTracks()[0];
      if (currentVideo) localStreamRef.current.removeTrack(currentVideo);
      localStreamRef.current.addTrack(origTrack);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
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
      const sharerId = String(data.userId);
      setScreenShareUserId(sharerId);
      // Only one screen at a time: if someone else started sharing and I was sharing, stop mine
      if (sharerId !== currentUserIdStr && isScreenSharing) {
        stopScreenShare();
      }
    };

    const handleScreenStop = (data) => {
      if (data.meetingId !== meetingId) return;
      const uid = String(data.userId);
      setScreenShareUserId((prev) => (prev === uid ? null : prev));
      const stream = remoteScreenStreamsRef.current[uid];
      if (stream) stream.getTracks().forEach((t) => stream.removeTrack(t));
      setRemoteScreenStreams((prev) => {
        const next = { ...prev };
        delete next[uid];
        return next;
      });
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
  }, [socket, meetingId, currentUserIdStr, isScreenSharing, stopScreenShare]);

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
        await drainIceCandidates(fromIdStr);
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
        await drainIceCandidates(fromIdStr);
      } catch (err) {
        console.error("[MEETING_CALL] setRemoteDescription answer error:", err);
      }
    };

    const handleIce = async (data) => {
      const { fromUserId, meetingId: evtMeetingId, candidate } = data;
      if (evtMeetingId !== meetingId || !candidate) return;
      const fromIdStr = String(fromUserId);
      const pc = peerConnectionsRef.current[fromIdStr];
      if (!pc) {
        if (!iceCandidateBufferRef.current[fromIdStr]) iceCandidateBufferRef.current[fromIdStr] = [];
        iceCandidateBufferRef.current[fromIdStr].push(candidate);
        return;
      }
      if (!pc.remoteDescription) {
        if (!iceCandidateBufferRef.current[fromIdStr]) iceCandidateBufferRef.current[fromIdStr] = [];
        iceCandidateBufferRef.current[fromIdStr].push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("[MEETING_CALL] addIceCandidate error:", err);
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
  }, [socket, currentUserIdStr, meetingId, getOrCreatePeerConnection, drainIceCandidates]);

  // ---- Create offers: host to everyone (so joiners get host video); non-hosts to peers with id > self (one offer per pair) ----
  useEffect(() => {
    if (!socket || !currentUserIdStr || !meetingId || !localStreamRef.current) return;

    const others = (roomParticipants || [])
      .map((p) => String(p.userId))
      .filter((id) => id !== currentUserIdStr);

    const shouldOfferTo = (remoteIdStr) => {
      if (isHost) return true;
      return remoteIdStr > currentUserIdStr;
    };

    const createOffersTo = async (remoteIdStr) => {
      if (!shouldOfferTo(remoteIdStr)) return;
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

    const run = () => others.forEach((id) => createOffersTo(id));
    if (isHost && others.length > 0) {
      const t = setTimeout(run, 150);
      return () => clearTimeout(t);
    }
    run();
  }, [socket, currentUserIdStr, meetingId, roomParticipants, localStream, isHost, getOrCreatePeerConnection]);

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
        delete remoteStreamsRef.current[remoteId];
        delete remoteScreenStreamsRef.current[remoteId];
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[remoteId];
          return next;
        });
        setRemoteScreenStreams((prev) => {
          const next = { ...prev };
          delete next[remoteId];
          return next;
        });
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
    remoteScreenStreams,
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
