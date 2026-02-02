import { useState, useRef, useEffect, useCallback } from "react";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useAudioCall(socket, currentUserId, currentUserName) {
  const [callState, setCallState] = useState("idle"); // idle | calling | incoming | connecting | active | ended
  const [remoteUser, setRemoteUser] = useState(null); // { id, name }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const isCallerRef = useRef(false);
  const callingTimeoutRef = useRef(null);

  const cleanup = useCallback(() => {
    if (callingTimeoutRef.current) {
      clearTimeout(callingTimeoutRef.current);
      callingTimeoutRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setRemoteUser(null);
    setErrorMessage(null);
    isCallerRef.current = false;
  }, []);

  const endCall = useCallback(() => {
    const remoteId = remoteUser?.id?.toString?.() ?? remoteUser?.id;
    console.log("[AUDIO_CALL] endCall: hanging up", { toUserId: remoteId });
    if (callingTimeoutRef.current) {
      clearTimeout(callingTimeoutRef.current);
      callingTimeoutRef.current = null;
    }
    if (remoteId && socket?.connected) {
      socket.emit("audio-call-end", { toUserId: remoteId });
    }
    cleanup();
  }, [remoteUser?.id, socket, cleanup]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const startCall = useCallback(
    (remoteUserId, remoteUserName) => {
      const toId = remoteUserId?.toString?.() ?? remoteUserId;
      console.log("[AUDIO_CALL] startCall: starting signalling", { currentUserId, toUserId: toId, remoteUserName });
      if (!socket?.connected || !currentUserId) {
        console.log("[AUDIO_CALL] startCall: abort - socket or currentUserId missing", { socketConnected: !!socket?.connected, currentUserId });
        return;
      }
      if (callingTimeoutRef.current) {
        clearTimeout(callingTimeoutRef.current);
        callingTimeoutRef.current = null;
      }
      setRemoteUser({ id: toId, name: remoteUserName || "User" });
      setCallState("calling");
      setErrorMessage(null);
      isCallerRef.current = true;
      console.log("[AUDIO_CALL] emitting audio-call-request", { toUserId: toId });
      socket.emit("audio-call-request", {
        toUserId: toId,
        fromUserName: currentUserName || "Someone",
      });
      callingTimeoutRef.current = setTimeout(() => {
        if (isCallerRef.current) {
          setErrorMessage("No answer");
          endCall();
        }
        callingTimeoutRef.current = null;
      }, 45000);
    },
    [socket, currentUserId, currentUserName, endCall]
  );

  const rejectCall = useCallback(() => {
    const remoteId = remoteUser?.id?.toString?.() ?? remoteUser?.id;
    console.log("[AUDIO_CALL] rejectCall: declining", { toUserId: remoteId });
    if (remoteId && socket?.connected) {
      socket.emit("audio-call-reject", { toUserId: remoteId });
    }
    setCallState("idle");
    setRemoteUser(null);
  }, [remoteUser?.id, socket]);

  const acceptCall = useCallback(async () => {
    const remoteId = remoteUser?.id?.toString?.() ?? remoteUser?.id;
    console.log("[AUDIO_CALL] acceptCall: callee accepting", { remoteUserId: remoteId, socketConnected: !!socket?.connected });
    if (!remoteId || !socket?.connected || !currentUserId) {
      console.log("[AUDIO_CALL] acceptCall: abort - missing remoteId/socket/currentUserId");
      return;
    }
    setCallState("connecting");
    setErrorMessage(null);

    try {
      console.log("[AUDIO_CALL] acceptCall: requesting getUserMedia (audio)");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);

      console.log("[AUDIO_CALL] acceptCall: creating RTCPeerConnection (callee), waiting for offer");
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (e) => {
        console.log("[AUDIO_CALL] callee ontrack - remote stream received");
        if (e.streams?.[0]) {
          setRemoteStream(e.streams[0]);
          setCallState("active");
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && socket?.connected) {
          console.log("[AUDIO_CALL] callee sending ICE candidate to", remoteId);
          socket.emit("webrtc-ice", {
            toUserId: remoteId,
            candidate: e.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("[AUDIO_CALL] callee connectionState:", pc.connectionState);
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setErrorMessage("Connection lost");
        }
        if (pc.connectionState === "closed") {
          cleanup();
        }
      };

      console.log("[AUDIO_CALL] acceptCall: emitting audio-call-accept to", remoteId);
      socket.emit("audio-call-accept", { toUserId: remoteId });
    } catch (err) {
      console.error("[AUDIO_CALL] acceptCall error:", err);
      setErrorMessage("Microphone access denied");
      setCallState("incoming");
    }
  }, [remoteUser?.id, socket, currentUserId, endCall, cleanup]);

  useEffect(() => {
    if (!socket || !currentUserId) return;

    const handleIncomingCall = (data) => {
      const { fromUserId, fromUserName } = data;
      const fromId = fromUserId?.toString?.() ?? fromUserId;
      console.log("[AUDIO_CALL] received incoming-audio-call", { fromUserId: fromId, fromUserName, callState });
      if (callState !== "idle") {
        console.log("[AUDIO_CALL] incoming call ignored - not idle, callState=", callState);
        return;
      }
      setRemoteUser({ id: fromId, name: fromUserName || "Someone" });
      setCallState("incoming");
    };

    const handleCallAccepted = async (data) => {
      const fromIdStr = data.fromUserId?.toString?.() ?? data.fromUserId;
      const remoteIdStr = remoteUser?.id?.toString?.() ?? remoteUser?.id;
      console.log("[AUDIO_CALL] caller received call-accepted", { fromUserId: fromIdStr, remoteUserIds: remoteIdStr, isCaller: isCallerRef.current });
      if (fromIdStr !== remoteIdStr || !isCallerRef.current) {
        console.log("[AUDIO_CALL] call-accepted ignored - fromId !== remoteId or not caller");
        return;
      }
      if (callingTimeoutRef.current) {
        clearTimeout(callingTimeoutRef.current);
        callingTimeoutRef.current = null;
      }
      setCallState("connecting");

      try {
        console.log("[AUDIO_CALL] caller: getting user media");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setLocalStream(stream);

        console.log("[AUDIO_CALL] caller: creating RTCPeerConnection and creating offer");
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (e) => {
          console.log("[AUDIO_CALL] caller ontrack - remote stream received");
          if (e.streams?.[0]) {
            setRemoteStream(e.streams[0]);
            setCallState("active");
          }
        };

        pc.onicecandidate = (e) => {
          if (e.candidate && socket?.connected) {
            console.log("[AUDIO_CALL] caller sending ICE candidate to", fromIdStr);
            socket.emit("webrtc-ice", {
              toUserId: fromIdStr,
              candidate: e.candidate,
            });
          }
        };

        pc.onconnectionstatechange = () => {
          console.log("[AUDIO_CALL] caller connectionState:", pc.connectionState);
          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            setErrorMessage("Connection lost");
          }
          if (pc.connectionState === "closed") {
            cleanup();
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("[AUDIO_CALL] caller: sending webrtc-offer to", fromIdStr);
        socket.emit("webrtc-offer", {
          toUserId: fromIdStr,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.error("[AUDIO_CALL] caller handleCallAccepted error:", err);
        setErrorMessage("Failed to start audio");
        endCall();
      }
    };

    const handleCallRejected = (data) => {
      const fromIdStr = data.fromUserId?.toString?.() ?? data.fromUserId;
      const remoteIdStr = remoteUser?.id?.toString?.() ?? remoteUser?.id;
      if (fromIdStr === remoteIdStr) {
        if (callingTimeoutRef.current) {
          clearTimeout(callingTimeoutRef.current);
          callingTimeoutRef.current = null;
        }
        setCallState("idle");
        setRemoteUser(null);
        setErrorMessage("Call declined");
      }
    };

    const handleWebrtcOffer = async (data) => {
      const pc = peerConnectionRef.current;
      const fromIdStr = data.fromUserId?.toString?.() ?? data.fromUserId;
      const remoteIdStr = remoteUser?.id?.toString?.() ?? remoteUser?.id;
      console.log("[AUDIO_CALL] callee received webrtc-offer", { fromUserId: fromIdStr, remoteUserId: remoteIdStr, hasPc: !!pc });
      if (!pc || fromIdStr !== remoteIdStr) {
        console.log("[AUDIO_CALL] webrtc-offer ignored - no pc or fromId !== remoteId");
        return;
      }
      try {
        console.log("[AUDIO_CALL] callee: setRemoteDescription(offer), createAnswer, sending answer");
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (socket?.connected) {
          socket.emit("webrtc-answer", {
            toUserId: fromIdStr,
            sdp: pc.localDescription,
          });
          console.log("[AUDIO_CALL] callee: emitted webrtc-answer to", fromIdStr);
        }
      } catch (err) {
        console.error("[AUDIO_CALL] callee handleWebrtcOffer error:", err);
        setErrorMessage("Failed to connect");
        endCall();
      }
    };

    const handleWebrtcAnswer = async (data) => {
      const pc = peerConnectionRef.current;
      const fromIdStr = data.fromUserId?.toString?.() ?? data.fromUserId;
      const remoteIdStr = remoteUser?.id?.toString?.() ?? remoteUser?.id;
      console.log("[AUDIO_CALL] caller received webrtc-answer", { fromUserId: fromIdStr, remoteUserId: remoteIdStr, hasPc: !!pc });
      if (!pc || fromIdStr !== remoteIdStr) {
        console.log("[AUDIO_CALL] webrtc-answer ignored - no pc or fromId !== remoteId");
        return;
      }
      try {
        console.log("[AUDIO_CALL] caller: setRemoteDescription(answer)");
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } catch (err) {
        console.error("[AUDIO_CALL] caller setRemoteDescription(answer) error:", err);
      }
    };

    const handleWebrtcIce = async (data) => {
      const pc = peerConnectionRef.current;
      console.log("[AUDIO_CALL] received webrtc-ice", { fromUserId: data.fromUserId, hasPc: !!pc, hasCandidate: !!data.candidate });
      if (!pc || !data.candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log("[AUDIO_CALL] addIceCandidate success");
      } catch (err) {
        console.error("[AUDIO_CALL] addIceCandidate error:", err);
      }
    };

    const handleCallEnded = (data) => {
      const fromIdStr = data.fromUserId?.toString?.() ?? data.fromUserId;
      const remoteIdStr = remoteUser?.id?.toString?.() ?? remoteUser?.id;
      if (fromIdStr === remoteIdStr) {
        console.log("[AUDIO_CALL] call-ended from remote, cleaning up");
        cleanup();
      }
    };

    socket.on("incoming-audio-call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("call-rejected", handleCallRejected);
    socket.on("webrtc-offer", handleWebrtcOffer);
    socket.on("webrtc-answer", handleWebrtcAnswer);
    socket.on("webrtc-ice", handleWebrtcIce);
    socket.on("call-ended", handleCallEnded);

    return () => {
      socket.off("incoming-audio-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("call-rejected", handleCallRejected);
      socket.off("webrtc-offer", handleWebrtcOffer);
      socket.off("webrtc-answer", handleWebrtcAnswer);
      socket.off("webrtc-ice", handleWebrtcIce);
      socket.off("call-ended", handleCallEnded);
    };
  }, [
    socket,
    currentUserId,
    remoteUser?.id,
    callState,
    cleanup,
    endCall,
  ]);

  return {
    callState,
    remoteUser,
    localStream,
    remoteStream,
    isMuted,
    errorMessage,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    cleanup,
  };
}
