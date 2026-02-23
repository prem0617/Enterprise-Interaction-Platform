/**
 * useDocumentCollaboration
 *
 * Real-time document collaboration hook.
 * Socket is created inside DocumentEditor and passed in here.
 *
 * Usage:
 *   const { collaborators, typingUsers, broadcastUpdate, broadcastTyping, registerRemoteUpdateHandler } =
 *     useDocumentCollaboration(socket, docId, currentUserId, userName);
 *
 * @param {object|null} socket        - Socket.IO client from createSocketConnection
 * @param {string}      docId         - MongoDB document _id
 * @param {string}      currentUserId - Logged-in user's _id
 * @param {string}      userName      - Display name shown to other collaborators
 */

import { useState, useEffect, useRef, useCallback } from "react";

export function useDocumentCollaboration(socket, docId, currentUserId, userName) {
  // Other users currently in the same document room: [{ userId, name, color }]
  const [collaborators, setCollaborators] = useState([]);

  // Users currently typing (excludes self): [{ userId, name, color }]
  const [typingUsers, setTypingUsers] = useState([]);

  // Editor registers this callback so we can push remote updates directly
  // into the contentEditable DOM without going through React state (avoids
  // cursor-jump on every remote keystroke)
  const onRemoteUpdateRef = useRef(null);

  // Debounce timers
  const broadcastTimerRef = useRef(null);
  const typingTimerRef    = useRef(null);

  // ── 1. Join / Leave doc room ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !docId || !currentUserId) return;

    console.log(`[DOC_COLLAB] joining doc:${docId}`);
    socket.emit("doc-join", { docId, userName });

    // Ask server for in-memory content snapshot in case we are a late joiner
    socket.emit("doc-request-state", { docId });

    return () => {
      console.log(`[DOC_COLLAB] leaving doc:${docId}`);
      socket.emit("doc-leave", { docId });

      // Clear any pending debounce timers on unmount
      clearTimeout(broadcastTimerRef.current);
      clearTimeout(typingTimerRef.current);
    };
  }, [socket, docId, currentUserId, userName]);

  // ── 2. Socket event listeners ─────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !docId || !currentUserId) return;

    // Remote user changed the document content
    const handleDocUpdate = ({ content, senderId, version }) => {
      if (String(senderId) === String(currentUserId)) return; // ignore own echo
      console.log(`[DOC_COLLAB] doc-update from ${senderId}`);
      onRemoteUpdateRef.current?.({ content, version });
    };

    // Server sends full content snapshot to late joiners only
    const handleFullState = ({ content, version }) => {
      console.log(`[DOC_COLLAB] doc-full-state received`);
      onRemoteUpdateRef.current?.({ content, version });
    };

    // Server broadcasts updated collaborator list whenever someone joins/leaves
    const handleCollaborators = ({ collaborators: list }) => {
      setCollaborators(
        (list || []).filter((c) => String(c.userId) !== String(currentUserId))
      );
    };

    // Typing indicator from another user.
    // FIX: server emits { userId, userName, color, isTyping } — destructure userName as name
    const handleTyping = ({ userId: typingId, userName: name, color, isTyping }) => {
      if (String(typingId) === String(currentUserId)) return;
      setTypingUsers((prev) => {
        if (isTyping) {
          if (prev.find((u) => String(u.userId) === String(typingId))) return prev;
          return [...prev, { userId: typingId, name, color }];
        }
        return prev.filter((u) => String(u.userId) !== String(typingId));
      });
    };

    socket.on("doc-update",        handleDocUpdate);
    socket.on("doc-full-state",    handleFullState);
    socket.on("doc-collaborators", handleCollaborators);
    socket.on("doc-typing",        handleTyping);

    return () => {
      socket.off("doc-update",        handleDocUpdate);
      socket.off("doc-full-state",    handleFullState);
      socket.off("doc-collaborators", handleCollaborators);
      socket.off("doc-typing",        handleTyping);
    };
  }, [socket, docId, currentUserId]);

  // ── 3. Outgoing helpers ───────────────────────────────────────────────────

  /**
   * Register a callback that fires whenever a remote content update arrives.
   * The editor calls this once on mount so we can directly update its DOM.
   */
  const registerRemoteUpdateHandler = useCallback((cb) => {
    onRemoteUpdateRef.current = cb;
  }, []);

  /**
   * Broadcast a local content change to all other users in the room.
   * Debounced to 150 ms.
   */
  const broadcastUpdate = useCallback(
    (content) => {
      if (!socket?.connected || !docId) return;
      clearTimeout(broadcastTimerRef.current);
      broadcastTimerRef.current = setTimeout(() => {
        console.log(`[DOC_COLLAB] emitting doc-update`);
        socket.emit("doc-update", { docId, content, version: Date.now() });
      }, 150);
    },
    [socket, docId]
  );

  /**
   * Emit typing-start immediately; auto-emit typing-stop after 1.5 s of silence.
   */
  const broadcastTyping = useCallback(() => {
    if (!socket?.connected || !docId) return;
    socket.emit("doc-typing", { docId, userName, isTyping: true });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit("doc-typing", { docId, userName, isTyping: false });
    }, 1500);
  }, [socket, docId, userName]);

  /**
   * Broadcast cursor position to other users (optional).
   */
  const broadcastCursor = useCallback(
    (cursor) => {
      if (!socket?.connected || !docId) return;
      socket.emit("doc-cursor", { docId, cursor });
    },
    [socket, docId]
  );

  return {
    collaborators,               // [{ userId, name, color }] — other live editors
    typingUsers,                 // [{ userId, name, color }] — currently typing
    registerRemoteUpdateHandler, // call once on editor mount
    broadcastUpdate,             // call on every input event
    broadcastTyping,             // call on every keydown/input event
    broadcastCursor,             // optional: call on selectionchange
  };
}