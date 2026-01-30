import { useRef, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import {
  Pencil,
  Eraser,
  Trash2,
  Download,
  Undo,
  Redo,
  X,
  Search,
  Send,
  Loader2,
  CheckCircle,
  UserPlus,
  Copy,
  Link2,
  ArrowLeft,
  Users,
  Circle,
  Square,
  Minus,
  Plus,
  FolderOpen,
  Clock,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BACKEND_URL } from "../../../config";

const STORAGE_KEY = "whiteboard_last_session";

const SOCKET_URL = "http://localhost:8000";

const COLORS = [
  "#000000", "#374151", "#EF4444", "#F97316", 
  "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899"
];

const STROKE_WIDTHS = [2, 4, 6, 10];

export default function Whiteboard({ embedded = false }) {
  const { sessionId: urlSessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Canvas refs
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  
  // Drawing state refs (using refs to avoid re-renders during drawing)
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  
  // History for undo/redo
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  
  // Socket ref
  const socketRef = useRef(null);
  
  // State
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  
  // Session state
  const [sessionId, setSessionId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  // Session management
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [sessionName, setSessionName] = useState("Untitled Whiteboard");
  const [creatingSession, setCreatingSession] = useState(false);
  
  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteMessage, setInviteMessage] = useState({ type: "", text: "" });
  const [copiedLink, setCopiedLink] = useState(false);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
    setAuthChecked(true);
  }, []);

  // Set session ID from URL, localStorage, or create new
  useEffect(() => {
    if (urlSessionId) {
      setSessionId(urlSessionId);
      localStorage.setItem(STORAGE_KEY, urlSessionId);
    } else {
      // Try to restore last session from localStorage
      const lastSession = localStorage.getItem(STORAGE_KEY);
      if (lastSession) {
        setSessionId(lastSession);
      } else {
        // Generate a new session ID
        const newId = Math.random().toString(36).substring(2, 15);
        setSessionId(newId);
        localStorage.setItem(STORAGE_KEY, newId);
      }
    }
  }, [urlSessionId]);

  // Fetch user's sessions
  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/whiteboard/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(res.data.sessions || []);
    } catch (err) {
      console.error("Fetch sessions error:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Load sessions on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
    }
  }, [isAuthenticated]);

  // Create new session
  const createNewSession = async (name) => {
    setCreatingSession(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BACKEND_URL}/whiteboard/sessions`,
        { name: name || "Untitled Whiteboard" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const newSessionId = res.data.sessionId;
      setSessionId(newSessionId);
      localStorage.setItem(STORAGE_KEY, newSessionId);
      setSessionName(res.data.name);
      setShowSessionsModal(false);
      
      // Clear canvas for new session
      clearCanvasLocal();
      historyRef.current = [];
      historyIndexRef.current = -1;
      saveToHistory();
      
      // Refresh sessions list
      fetchSessions();
    } catch (err) {
      console.error("Create session error:", err);
    } finally {
      setCreatingSession(false);
    }
  };

  // Switch to a different session
  const switchSession = (newSessionId, name) => {
    // Save current canvas before switching
    broadcastCanvas();
    
    // Disconnect from current session
    if (socketRef.current) {
      socketRef.current.emit("leave-session", { sessionId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    // Switch to new session
    setSessionId(newSessionId);
    setSessionName(name || "Untitled Whiteboard");
    localStorage.setItem(STORAGE_KEY, newSessionId);
    setShowSessionsModal(false);
    setOnlineUsers([]);
    
    // Reset canvas state
    setCanvasReady(false);
    historyRef.current = [];
    historyIndexRef.current = -1;
  };

  // Handle accept invitation from URL
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "accept" && sessionId && isAuthenticated) {
      acceptInvitation();
    }
  }, [sessionId, isAuthenticated, searchParams]);

  const acceptInvitation = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${BACKEND_URL}/whiteboard/sessions/${sessionId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("Accept invitation error:", err);
    }
  };

  // Initialize canvas
  const initializeCanvas = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    
    if (!container || !canvas) return false;
    
    const rect = container.getBoundingClientRect();
    
    // Make sure container has dimensions
    if (rect.width < 10 || rect.height < 10) return false;
    
    // Set actual pixel dimensions
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);
    
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
    
    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Save initial state if not already done
    if (historyRef.current.length === 0) {
      saveToHistory();
    }
    
    setCanvasReady(true);
    return true;
  }, []);

  // Initialize canvas after auth check
  useEffect(() => {
    if (!authChecked) return;
    
    let attempts = 0;
    const maxAttempts = 20;
    
    const tryInit = () => {
      if (initializeCanvas()) {
        return;
      }
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(tryInit, 100);
      }
    };
    
    // Start initialization
    const timer = setTimeout(tryInit, 50);

    // Handle resize
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      
      if (!container || !canvas || !ctx) return;
      
      const rect = container.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      
      // Save current image
      const imageData = canvas.toDataURL();
      
      canvas.width = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);
      
      // Restore context settings
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      // Restore image
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = imageData;
    };

    window.addEventListener("resize", handleResize);
    
    // Also use ResizeObserver to detect when container becomes visible
    let resizeObserver;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (!canvasReady) {
          initializeCanvas();
        }
      });
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [authChecked, initializeCanvas, canvasReady]);

  // Socket connection
  useEffect(() => {
    if (!sessionId || !isAuthenticated || !canvasReady) return;
    
    const token = localStorage.getItem("token");
    if (!token) return;

    // Connect to socket
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"]
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected");
      socket.emit("join-session", { sessionId });
    });

    socket.on("session-joined", (data) => {
      console.log("Joined session:", data);
      setOnlineUsers(data.participants || []);
      
      // Load saved canvas data if available
      if (data.canvasData) {
        loadCanvasData(data.canvasData);
      }
    });

    socket.on("user-joined", (data) => {
      setOnlineUsers(data.participants || []);
    });

    socket.on("user-left", (data) => {
      setOnlineUsers(data.participants || []);
    });

    socket.on("draw-line", (data) => {
      drawRemoteLine(data);
    });

    socket.on("draw-shape", (data) => {
      drawRemoteShape(data);
    });

    socket.on("clear-canvas", () => {
      clearCanvasLocal();
    });

    socket.on("canvas-update", (data) => {
      if (data.canvasData) {
        loadCanvasData(data.canvasData);
      }
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    return () => {
      if (socket) {
        socket.emit("leave-session", { sessionId });
        socket.disconnect();
      }
    };
  }, [sessionId, isAuthenticated, canvasReady]);

  // Auto-save canvas periodically
  useEffect(() => {
    if (!sessionId || !canvasReady) return;

    const autoSave = () => {
      const canvas = canvasRef.current;
      const socket = socketRef.current;
      if (!canvas || !socket) return;

      socket.emit("save-canvas", {
        sessionId,
        canvasData: canvas.toDataURL()
      });
    };

    // Save every 30 seconds
    const interval = setInterval(autoSave, 30000);

    // Also save when user leaves the page
    const handleBeforeUnload = () => autoSave();
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Final save before unmount
      autoSave();
    };
  }, [sessionId, canvasReady]);

  const loadCanvasData = (dataUrl) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  };

  const drawRemoteLine = ({ fromX, fromY, toX, toY, color: lineColor, width }) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = width;
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
  };

  const drawRemoteShape = ({ type, startX, startY, endX, endY, color: shapeColor, width }) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.strokeStyle = shapeColor;
    ctx.lineWidth = width;
    ctx.beginPath();

    if (type === "rect") {
      ctx.rect(startX, startY, endX - startX, endY - startY);
    } else if (type === "circle") {
      const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
      ctx.arc(startX, startY, radius, 0, Math.PI * 2);
    } else if (type === "line") {
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
    }
    ctx.stroke();
  };

  // History management
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Remove redo states
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    
    // Add current state
    historyRef.current.push(canvas.toDataURL());
    historyIndexRef.current = historyRef.current.length - 1;
    
    // Limit history
    if (historyRef.current.length > 30) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
    
    updateHistoryState();
  }, []);

  const updateHistoryState = () => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  };

  const undo = () => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    restoreFromHistory();
  };

  const redo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    restoreFromHistory();
  };

  const restoreFromHistory = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      updateHistoryState();
      broadcastCanvas();
    };
    img.src = historyRef.current[historyIndexRef.current];
  };

  const broadcastCanvas = () => {
    const canvas = canvasRef.current;
    const socket = socketRef.current;
    if (!canvas || !socket || !sessionId) return;

    socket.emit("save-canvas", {
      sessionId,
      canvasData: canvas.toDataURL()
    });
  };

  // Get mouse/touch position relative to canvas
  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    // Handle case where canvas isn't sized yet
    if (rect.width === 0 || rect.height === 0 || canvas.width === 0 || canvas.height === 0) {
      return { x: 0, y: 0 };
    }
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  // Drawing handlers
  const startDrawing = (e) => {
    e.preventDefault();
    
    // Make sure canvas is ready
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas || canvas.width === 0) return;
    
    const pos = getPos(e);
    
    isDrawingRef.current = true;
    lastPosRef.current = pos;
    startPosRef.current = pos;
    
    if (tool === "pen" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    
    const ctx = ctxRef.current;
    const socket = socketRef.current;
    if (!ctx) return;
    
    const pos = getPos(e);
    
    if (tool === "pen" || tool === "eraser") {
      const drawColor = tool === "eraser" ? "#ffffff" : color;
      const drawWidth = tool === "eraser" ? strokeWidth * 3 : strokeWidth;
      
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawWidth;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      
      // Broadcast line segment
      if (socket && sessionId) {
        socket.emit("draw-line", {
          sessionId,
          fromX: lastPosRef.current.x,
          fromY: lastPosRef.current.y,
          toX: pos.x,
          toY: pos.y,
          color: drawColor,
          width: drawWidth
        });
      }
    }
    
    // Always update lastPosRef for all tools (needed for shapes)
    lastPosRef.current = pos;
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    
    const ctx = ctxRef.current;
    const socket = socketRef.current;
    
    // For shapes, draw the final shape
    if (tool === "rect" || tool === "circle" || tool === "line") {
      const pos = lastPosRef.current;
      const start = startPosRef.current;
      
      if (ctx) {
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.beginPath();
        
        if (tool === "rect") {
          ctx.rect(start.x, start.y, pos.x - start.x, pos.y - start.y);
        } else if (tool === "circle") {
          const radius = Math.sqrt(Math.pow(pos.x - start.x, 2) + Math.pow(pos.y - start.y, 2));
          ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
        } else if (tool === "line") {
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(pos.x, pos.y);
        }
        ctx.stroke();
        
        // Broadcast shape
        if (socket && sessionId) {
          socket.emit("draw-shape", {
            sessionId,
            type: tool,
            startX: start.x,
            startY: start.y,
            endX: pos.x,
            endY: pos.y,
            color,
            width: strokeWidth
          });
        }
      }
    }
    
    saveToHistory();
    broadcastCanvas();
  };

  const clearCanvasLocal = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const clearCanvas = () => {
    clearCanvasLocal();
    saveToHistory();
    
    // Broadcast clear
    const socket = socketRef.current;
    if (socket && sessionId) {
      socket.emit("clear-canvas", { sessionId });
      broadcastCanvas();
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement("a");
    link.download = `whiteboard-${sessionId || "export"}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Invite functions
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/whiteboard/participants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableUsers(res.data.participants || []);
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const openInviteModal = () => {
    setShowInviteModal(true);
    setSelectedUsers([]);
    setSearchQuery("");
    setInviteMessage({ type: "", text: "" });
    fetchUsers();
  };

  const toggleUser = (user) => {
    setSelectedUsers(prev =>
      prev.find(u => u._id === user._id)
        ? prev.filter(u => u._id !== user._id)
        : [...prev, user]
    );
  };

  const sendInvites = async () => {
    if (selectedUsers.length === 0) return;
    
    setSendingInvite(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BACKEND_URL}/whiteboard/invite`,
        {
          participantIds: selectedUsers.map(u => u._id),
          sessionId,
          boardName: "Whiteboard Session"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setInviteMessage({ type: "success", text: res.data.message });
      setTimeout(() => setShowInviteModal(false), 2000);
    } catch (err) {
      setInviteMessage({ type: "error", text: err.response?.data?.error || "Failed to send invites" });
    } finally {
      setSendingInvite(false);
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/whiteboard/${sessionId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredUsers = availableUsers.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auth loading state
  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center bg-sky-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  // Not authenticated (for standalone page)
  if (!embedded && !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center p-4 bg-sky-50 dark:bg-gray-950">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Users className="h-8 w-8 text-violet-600 dark:text-violet-400" />
            </div>
            <h1 className="text-xl font-semibold">Whiteboard Session</h1>
            <p className="text-muted-foreground">Please log in to join this whiteboard session.</p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/login")}>
                Employee Login
              </Button>
              <Button className="flex-1" onClick={() => navigate("/adminLogin")}>
                Admin Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={embedded ? "h-[calc(100vh-8rem)] flex flex-col gap-3" : "h-screen flex flex-col gap-3 p-4 bg-sky-50 dark:bg-gray-950"}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {!embedded && (
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-lg font-semibold">{sessionName || "Whiteboard"}</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">ID: {sessionId}</span>
              {onlineUsers.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                  {onlineUsers.length} online
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchSessions(); setShowSessionsModal(true); }}>
            <FolderOpen className="h-4 w-4 mr-1" />
            Sessions
          </Button>
          <Button variant="outline" size="sm" onClick={copyLink}>
            {copiedLink ? <CheckCircle className="h-4 w-4 mr-1 text-green-500" /> : <Link2 className="h-4 w-4 mr-1" />}
            {copiedLink ? "Copied!" : "Copy Link"}
          </Button>
          <Button variant="outline" size="sm" onClick={openInviteModal}>
            <UserPlus className="h-4 w-4 mr-1" />
            Invite
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCanvas}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Toolbar */}
        <div className="w-14 flex flex-col gap-1 p-2 bg-white dark:bg-neutral-900 rounded-xl border shadow-sm">
          {/* Drawing tools */}
          <Button
            variant={tool === "pen" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("pen")}
            title="Pen"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "eraser" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("eraser")}
            title="Eraser"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          
          <div className="h-px bg-border my-1" />
          
          {/* Shape tools */}
          <Button
            variant={tool === "line" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("line")}
            title="Line"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "rect" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("rect")}
            title="Rectangle"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "circle" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("circle")}
            title="Circle"
          >
            <Circle className="h-4 w-4" />
          </Button>

          <div className="h-px bg-border my-1" />

          {/* Colors */}
          <div className="flex flex-col gap-1 items-center">
            {COLORS.map(c => (
              <button
                key={c}
                className={`w-6 h-6 rounded-md border-2 transition-transform hover:scale-110 ${
                  color === c ? "border-violet-500 scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>

          <div className="h-px bg-border my-1" />

          {/* Stroke widths */}
          <div className="flex flex-col gap-1 items-center">
            {STROKE_WIDTHS.map(w => (
              <button
                key={w}
                className={`rounded-full bg-gray-800 dark:bg-gray-200 transition-transform hover:scale-110 ${
                  strokeWidth === w ? "ring-2 ring-violet-500 ring-offset-1" : ""
                }`}
                style={{ width: w + 6, height: w + 6 }}
                onClick={() => setStrokeWidth(w)}
              />
            ))}
          </div>

          <div className="h-px bg-border my-1" />

          {/* Actions */}
          <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} title="Undo">
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} title="Redo">
            <Redo className="h-4 w-4" />
          </Button>
          
          <div className="flex-1" />
          
          <Button variant="ghost" size="icon" onClick={clearCanvas} className="text-red-500 hover:text-red-600 hover:bg-red-50" title="Clear">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Canvas container */}
        <div 
          ref={containerRef}
          className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden relative min-h-[400px]"
        >
          <canvas
            ref={canvasRef}
            className="cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50" 
            onClick={() => setShowInviteModal(false)} 
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl shadow-2xl z-[51] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-semibold text-lg">Invite Participants</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowInviteModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 space-y-4">
              {/* Messages */}
              {inviteMessage.text && (
                <div className={`p-3 rounded-lg text-sm ${
                  inviteMessage.type === "success" 
                    ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                    : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}>
                  {inviteMessage.text}
                </div>
              )}

              {/* Copy link section */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Share Link</label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={`${window.location.origin}/whiteboard/${sessionId}`} 
                    className="text-xs bg-gray-50 dark:bg-neutral-800" 
                  />
                  <Button variant="outline" size="icon" onClick={copyLink}>
                    {copiedLink ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="relative flex items-center">
                <div className="flex-1 border-t" />
                <span className="px-3 text-xs text-muted-foreground bg-white dark:bg-neutral-900">or send email invite</span>
                <div className="flex-1 border-t" />
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Selected users */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedUsers.map(u => (
                    <Badge key={u._id} variant="secondary" className="gap-1 pr-1">
                      {u.name}
                      <button 
                        onClick={() => toggleUser(u)}
                        className="ml-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* User list */}
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                {loadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">No users found</p>
                ) : (
                  <div className="p-1">
                    {filteredUsers.map(user => (
                      <div
                        key={user._id}
                        onClick={() => toggleUser(user)}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedUsers.find(u => u._id === user._id) 
                            ? "bg-violet-50 dark:bg-violet-900/20" 
                            : "hover:bg-gray-50 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 text-xs">
                            {user.name?.split(" ").map(n => n[0]).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        {selectedUsers.find(u => u._id === user._id) && (
                          <CheckCircle className="h-4 w-4 text-violet-600" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 border-t bg-gray-50 dark:bg-neutral-800">
              <Button variant="outline" className="flex-1" onClick={() => setShowInviteModal(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1" 
                onClick={sendInvites} 
                disabled={selectedUsers.length === 0 || sendingInvite}
              >
                {sendingInvite ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Invite ({selectedUsers.length})
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Sessions Modal */}
      {showSessionsModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50" 
            onClick={() => setShowSessionsModal(false)} 
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-neutral-900 rounded-xl shadow-2xl z-[51] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-semibold text-lg">Whiteboard Sessions</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSessionsModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 space-y-4">
              {/* Create New Session */}
              <div className="flex gap-2">
                <Input
                  placeholder="New session name..."
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createNewSession(sessionName)}
                />
                <Button onClick={() => createNewSession(sessionName)} disabled={creatingSession}>
                  {creatingSession ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">Your Sessions</div>

              {/* Sessions List */}
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                {loadingSessions ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No sessions yet</p>
                    <p className="text-xs">Create a new session to get started</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {sessions.map((session) => (
                      <div
                        key={session.sessionId}
                        onClick={() => switchSession(session.sessionId, session.name)}
                        className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                          session.sessionId === sessionId
                            ? "bg-violet-50 dark:bg-violet-900/20 border-l-2 border-violet-500"
                            : "hover:bg-gray-50 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{session.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
                            {session.isHost && (
                              <Badge variant="secondary" className="text-xs py-0">Owner</Badge>
                            )}
                            {session.participantCount > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {session.participantCount}
                              </span>
                            )}
                          </div>
                        </div>
                        {session.sessionId === sessionId && (
                          <Badge variant="default" className="ml-2">Current</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 border-t bg-gray-50 dark:bg-neutral-800">
              <Button variant="outline" className="flex-1" onClick={() => setShowSessionsModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
