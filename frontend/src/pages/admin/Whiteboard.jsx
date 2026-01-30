import { useRef, useState, useEffect } from "react";
import axios from "axios";
import {
  Pencil,
  Eraser,
  Square,
  Circle,
  Minus,
  Type,
  Trash2,
  Download,
  Undo,
  Redo,
  MousePointer,
  Plus,
  Users,
  Share2,
  X,
  Search,
  Send,
  Loader2,
  CheckCircle,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BACKEND_URL } from "../../../config";

const tools = [
  { id: "select", icon: MousePointer, label: "Select" },
  { id: "pen", icon: Pencil, label: "Pen" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
  { id: "line", icon: Minus, label: "Line" },
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "text", icon: Type, label: "Text" },
];

const colors = [
  "#000000", "#374151", "#6B7280", "#9CA3AF",
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#22C55E", "#10B981", "#14B8A6", "#06B6D4",
  "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7",
  "#EC4899", "#F43F5E", "#FFFFFF",
];

const strokeWidths = [2, 4, 6, 8, 12, 16];

export default function Whiteboard() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  // Participant states
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [activeParticipants, setActiveParticipants] = useState([]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (canvas && container) {
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      
      canvas.width = width;
      canvas.height = height;
      setCanvasSize({ width, height });
      
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      
      saveState();
    }

    const handleResize = () => {
      if (canvas && container) {
        const rect = container.getBoundingClientRect();
        const imageData = canvas.toDataURL();
        
        canvas.width = rect.width;
        canvas.height = rect.height;
        setCanvasSize({ width: rect.width, height: rect.height });
        
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, rect.width, rect.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = imageData;
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch available participants
  const fetchParticipants = async () => {
    setLoadingUsers(true);
    setFetchError("");
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${BACKEND_URL}/whiteboard/participants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Participants response:", response.data);
      setAvailableUsers(response.data.participants || []);
    } catch (error) {
      console.error("Error fetching participants:", error);
      setFetchError(error.response?.data?.error || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Open add participant modal
  const handleOpenAddParticipant = () => {
    setShowAddParticipant(true);
    setSelectedUsers([]);
    setSearchQuery("");
    setInviteSuccess("");
    setInviteError("");
    setFetchError("");
    fetchParticipants();
  };

  // Toggle user selection
  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u._id === user._id);
      if (isSelected) {
        return prev.filter(u => u._id !== user._id);
      } else {
        return [...prev, user];
      }
    });
  };

  // Send invitations
  const sendInvitations = async () => {
    if (selectedUsers.length === 0) return;
    
    setSendingInvite(true);
    setInviteError("");
    setInviteSuccess("");
    
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${BACKEND_URL}/whiteboard/invite`,
        {
          participantIds: selectedUsers.map(u => u._id),
          boardName: "Whiteboard Session",
          boardId: Date.now().toString()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setInviteSuccess(response.data.message);
      setActiveParticipants(prev => [...prev, ...selectedUsers]);
      
      setTimeout(() => {
        setShowAddParticipant(false);
        setSelectedUsers([]);
      }, 2000);
    } catch (error) {
      setInviteError(error.response?.data?.error || "Failed to send invitations");
    } finally {
      setSendingInvite(false);
    }
  };

  // Filter users based on search
  const filteredUsers = availableUsers.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const saveState = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(canvas.toDataURL());
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    if (tool === "select") return;
    
    const coords = getCoordinates(e);
    setIsDrawing(true);
    setStartPos(coords);

    if (tool === "pen" || tool === "eraser") {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const draw = (e) => {
    if (!isDrawing || tool === "select") return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const coords = getCoordinates(e);

    if (tool === "pen") {
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (tool === "eraser") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = strokeWidth * 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (tool === "line" || tool === "rectangle" || tool === "circle") {
      const coords = getCoordinates(e);
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (tool === "line") {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else if (tool === "rectangle") {
        ctx.beginPath();
        ctx.strokeRect(
          startPos.x,
          startPos.y,
          coords.x - startPos.x,
          coords.y - startPos.y
        );
      } else if (tool === "circle") {
        const radius = Math.sqrt(
          Math.pow(coords.x - startPos.x, 2) + Math.pow(coords.y - startPos.y, 2)
        );
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }

    setIsDrawing(false);
    saveState();
  };

  const handleTextClick = (e) => {
    if (tool !== "text") return;
    
    const coords = getCoordinates(e);
    const text = prompt("Enter text:");
    
    if (text) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.font = `${strokeWidth * 4}px Inter, sans-serif`;
      ctx.fillStyle = color;
      ctx.fillText(text, coords.x, coords.y);
      saveState();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Whiteboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Collaborative drawing and brainstorming</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {activeParticipants.length + 1} online
          </Badge>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenAddParticipant}>
            <UserPlus className="h-4 w-4" />
            Add Participant
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={downloadCanvas}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex gap-4">
        {/* Toolbar */}
        <Card className="w-14 flex-shrink-0">
          <CardContent className="p-2 flex flex-col gap-1">
            {tools.map((t) => (
              <Button
                key={t.id}
                variant={tool === t.id ? "default" : "ghost"}
                size="icon"
                className="h-10 w-10"
                onClick={() => setTool(t.id)}
                title={t.label}
              >
                <t.icon className="h-5 w-5" />
              </Button>
            ))}
            
            <Separator className="my-2" />
            
            {/* Color Picker */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10" title="Color">
                  <div 
                    className="h-6 w-6 rounded-full border-2 border-neutral-300 dark:border-neutral-600"
                    style={{ backgroundColor: color }}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" className="p-2">
                <div className="grid grid-cols-4 gap-1">
                  {colors.map((c) => (
                    <button
                      key={c}
                      className={`h-7 w-7 rounded-md border-2 transition-transform hover:scale-110 ${
                        color === c ? "border-primary" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Stroke Width */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10" title="Stroke Width">
                  <div className="flex items-center justify-center">
                    <div 
                      className="rounded-full bg-current"
                      style={{ width: strokeWidth * 2, height: strokeWidth * 2 }}
                    />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" className="p-2">
                <div className="flex flex-col gap-1">
                  {strokeWidths.map((w) => (
                    <button
                      key={w}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted ${
                        strokeWidth === w ? "bg-muted" : ""
                      }`}
                      onClick={() => setStrokeWidth(w)}
                    >
                      <div 
                        className="rounded-full bg-current"
                        style={{ width: w * 2, height: w * 2 }}
                      />
                      <span className="text-sm">{w}px</span>
                    </button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator className="my-2" />

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={undo}
              disabled={historyIndex <= 0}
              title="Undo"
            >
              <Undo className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              title="Redo"
            >
              <Redo className="h-5 w-5" />
            </Button>
            
            <Separator className="my-2" />
            
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              onClick={clearCanvas}
              title="Clear"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </CardContent>
        </Card>

        {/* Canvas Area */}
        <Card className="flex-1 overflow-hidden">
          <div 
            ref={containerRef}
            className="w-full h-full bg-white dark:bg-neutral-100 cursor-crosshair"
            style={{ minHeight: "500px" }}
          >
            <canvas
              ref={canvasRef}
              className="touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              onClick={handleTextClick}
            />
          </div>
        </Card>

        {/* Right Panel - Participants */}
        <Card className="w-56 flex-shrink-0">
          <CardContent className="p-3 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Participants
                </h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={handleOpenAddParticipant}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {/* Current User */}
                <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      You
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1">You</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                    Host
                  </Badge>
                </div>
                
                {/* Active Participants */}
                {activeParticipants.map((participant) => (
                  <div key={participant._id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-muted">
                        {participant.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate flex-1">{participant.name}</span>
                  </div>
                ))}
                
                {activeParticipants.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No other participants yet
                  </p>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Pages
                </h3>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {["Page 1", "Page 2"].map((page, i) => (
                  <div 
                    key={page}
                    className={`p-2 rounded-md text-sm cursor-pointer transition-colors ${
                      i === 0 ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    {page}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Participant Modal */}
      {showAddParticipant && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowAddParticipant(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl shadow-2xl z-[51] text-neutral-900 dark:text-neutral-100">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="font-semibold">Add Participants</h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Invite team members to collaborate
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAddParticipant(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {(inviteError || fetchError) && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-400">
                  {inviteError || fetchError}
                </div>
              )}
              {inviteSuccess && (
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 p-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {inviteSuccess}
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search by name, email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <Badge 
                      key={user._id} 
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {user.name}
                      <button 
                        onClick={() => toggleUserSelection(user)}
                        className="ml-1 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* User List */}
              <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500 text-sm">
                    {searchQuery ? "No users match your search" : "No other team members found"}
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUsers.find(u => u._id === user._id);
                    return (
                      <div
                        key={user._id}
                        onClick={() => toggleUserSelection(user)}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? "bg-primary/10 border border-primary/20" 
                            : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-neutral-200 dark:bg-neutral-700">
                            {user.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {user.department}
                        </Badge>
                        {isSelected && (
                          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-neutral-200 dark:border-neutral-800">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowAddParticipant(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={sendInvitations}
                disabled={selectedUsers.length === 0 || sendingInvite}
              >
                {sendingInvite ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Invite ({selectedUsers.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
