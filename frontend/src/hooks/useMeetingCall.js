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
 */
export function useMeetingCall(socket, currentUserId, currentUserName, meetingId, roomParticipants) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [mediaError, setMediaError] = useState(null);

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});

  const currentUserIdStr = currentUserId != null ? String(currentUserId) : null;

  const cleanup = useCallback(() => {
    Object.values(peerConnectionsRef.current).forEach((pc) => {
      try {
        pc.close();
      } catch (_) {}
    });
    peerConnectionsRef.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStreams({});
    setMediaError(null);
  }, []);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = isVideoOff;
      setIsVideoOff(!isVideoOff);
    }
  }, [isVideoOff]);

  const startMedia = useCallback(async () => {
    setMediaError(null);
    try {
      const stream = await requestMediaPermissions({ audio: true, video: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoOff(false);
      setIsMuted(false);
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

  useEffect(() => {
    if (!socket || !currentUserIdStr || !meetingId) return;

    const createPeerConnection = (remoteIdStr) => {
      if (peerConnectionsRef.current[remoteIdStr]) return peerConnectionsRef.current[remoteIdStr];
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current[remoteIdStr] = pc;

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
        if (e.candidate && socket?.connected) {
          socket.emit("meeting-webrtc-ice", {
            meetingId,
            toUserId: remoteIdStr,
            candidate: e.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          try {
            pc.close();
          } catch (_) {}
          delete peerConnectionsRef.current[remoteIdStr];
          setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[remoteIdStr];
            return next;
          });
        }
      };

      return pc;
    };

    const handleOffer = async (data) => {
      const { fromUserId, meetingId: evtMeetingId, sdp } = data;
      if (evtMeetingId !== meetingId) return;
      const fromIdStr = String(fromUserId);
      if (fromIdStr === currentUserIdStr) return;

      const pc = createPeerConnection(fromIdStr);

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
      let pc = peerConnectionsRef.current[fromIdStr];
      if (!pc) {
        pc = createPeerConnection(fromIdStr);
      }
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
  }, [socket, currentUserIdStr, meetingId]);

  // Create offers to other participants when we have local stream
  useEffect(() => {
    if (!socket || !currentUserIdStr || !meetingId || !localStreamRef.current) return;

    const others = (roomParticipants || [])
      .map((p) => String(p.userId))
      .filter((id) => id !== currentUserIdStr);

    const createPeerConnection = (remoteIdStr) => {
      if (peerConnectionsRef.current[remoteIdStr]) return peerConnectionsRef.current[remoteIdStr];
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current[remoteIdStr] = pc;

      localStreamRef.current.getTracks().forEach((track) =>
        pc.addTrack(track, localStreamRef.current)
      );

      pc.ontrack = (e) => {
        if (e.streams?.[0]) {
          setRemoteStreams((prev) => ({ ...prev, [remoteIdStr]: e.streams[0] }));
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && socket?.connected) {
          socket.emit("meeting-webrtc-ice", {
            meetingId,
            toUserId: remoteIdStr,
            candidate: e.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          try {
            pc.close();
          } catch (_) {}
          delete peerConnectionsRef.current[remoteIdStr];
          setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[remoteIdStr];
            return next;
          });
        }
      };

      return pc;
    };

    const createOffersTo = async (remoteIdStr) => {
      if (peerConnectionsRef.current[remoteIdStr]) return;
      const pc = createPeerConnection(remoteIdStr);
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
  }, [socket, currentUserIdStr, meetingId, roomParticipants, localStream]);

  // Remove peer connections for participants who left
  useEffect(() => {
    if (!meetingId) return;
    const currentIds = new Set(
      (roomParticipants || []).map((p) => String(p.userId)).filter((id) => id !== currentUserIdStr)
    );
    Object.keys(peerConnectionsRef.current).forEach((remoteId) => {
      if (!currentIds.has(remoteId)) {
        const pc = peerConnectionsRef.current[remoteId];
        if (pc) {
          try {
            pc.close();
          } catch (_) {}
          delete peerConnectionsRef.current[remoteId];
        }
        setRemoteStreams((prev) => {
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
    mediaError,
    startMedia,
    cleanup,
    toggleMute,
    toggleVideo,
  };
}
