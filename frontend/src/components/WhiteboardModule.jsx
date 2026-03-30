import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import { BACKEND_URL } from "../../config";
import { useAuthContext } from "../context/AuthContextProvider";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { cn } from "../lib/utils";
import {
  Plus,
  ArrowLeft,
  Copy,
  Users,
  Trash2,
  PenLine,
  Clock,
  Share2,
  Search,
  LogIn,
  Archive,
  Globe,
  Lock,
  User,
  MousePointer2,
  Minus,
  Square,
  Circle,
  Type,
  Eraser,
  Undo2,
  Redo2,
  Download,
  ZoomIn,
  ZoomOut,
  Pen,
  Hand,
  Wifi,
  WifiOff,
  MoveRight,
  Link2,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  History,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   CUSTOM DRAWING CANVAS ENGINE
   ═══════════════════════════════════════════════════════════════ */

const TOOLS = {
  SELECT: "select",
  HAND: "hand",
  PEN: "pen",
  LINE: "line",
  ARROW: "arrow",
  CONNECTOR: "connector",
  RECT: "rect",
  ELLIPSE: "ellipse",
  TEXT: "text",
  ERASER: "eraser",
};

const DEFAULT_COLORS = [
  "#ffffff", "#e2e8f0", "#94a3b8", "#64748b",
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4",
];

// Generate a stable color from a user id string
function userColor(userId) {
  let hash = 0;
  for (let i = 0; i < (userId || "x").length; i++) {
    hash = (userId.charCodeAt(i) * 31 + hash) | 0;
  }
  const hue = ((hash >>> 0) % 360);
  return `hsl(${hue}, 70%, 60%)`;
}

let nextId = 1;
function genId() {
  return `el_${Date.now()}_${nextId++}`;
}

// ─── Hit-testing helpers ────────────────────────────────────────
function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function pointNearLine(px, py, x1, y1, x2, y2, threshold = 6) {
  const len = dist(x1, y1, x2, y2);
  if (len === 0) return dist(px, py, x1, y1) < threshold;
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / (len * len);
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return dist(px, py, projX, projY) < threshold;
}

function pointInRect(px, py, el) {
  const x = Math.min(el.x, el.x + el.w);
  const y = Math.min(el.y, el.y + el.h);
  const w = Math.abs(el.w);
  const h = Math.abs(el.h);
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

function pointNearEllipse(px, py, el, threshold = 6) {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const rx = Math.abs(el.w) / 2;
  const ry = Math.abs(el.h) / 2;
  if (rx === 0 || ry === 0) return false;
  const val = ((px - cx) ** 2) / (rx * rx) + ((py - cy) ** 2) / (ry * ry);
  return val <= (1 + threshold / Math.max(rx, ry)) ** 2;
}

// Get anchor point on an element's boundary for connectors
function getElementAnchor(el, targetX, targetY) {
  if (!el) return null;
  if (el.tool === TOOLS.PEN && el.points?.length) {
    const minX = Math.min(...el.points.map((p) => p[0]));
    const maxX = Math.max(...el.points.map((p) => p[0]));
    const minY = Math.min(...el.points.map((p) => p[1]));
    const maxY = Math.max(...el.points.map((p) => p[1]));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const w = maxX - minX || 40;
    const h = maxY - minY || 30;
    const x = minX;
    const y = minY;
    const midX = x + w / 2;
    const midY = y + h / 2;
    const dx = targetX - midX;
    const dy = targetY - midY;
    const slope = Math.abs(dy / (dx || 0.001));
    const hSlope = h / (w || 1);
    if (slope > hSlope) {
      return { x: midX, y: dy >= 0 ? y + h : y };
    }
    return { x: dx >= 0 ? x + w : x, y: midY };
  }
  const cx = (el.x || 0) + (el.w || 0) / 2;
  const cy = (el.y || 0) + (el.h || 30) / 2;
  if (el.tool === TOOLS.ELLIPSE) {
    const rx = Math.abs(el.w || 0) / 2;
    const ry = Math.abs(el.h || 0) / 2;
    if (rx === 0 || ry === 0) return { x: el.x, y: el.y };
    const angle = Math.atan2(targetY - cy, targetX - cx);
    return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  }
  // Rect, text, pen bbox
  const x = Math.min(el.x, (el.x || 0) + (el.w || 200));
  const y = Math.min(el.y, (el.y || 0) + (el.h || 30));
  const w = Math.abs(el.w || 200);
  const h = Math.abs(el.h || 30);
  const midX = x + w / 2;
  const midY = y + h / 2;
  const dx = targetX - midX;
  const dy = targetY - midY;
  const slope = Math.abs(dy / (dx || 0.001));
  const hSlope = h / (w || 1);
  if (slope > hSlope) {
    return { x: midX, y: dy >= 0 ? y + h : y };
  }
  return { x: dx >= 0 ? x + w : x, y: midY };
}

function hitTest(px, py, el, allElements = []) {
  switch (el.tool) {
    case TOOLS.PEN: {
      for (let i = 1; i < el.points.length; i++) {
        if (pointNearLine(px, py, el.points[i - 1][0], el.points[i - 1][1], el.points[i][0], el.points[i][1], el.strokeWidth + 4))
          return true;
      }
      return false;
    }
    case TOOLS.LINE:
    case TOOLS.ARROW:
      return pointNearLine(px, py, el.x, el.y, el.x + el.w, el.y + el.h, el.strokeWidth + 4);
    case TOOLS.CONNECTOR: {
      const fromEl = allElements.find((e) => e.id === el.fromId);
      const toEl = allElements.find((e) => e.id === el.toId);
      if (!fromEl || !toEl) return false;
      const from = getElementAnchor(fromEl, toEl.x + (toEl.w || 0) / 2, toEl.y + (toEl.h || 30) / 2);
      const to = getElementAnchor(toEl, fromEl.x + (fromEl.w || 0) / 2, fromEl.y + (fromEl.h || 30) / 2);
      if (!from || !to) return false;
      return pointNearLine(px, py, from.x, from.y, to.x, to.y, (el.strokeWidth || 2) + 4);
    }
    case TOOLS.RECT:
      return pointInRect(px, py, el);
    case TOOLS.ELLIPSE:
      return pointNearEllipse(px, py, el);
    case TOOLS.TEXT:
      return pointInRect(px, py, { ...el, w: el.w || 200, h: el.h || 30 });
    default:
      return false;
  }
}

// ─── Render one element to canvas ───────────────────────────────
function drawElement(ctx, el, allElements = []) {
  ctx.save();
  ctx.strokeStyle = el.color || "#ffffff";
  ctx.fillStyle = el.color || "#ffffff";
  ctx.lineWidth = el.strokeWidth || 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = el.opacity ?? 1;

  switch (el.tool) {
    case TOOLS.PEN: {
      if (!el.points || el.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(el.points[0][0], el.points[0][1]);
      for (let i = 1; i < el.points.length; i++) {
        ctx.lineTo(el.points[i][0], el.points[i][1]);
      }
      ctx.stroke();
      break;
    }
    case TOOLS.LINE: {
      ctx.beginPath();
      ctx.moveTo(el.x, el.y);
      ctx.lineTo(el.x + el.w, el.y + el.h);
      ctx.stroke();
      break;
    }
    case TOOLS.ARROW:
    case TOOLS.CONNECTOR: {
      let ax, ay, bx, by;
      if (el.tool === TOOLS.CONNECTOR) {
        const fromEl = allElements.find((e) => e.id === el.fromId);
        const toEl = allElements.find((e) => e.id === el.toId);
        if (!fromEl || !toEl) break;
        const from = getElementAnchor(fromEl, toEl.x + (toEl.w || 0) / 2, toEl.y + (toEl.h || 30) / 2);
        const to = getElementAnchor(toEl, fromEl.x + (fromEl.w || 0) / 2, fromEl.y + (fromEl.h || 30) / 2);
        if (!from || !to) break;
        ax = from.x; ay = from.y;
        bx = to.x; by = to.y;
      } else {
        ax = el.x; ay = el.y;
        bx = el.x + el.w; by = el.y + el.h;
      }
      const angle = Math.atan2(by - ay, bx - ax);
      const hw = Math.max(8, (el.strokeWidth || 2) * 4);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - hw * Math.cos(angle - Math.PI / 6), by - hw * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(bx - hw * Math.cos(angle + Math.PI / 6), by - hw * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
      break;
    }
    case TOOLS.RECT: {
      // Stroke only — transparent fill
      ctx.strokeRect(el.x, el.y, el.w, el.h);
      // If the shape has a text label, render it centred
      if (el.label) {
        ctx.font = `${el.fontSize || 14}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(el.label, el.x + el.w / 2, el.y + el.h / 2);
      }
      break;
    }
    case TOOLS.ELLIPSE: {
      const cx = el.x + el.w / 2;
      const cy = el.y + el.h / 2;
      const rx = Math.abs(el.w) / 2;
      const ry = Math.abs(el.h) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Text label centred inside ellipse
      if (el.label) {
        ctx.font = `${el.fontSize || 14}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(el.label, cx, cy);
      }
      break;
    }
    case TOOLS.TEXT: {
      const fs = el.fontSize || 16;
      ctx.font = `${fs}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      // Multi-line support
      const lines = (el.text || "").split("\n");
      lines.forEach((line, i) => {
        ctx.fillText(line, el.x, el.y + i * (fs + 4));
      });
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════
   ONLINE USERS PANEL — shown on all sides via overlay
   ═══════════════════════════════════════════════════════════════ */

function OnlineUsersPanel({ liveCollaborators, currentUser }) {
  const [collapsed, setCollapsed] = useState(false);

  const allUsers = useMemo(() => {
    const myId = currentUser ? String(currentUser.id || currentUser._id || "") : "";
    const me = currentUser
      ? [{ userId: myId, name: currentUser.name || "You", isMe: true }]
      : [];
    // De-duplicate: remove collaborator entries that are actually us
    const others = liveCollaborators.filter((c) => String(c.userId) !== myId);
    return [...me, ...others];
  }, [liveCollaborators, currentUser]);

  return (
    <div className="absolute top-16 right-3 z-30 flex flex-col items-end gap-2 pointer-events-none select-none">
      {/* Panel card */}
      <div className="pointer-events-auto bg-zinc-900/95 backdrop-blur border border-zinc-700/60 rounded-xl shadow-2xl overflow-hidden w-52">
        {/* Header */}
        <button
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/60 transition-colors"
          onClick={() => setCollapsed((c) => !c)}
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-xs font-semibold text-white">
              {allUsers.length} {allUsers.length === 1 ? "person" : "people"} online
            </span>
          </div>
          <span className="text-zinc-500 text-[10px] ml-1">{collapsed ? "▼" : "▲"}</span>
        </button>

        {/* User list */}
        {!collapsed && (
          <div className="border-t border-zinc-800 divide-y divide-zinc-800/60 max-h-64 overflow-y-auto">
            {allUsers.map((u) => (
              <div key={u.userId} className="flex items-center gap-2.5 px-3 py-2">
                {/* Avatar */}
                <div
                  className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white shadow"
                  style={{
                    backgroundColor: u.isMe ? "#6366f1" : userColor(u.userId),
                  }}
                >
                  {(u.name || "?").charAt(0).toUpperCase()}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate leading-tight">
                    {u.name}
                  </p>
                  {u.isMe ? (
                    <p className="text-[10px] text-indigo-400 leading-tight">You</p>
                  ) : (
                    <p className="text-[10px] text-emerald-400 leading-tight flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-emerald-400 inline-block" />
                      Live
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DRAWING CANVAS COMPONENT
   ═══════════════════════════════════════════════════════════════ */

function DrawingCanvas({
  elements,
  onElementsChange,
  remoteCursors,
  canvasState,
  onCursorMove,
  liveCollaborators,
  currentUser,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [tool, setTool] = useState(TOOLS.PEN);
  const [color, setColor] = useState("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // ─── Camera stored ONLY in a ref to avoid render-loop ──────
  // We also keep a state copy just to display zoom% in the toolbar.
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const [zoomDisplay, setZoomDisplay] = useState(100);

  // Drawing state refs
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const currentElement = useRef(null);
  const elementsRef = useRef(elements);
  elementsRef.current = elements;

  // Undo / redo stacks
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Selection
  const [selectedId, setSelectedId] = useState(null);
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selectedId;
  const dragOffset = useRef({ x: 0, y: 0 });

  // Text input (null | { x, y } for new, or { x, y, id, initialText } for edit)
  const [textInput, setTextInput] = useState(null);
  const textInputRef = useRef(null);
  const textCancelledRef = useRef(false);

  // Connector: first click stores element id, second creates connector
  const [connectorFromId, setConnectorFromId] = useState(null);
  const connectorFromIdRef = useRef(null);
  connectorFromIdRef.current = connectorFromId;

  // Space-bar panning
  const spaceDown = useRef(false);

  // Tool ref so mouse handlers always have current value without stale closure
  const toolRef = useRef(tool);
  toolRef.current = tool;

  // ─── Computed cursor ────────────────────────────────────────
  const [cursorStyle, setCursorStyle] = useState("crosshair");

  const updateCursor = useCallback((currentTool, panning) => {
    if (panning || spaceDown.current) { setCursorStyle("grabbing"); return; }
    switch (currentTool) {
      case TOOLS.SELECT: setCursorStyle("default"); break;
      case TOOLS.HAND: setCursorStyle("grab"); break;
      case TOOLS.TEXT: setCursorStyle("text"); break;
      case TOOLS.CONNECTOR: setCursorStyle("crosshair"); break;
      default: setCursorStyle("crosshair");
    }
  }, []);

  useEffect(() => {
    updateCursor(tool, false);
  }, [tool, updateCursor]);

  // ─── Screen ↔ World coords ──────────────────────────────────
  const screenToWorld = useCallback((sx, sy) => {
    const c = cameraRef.current;
    return [(sx - c.x) / c.zoom, (sy - c.y) / c.zoom];
  }, []);

  // ─── Render ─────────────────────────────────────────────────
  const rafRef = useRef(null);
  const remoteCursorsRef = useRef(remoteCursors);
  remoteCursorsRef.current = remoteCursors;

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const c = cameraRef.current;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = canvasState?.backgroundColor || "#121218";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.zoom, c.zoom);

    // Grid
    const gridSize = 40;
    const startX = Math.floor(-c.x / c.zoom / gridSize) * gridSize;
    const startY = Math.floor(-c.y / c.zoom / gridSize) * gridSize;
    const endX = startX + width / c.zoom + gridSize * 2;
    const endY = startY + height / c.zoom + gridSize * 2;

    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1 / c.zoom;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    // Elements
    const els = elementsRef.current;
    for (let i = 0; i < els.length; i++) drawElement(ctx, els[i], els);

    // In-progress element
    if (currentElement.current) drawElement(ctx, currentElement.current, els);

    // Selection highlight
    const selId = selectedIdRef.current;
    if (selId) {
      const sel = els.find((e) => e.id === selId);
      if (sel) {
        ctx.save();
        ctx.strokeStyle = "#6366f1";
        ctx.lineWidth = 2 / c.zoom;
        ctx.setLineDash([6 / c.zoom, 4 / c.zoom]);
        if (sel.tool === TOOLS.PEN && sel.points?.length) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          sel.points.forEach(([px, py]) => {
            minX = Math.min(minX, px); minY = Math.min(minY, py);
            maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
          });
          ctx.strokeRect(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8);
        } else if (sel.tool === TOOLS.CONNECTOR) {
          const fromEl = els.find((e) => e.id === sel.fromId);
          const toEl = els.find((e) => e.id === sel.toId);
          if (fromEl && toEl) {
            const toCx = (toEl.x || 0) + (toEl.w || 0) / 2;
            const toCy = (toEl.y || 0) + (toEl.h || 30) / 2;
            const fromCx = (fromEl.x || 0) + (fromEl.w || 0) / 2;
            const fromCy = (fromEl.y || 0) + (fromEl.h || 30) / 2;
            const from = getElementAnchor(fromEl, toCx, toCy);
            const to = getElementAnchor(toEl, fromCx, fromCy);
            if (from && to) {
              const minX = Math.min(from.x, to.x) - 4;
              const minY = Math.min(from.y, to.y) - 4;
              const w = Math.abs(to.x - from.x) + 8;
              const h = Math.abs(to.y - from.y) + 8;
              ctx.strokeRect(minX, minY, w, h);
            }
          }
        } else {
          ctx.strokeRect((sel.x || 0) - 4, (sel.y || 0) - 4, (sel.w || 200) + 8, (sel.h || 30) + 8);
        }
        ctx.restore();
      }
    }

    // Connector "from" highlight (source element when creating connector)
    const connFromId = connectorFromIdRef.current;
    if (connFromId) {
      const connFrom = els.find((e) => e.id === connFromId);
      if (connFrom) {
        ctx.save();
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 2 / c.zoom;
        ctx.setLineDash([4 / c.zoom, 4 / c.zoom]);
        if (connFrom.tool === TOOLS.PEN && connFrom.points?.length) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          connFrom.points.forEach(([px, py]) => {
            minX = Math.min(minX, px); minY = Math.min(minY, py);
            maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
          });
          ctx.strokeRect(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8);
        } else {
          ctx.strokeRect((connFrom.x || 0) - 4, (connFrom.y || 0) - 4, (connFrom.w || 200) + 8, (connFrom.h || 30) + 8);
        }
        ctx.restore();
      }
    }

    // Remote cursors (in world space)
    const cursors = remoteCursorsRef.current;
    if (cursors) {
      Object.entries(cursors).forEach(([uid, cur]) => {
        if (!cur) return;
        const col = cur.color || userColor(uid);
        ctx.save();
        ctx.fillStyle = col;
        // Arrow pointer shape
        ctx.beginPath();
        ctx.moveTo(cur.x, cur.y);
        ctx.lineTo(cur.x + 0, cur.y + 18 / c.zoom);
        ctx.lineTo(cur.x + 5 / c.zoom, cur.y + 13 / c.zoom);
        ctx.lineTo(cur.x + 9 / c.zoom, cur.y + 20 / c.zoom);
        ctx.lineTo(cur.x + 11 / c.zoom, cur.y + 19 / c.zoom);
        ctx.lineTo(cur.x + 7 / c.zoom, cur.y + 12 / c.zoom);
        ctx.lineTo(cur.x + 12 / c.zoom, cur.y + 12 / c.zoom);
        ctx.closePath();
        ctx.fill();
        // Name label
        const fontSize = 11 / c.zoom;
        ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
        const name = cur.name || "?";
        const labelW = ctx.measureText(name).width + 8 / c.zoom;
        const labelH = 16 / c.zoom;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.roundRect(cur.x + 13 / c.zoom, cur.y + 10 / c.zoom, labelW, labelH, 3 / c.zoom);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(name, cur.x + 17 / c.zoom, cur.y + 10 / c.zoom + fontSize);
        ctx.restore();
      });
    }

    ctx.restore();
  }, [canvasState]);

  // Request animation frame render loop
  const scheduleRender = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      render();
      rafRef.current = null;
    });
  }, [render]);

  // Resize
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      scheduleRender();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [scheduleRender]);

  // Re-render on data changes
  useEffect(() => { scheduleRender(); }, [elements, remoteCursors, selectedId, connectorFromId, scheduleRender]);

  // ─── Push undo snapshot ─────────────────────────────────────
  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-50), JSON.parse(JSON.stringify(elementsRef.current))]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const newStack = [...prev];
      const snapshot = newStack.pop();
      setRedoStack((r) => [...r, JSON.parse(JSON.stringify(elementsRef.current))]);
      onElementsChange(snapshot);
      return newStack;
    });
  }, [onElementsChange]);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const newStack = [...prev];
      const snapshot = newStack.pop();
      setUndoStack((u) => [...u, JSON.parse(JSON.stringify(elementsRef.current))]);
      onElementsChange(snapshot);
      return newStack;
    });
  }, [onElementsChange]);

  // ─── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (textInput) return;
      if (e.code === "Space") { spaceDown.current = true; updateCursor(toolRef.current, false); e.preventDefault(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); handleRedo(); }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIdRef.current && !textInput) {
        e.preventDefault();
        pushUndo();
        onElementsChange(elementsRef.current.filter((el) => el.id !== selectedIdRef.current));
        setSelectedId(null);
      }
      if (e.key === "v" || e.key === "1") setTool(TOOLS.SELECT);
      if (e.key === "h" || e.key === "2") setTool(TOOLS.HAND);
      if (e.key === "p" || e.key === "3") setTool(TOOLS.PEN);
      if (e.key === "l" || e.key === "4") setTool(TOOLS.LINE);
      if (e.key === "a" || e.key === "5") setTool(TOOLS.ARROW);
      if (e.key === "c" || e.key === "0") setTool(TOOLS.CONNECTOR);
      if (e.key === "r" || e.key === "6") setTool(TOOLS.RECT);
      if (e.key === "o" || e.key === "7") setTool(TOOLS.ELLIPSE);
      if (e.key === "t" || e.key === "8") setTool(TOOLS.TEXT);
      if (e.key === "e" || e.key === "9") setTool(TOOLS.ERASER);
    };
    const handleKeyUp = (e) => {
      if (e.code === "Space") { spaceDown.current = false; updateCursor(toolRef.current, isPanning.current); }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); };
  }, [handleUndo, handleRedo, textInput, pushUndo, onElementsChange, updateCursor]);

  // ─── Mouse helpers ─────────────────────────────────────────
  const getMousePos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }, []);

  // ─── Mouse down ────────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    const [sx, sy] = getMousePos(e);
    const [wx, wy] = screenToWorld(sx, sy);
    const activeTool = toolRef.current;

    // Pan: middle-mouse, space+left, or HAND tool
    if (e.button === 1 || (e.button === 0 && (spaceDown.current || activeTool === TOOLS.HAND))) {
      isPanning.current = true;
      panStart.current = { x: sx - cameraRef.current.x, y: sy - cameraRef.current.y };
      updateCursor(activeTool, true);
      e.preventDefault();
      return;
    }

    if (e.button !== 0) return;

    // CONNECTOR: first click selects source, second click on target creates connector
    if (activeTool === TOOLS.CONNECTOR) {
      const els = elementsRef.current;
      let found = null;
      for (let i = els.length - 1; i >= 0; i--) {
        const e = els[i];
        if (e.tool === TOOLS.CONNECTOR) continue; // don't select connectors as endpoints
        if (hitTest(wx, wy, e, els)) { found = e; break; }
      }
      if (connectorFromIdRef.current) {
        if (found && found.id !== connectorFromIdRef.current) {
          pushUndo();
          const newConnector = {
            id: genId(),
            tool: TOOLS.CONNECTOR,
            fromId: connectorFromIdRef.current,
            toId: found.id,
            color,
            strokeWidth,
            opacity: 1,
          };
          onElementsChange([...els, newConnector]);
          setConnectorFromId(null);
        } else {
          setConnectorFromId(null);
        }
      } else if (found) {
        setConnectorFromId(found.id);
      }
      return;
    }

    if (activeTool === TOOLS.SELECT) {
      const els = elementsRef.current;
      let found = null;
      for (let i = els.length - 1; i >= 0; i--) {
        if (hitTest(wx, wy, els[i], els)) { found = els[i]; break; }
      }
      if (found) {
        setSelectedId(found.id);
        dragOffset.current = { x: wx - (found.x || found.points?.[0]?.[0] || 0), y: wy - (found.y || found.points?.[0]?.[1] || 0) };
        isDrawing.current = true;
      } else {
        setSelectedId(null);
      }
      return;
    }

    if (activeTool === TOOLS.TEXT) {
      setTextInput({ x: wx, y: wy });
      return;
    }

    if (activeTool === TOOLS.ERASER) {
      const els = elementsRef.current;
      for (let i = els.length - 1; i >= 0; i--) {
        if (hitTest(wx, wy, els[i], els)) {
          pushUndo();
          onElementsChange(els.filter((_, idx) => idx !== i));
          return;
        }
      }
      return;
    }

    pushUndo();
    isDrawing.current = true;

    if (activeTool === TOOLS.PEN) {
      currentElement.current = { id: genId(), tool: TOOLS.PEN, points: [[wx, wy]], color, strokeWidth, opacity: 1 };
    } else if (activeTool === TOOLS.LINE) {
      currentElement.current = { id: genId(), tool: TOOLS.LINE, x: wx, y: wy, w: 0, h: 0, color, strokeWidth, opacity: 1 };
    } else if (activeTool === TOOLS.ARROW) {
      currentElement.current = { id: genId(), tool: TOOLS.ARROW, x: wx, y: wy, w: 0, h: 0, color, strokeWidth, opacity: 1 };
    } else if (activeTool === TOOLS.RECT) {
      currentElement.current = { id: genId(), tool: TOOLS.RECT, x: wx, y: wy, w: 0, h: 0, color, strokeWidth, opacity: 1 };
    } else if (activeTool === TOOLS.ELLIPSE) {
      currentElement.current = { id: genId(), tool: TOOLS.ELLIPSE, x: wx, y: wy, w: 0, h: 0, color, strokeWidth, opacity: 1 };
    }
  }, [color, strokeWidth, screenToWorld, getMousePos, pushUndo, onElementsChange, updateCursor]);

  // ─── Mouse move ────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    const [sx, sy] = getMousePos(e);
    const [wx, wy] = screenToWorld(sx, sy);
    const activeTool = toolRef.current;

    if (onCursorMove) onCursorMove(wx, wy);

    // Panning — update cameraRef directly, no setState → scheduleRender
    if (isPanning.current) {
      cameraRef.current = {
        ...cameraRef.current,
        x: sx - panStart.current.x,
        y: sy - panStart.current.y,
      };
      scheduleRender();
      return;
    }

    if (!isDrawing.current) return;

    // Dragging a selected element (connectors are anchored, skip drag)
    if (activeTool === TOOLS.SELECT && selectedIdRef.current) {
      const sel = elementsRef.current.find((e) => e.id === selectedIdRef.current);
      if (sel?.tool === TOOLS.CONNECTOR) return; // connectors don't move
      const newX = wx - dragOffset.current.x;
      const newY = wy - dragOffset.current.y;
      const updated = elementsRef.current.map((el) => {
        if (el.id !== selectedIdRef.current) return el;
        if (el.tool === TOOLS.PEN) {
          const dx = newX - (el.points[0]?.[0] || 0);
          const dy = newY - (el.points[0]?.[1] || 0);
          return { ...el, points: el.points.map(([px, py]) => [px + dx, py + dy]) };
        }
        return { ...el, x: newX, y: newY };
      });
      onElementsChange(updated);
      return;
    }

    const cur = currentElement.current;
    if (!cur) return;

    if (cur.tool === TOOLS.PEN) {
      cur.points.push([wx, wy]);
    } else {
      cur.w = wx - cur.x;
      cur.h = wy - cur.y;
    }
    scheduleRender();
  }, [screenToWorld, getMousePos, scheduleRender, onElementsChange, onCursorMove]);

  // ─── Double-click: create or edit text ─────────────────────
  const handleDoubleClick = useCallback((e) => {
    const [sx, sy] = getMousePos(e);
    const [wx, wy] = screenToWorld(sx, sy);
    const activeTool = toolRef.current;
    const els = elementsRef.current;

    // Double-click on existing TEXT element → edit it
    if (activeTool === TOOLS.SELECT || activeTool === TOOLS.TEXT) {
      let found = null;
      for (let i = els.length - 1; i >= 0; i--) {
        if (els[i].tool === TOOLS.TEXT && hitTest(wx, wy, els[i], els)) {
          found = els[i];
          break;
        }
      }
      if (found) {
        setTextInput({
          x: found.x,
          y: found.y,
          id: found.id,
          initialText: found.text || "",
        });
        e.preventDefault();
        return;
      }
    }

    // Double-click on empty space with SELECT or TEXT → create new text
    if (activeTool === TOOLS.SELECT || activeTool === TOOLS.TEXT) {
      setTextInput({ x: wx, y: wy });
      e.preventDefault();
    }
  }, [screenToWorld, getMousePos]);

  // ─── Mouse up ──────────────────────────────────────────────
  const handleMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      updateCursor(toolRef.current, false);
      return;
    }

    if (toolRef.current === TOOLS.SELECT && isDrawing.current && selectedIdRef.current) {
      isDrawing.current = false;
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (currentElement.current) {
      const newEl = { ...currentElement.current };
      currentElement.current = null;
      if (newEl.tool === TOOLS.PEN && newEl.points.length < 2) return;
      if ((newEl.tool === TOOLS.LINE || newEl.tool === TOOLS.ARROW || newEl.tool === TOOLS.RECT || newEl.tool === TOOLS.ELLIPSE) && Math.abs(newEl.w || 0) < 2 && Math.abs(newEl.h || 0) < 2) return;
      onElementsChange([...elementsRef.current, newEl]);
    }
  }, [onElementsChange, updateCursor]);

  // ─── Wheel zoom — must be non-passive ─────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e) => {
      e.preventDefault(); // Requires non-passive listener

      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const c = cameraRef.current;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(8, Math.max(0.05, c.zoom * factor));

      // Zoom towards the cursor position
      const wx = (sx - c.x) / c.zoom;
      const wy = (sy - c.y) / c.zoom;

      cameraRef.current = {
        zoom: newZoom,
        x: sx - wx * newZoom,
        y: sy - wy * newZoom,
      };

      setZoomDisplay(Math.round(newZoom * 100));
      scheduleRender();
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [scheduleRender]);

  // ─── Commit text ──────────────────────────────────────────
  const commitText = useCallback((text) => {
    const els = elementsRef.current;
    if (textInput?.id) {
      // Edit mode: update existing text element
      pushUndo();
      const updated = els.map((el) =>
        el.id === textInput.id
          ? { ...el, text: text?.trim() || "", w: Math.max(100, (text?.length || 0) * 10), h: 24 }
          : el
      );
      onElementsChange(updated);
    } else if (text && text.trim()) {
      // New text
      pushUndo();
      const newEl = {
        id: genId(),
        tool: TOOLS.TEXT,
        x: textInput.x,
        y: textInput.y,
        w: Math.max(100, text.length * 10),
        h: 24,
        text: text.trim(),
        color,
        fontSize: 16,
        opacity: 1,
      };
      onElementsChange([...els, newEl]);
    }
    setTextInput(null);
  }, [textInput, color, pushUndo, onElementsChange]);

  useEffect(() => {
    if (textInput && textInputRef.current) textInputRef.current.focus();
  }, [textInput]);

  // ─── Export PNG ───────────────────────────────────────────
  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "whiteboard.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  // ─── Zoom controls ───────────────────────────────────────
  const zoomBy = useCallback((factor) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = cameraRef.current;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const newZoom = Math.min(8, Math.max(0.05, c.zoom * factor));
    const wx = (cx - c.x) / c.zoom;
    const wy = (cy - c.y) / c.zoom;
    cameraRef.current = { zoom: newZoom, x: cx - wx * newZoom, y: cy - wy * newZoom };
    setZoomDisplay(Math.round(newZoom * 100));
    scheduleRender();
  }, [scheduleRender]);

  const resetZoom = useCallback(() => {
    cameraRef.current = { x: 0, y: 0, zoom: 1 };
    setZoomDisplay(100);
    scheduleRender();
  }, [scheduleRender]);

  const toolButtons = [
    { id: TOOLS.SELECT, icon: MousePointer2, label: "Select (V)" },
    { id: TOOLS.HAND, icon: Hand, label: "Pan (H)" },
    { id: TOOLS.PEN, icon: Pen, label: "Pen (P)" },
    { id: TOOLS.LINE, icon: Minus, label: "Line (L)" },
    { id: TOOLS.ARROW, icon: MoveRight, label: "Arrow (A)" },
    { id: TOOLS.CONNECTOR, icon: Link2, label: "Connector (C)" },
    { id: TOOLS.RECT, icon: Square, label: "Rectangle (R)" },
    { id: TOOLS.ELLIPSE, icon: Circle, label: "Ellipse (O)" },
    { id: TOOLS.TEXT, icon: Type, label: "Text (T)" },
    { id: TOOLS.ERASER, icon: Eraser, label: "Eraser (E)" },
  ];

  return (
    <div ref={containerRef} className="relative flex-1 min-h-0 bg-[#121218] overflow-hidden select-none">

      {/* ── Online Users Panel ────────────────────────────── */}
      <OnlineUsersPanel liveCollaborators={liveCollaborators} currentUser={currentUser} />

      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-zinc-900/95 backdrop-blur border border-zinc-700/60 rounded-xl px-2 py-1.5 shadow-2xl">
        {toolButtons.map((tb) => (
          <button
            key={tb.id}
            onClick={() => { setTool(tb.id); setSelectedId(null); setConnectorFromId(null); }}
            title={tb.label}
            className={cn(
              "p-2 rounded-lg transition-all",
              tool === tb.id
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            )}
          >
            <tb.icon className="h-4 w-4" />
          </button>
        ))}

        <div className="w-px h-6 bg-zinc-700 mx-1" />

        {/* Color picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
            title="Color"
          >
            <div className="h-4 w-4 rounded-full border-2 border-zinc-500" style={{ backgroundColor: color }} />
          </button>
          {showColorPicker && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-2xl z-30 min-w-[180px]">
              <div className="grid grid-cols-6 gap-1.5">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setColor(c); setShowColorPicker(false); }}
                    className={cn(
                      "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                      color === c ? "border-indigo-400 scale-110" : "border-zinc-600"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-7 w-7 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="text-[10px] text-zinc-500 font-mono">{color}</span>
              </div>
            </div>
          )}
        </div>

        {/* Stroke width */}
        <div className="flex items-center gap-1 px-2">
          <input
            type="range"
            min={1}
            max={20}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-16 h-1 accent-indigo-500"
            title={`Stroke: ${strokeWidth}px`}
          />
          <span className="text-[10px] text-zinc-500 w-4 text-right">{strokeWidth}</span>
        </div>

        <div className="w-px h-6 bg-zinc-700 mx-1" />

        {/* Undo / Redo */}
        <button onClick={handleUndo} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)" className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-30">
          <Undo2 className="h-4 w-4" />
        </button>
        <button onClick={handleRedo} disabled={redoStack.length === 0} title="Redo (Ctrl+Y)" className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-30">
          <Redo2 className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-zinc-700 mx-1" />

        {/* Zoom */}
        <button onClick={() => zoomBy(1.25)} title="Zoom In (+)" className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={resetZoom}
          title="Reset Zoom (100%)"
          className="text-[10px] text-zinc-400 hover:text-white w-10 text-center hover:bg-zinc-800 rounded-lg py-1 transition-colors"
        >
          {zoomDisplay}%
        </button>
        <button onClick={() => zoomBy(0.8)} title="Zoom Out (-)" className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white">
          <ZoomOut className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-zinc-700 mx-1" />
        <button onClick={handleExport} title="Export PNG" className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white">
          <Download className="h-4 w-4" />
        </button>
      </div>

      {/* ── Tool hints ───────────────────────────────── */}
      {tool === TOOLS.HAND && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-zinc-900/90 border border-zinc-700 rounded-full px-3 py-1.5 text-xs text-zinc-400 pointer-events-none flex items-center gap-2">
          <Hand className="h-3.5 w-3.5 text-indigo-400" />
          Click and drag to pan · Scroll to zoom · Space+drag also works
        </div>
      )}
      {tool === TOOLS.CONNECTOR && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-zinc-900/90 border border-zinc-700 rounded-full px-3 py-1.5 text-xs text-zinc-400 pointer-events-none flex items-center gap-2">
          <Link2 className="h-3.5 w-3.5 text-emerald-400" />
          {connectorFromId ? "Click another shape to connect" : "Click a shape to start connecting"}
        </div>
      )}

      {/* ── Text input overlay ───────────────────────────── */}
      {textInput && (
        <input
          ref={textInputRef}
          type="text"
          defaultValue={textInput.initialText ?? ""}
          className="absolute z-30 bg-zinc-900/95 border border-indigo-500 text-white outline-none px-2 py-1 text-sm rounded min-w-[120px]"
          style={{
            left: textInput.x * cameraRef.current.zoom + cameraRef.current.x,
            top: textInput.y * cameraRef.current.zoom + cameraRef.current.y,
            fontSize: 16 * cameraRef.current.zoom,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              textCancelledRef.current = false;
              commitText(e.target.value);
            }
            if (e.key === "Escape") {
              textCancelledRef.current = true;
              setTextInput(null);
            }
          }}
          onBlur={(e) => {
            if (!textCancelledRef.current) commitText(e.target.value);
            textCancelledRef.current = false;
          }}
          placeholder="Type here…"
        />
      )}

      {/* ── Canvas ───────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: cursorStyle }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WHITEBOARD MODULE (LIST + EDITOR + SOCKET)
   ═══════════════════════════════════════════════════════════════ */

export default function WhiteboardModule({ isVisible = true }) {
  const { user, socket } = useAuthContext();
  const token = localStorage.getItem("token");

  // Resolve a display name from the user object regardless of user type
  // (admin uses .name/.username, employee uses .name, customer uses .name)
  const getDisplayName = useCallback((u) => {
    if (!u) return "User";
    return (
      u.name ||
      u.username ||
      u.fullName ||
      u.firstName ||
      (u.email ? u.email.split("@")[0] : null) ||
      "User"
    );
  }, []);

  const [view, setView] = useState("list");
  const [whiteboards, setWhiteboards] = useState([]);
  const [activeWhiteboard, setActiveWhiteboard] = useState(null);
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [liveCollaborators, setLiveCollaborators] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(true);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [versions, setVersions] = useState([]);
  const [versionsPage, setVersionsPage] = useState(1);
  const [versionsTotalPages, setVersionsTotalPages] = useState(1);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedVersionNumber, setSelectedVersionNumber] = useState(null);
  const [displayCanvasState, setDisplayCanvasState] = useState({});
  const [editingVersionNumber, setEditingVersionNumber] = useState(null);
  const [editingVersionLabel, setEditingVersionLabel] = useState("");
  const [showVersionsSidebar, setShowVersionsSidebar] = useState(false);
  const [showNewVersionDialog, setShowNewVersionDialog] = useState(false);
  const [newVersionMessage, setNewVersionMessage] = useState("");
  const [creatingVersion, setCreatingVersion] = useState(false);

  const saveTimerRef = useRef(null);
  const isRemoteRef = useRef(false);
  const VERSIONS_LIMIT = 10;
  const currentUserId = String(user?.id || user?._id || "");

  const api = useMemo(
    () =>
      axios.create({
        baseURL: `${BACKEND_URL}/whiteboards`,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
    [token]
  );

  // ─── Fetch list ──────────────────────────────────────────
  const fetchWhiteboards = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await api.get("/");
      setWhiteboards(data);
    } catch (err) {
      console.error("Failed to load whiteboards:", err);
    } finally {
      setLoading(false);
    }
  }, [api, token]);

  useEffect(() => {
    if (isVisible && view === "list") fetchWhiteboards();
  }, [isVisible, view, fetchWhiteboards]);

  // ─── Create ─────────────────────────────────────────────
  const handleCreate = async () => {
    try {
      const { data } = await api.post("/", { title: newTitle || "Untitled Whiteboard", is_public: newIsPublic });
      setShowCreateModal(false);
      setNewTitle("");
      setNewIsPublic(true);
      toast.success("Whiteboard created!");
      openWhiteboard(data);
    } catch (err) {
      toast.error("Failed to create whiteboard");
    }
  };

  // ─── Join by code ──────────────────────────────────────
  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    try {
      const { data } = await api.get(`/join/${joinCode.trim()}`);
      setShowJoinInput(false);
      setJoinCode("");
      toast.success(`Joined: ${data.title}`);
      openWhiteboard(data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to join");
    }
  };

  // ─── Open whiteboard ──────────────────────────────────
  const openWhiteboard = useCallback(async (wb) => {
    try {
      if (!token) {
        toast.error("Please log in again (missing token).");
        return;
      }
      const { data } = await api.get(`/${wb._id}`);
      setActiveWhiteboard(data);
      // Default editing is always v1 unless user explicitly switches.
      setSelectedVersionNumber(1);
      // Load v1 snapshot (backend guarantees v1 exists). If it fails, fall back
      // to top-level board state so the editor still opens.
      try {
        const v1 = await api.get(`/${wb._id}/versions/1`);
        setElements(Array.isArray(v1.data?.elements) ? v1.data.elements : []);
        setDisplayCanvasState(v1.data?.canvas_state || {});
      } catch (e) {
        console.error("Failed to load v1 snapshot, falling back:", e);
        setElements(Array.isArray(data.elements) ? data.elements : []);
        setDisplayCanvasState(data.canvas_state || {});
      }
      setVersionsPage(1);
      setView("editor");
      // NOTE: whiteboard-join is emitted in the socket listeners useEffect
      // (after listeners are registered) to avoid the race condition where
      // the backend broadcasts collaborators before we are listening.
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to open whiteboard";
      toast.error(msg);
    }
  }, [api, token]);

  const fetchVersions = useCallback(
    async (whiteboardId, page = 1) => {
      if (!whiteboardId) return;
      setVersionsLoading(true);
      try {
        const { data } = await api.get(`/${whiteboardId}/versions`, {
          params: { page, limit: VERSIONS_LIMIT },
        });
        setVersions(data.versions || []);
        setVersionsPage(data.pagination?.page || page);
        setVersionsTotalPages(data.pagination?.totalPages || 1);
      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to load versions");
      } finally {
        setVersionsLoading(false);
      }
    },
    [api]
  );

  // ─── Leave editor ─────────────────────────────────────
  const leaveEditor = useCallback(() => {
    if (activeWhiteboard && socket) {
      socket.emit("whiteboard-leave", { whiteboardId: activeWhiteboard._id });
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setActiveWhiteboard(null);
    setElements([]);
    setDisplayCanvasState({});
    setLiveCollaborators([]);
    setRemoteCursors({});
    setVersions([]);
    setVersionsPage(1);
    setVersionsTotalPages(1);
    setSelectedVersionNumber(null);
    setView("list");
  }, [activeWhiteboard, socket]);

  // ─── Save to DB (debounced) into active version ───────
  const saveContent = useCallback(async (els) => {
    if (!activeWhiteboard) return;
    const v = Number(selectedVersionNumber || 1);
    try {
      await api.put(`/${activeWhiteboard._id}/versions/${v}/content`, {
        elements: els,
        canvas_state: displayCanvasState,
      });
    } catch (err) {
      console.error("Auto-save failed:", err);
    }
  }, [activeWhiteboard, api, selectedVersionNumber, displayCanvasState]);

  useEffect(() => {
    if (view === "editor" && activeWhiteboard?._id) {
      fetchVersions(activeWhiteboard._id, versionsPage);
    }
  }, [view, activeWhiteboard, versionsPage, fetchVersions]);

  const handleLoadVersion = useCallback(
    async (versionNumber) => {
      if (!activeWhiteboard) return;
      try {
        const { data } = await api.get(
          `/${activeWhiteboard._id}/versions/${versionNumber}`
        );
        setElements(Array.isArray(data.elements) ? data.elements : []);
        setDisplayCanvasState(data.canvas_state || {});
        setSelectedVersionNumber(data.version_number);
      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to load version");
      }
    },
    [activeWhiteboard, api]
  );

  const handleBackToLatest = useCallback(async () => {
    if (!activeWhiteboard) return;
    try {
      // Load the highest version number currently in the list; fallback to v1.
      const maxV =
        versions.reduce((m, v) => Math.max(m, Number(v.version_number || 0)), 0) || 1;
      await handleLoadVersion(maxV);
    } catch (err) {
      toast.error("Failed to load latest version");
    }
  }, [activeWhiteboard, versions, handleLoadVersion]);

  const handleCreateNewVersion = useCallback(async () => {
    if (!activeWhiteboard) return;
    const msg = newVersionMessage.trim();
    if (!msg) return toast.error("Commit message is required");
    setCreatingVersion(true);
    try {
      const base = Number(selectedVersionNumber || 1);
      const { data } = await api.post(`/${activeWhiteboard._id}/versions`, {
        base_version_number: base,
        commit_message: msg,
      });
      toast.success(`Created v${data.version_number}`);
      setShowNewVersionDialog(false);
      setNewVersionMessage("");
      await fetchVersions(activeWhiteboard._id, 1);
      await handleLoadVersion(data.version_number);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create version");
    } finally {
      setCreatingVersion(false);
    }
  }, [
    activeWhiteboard,
    api,
    newVersionMessage,
    selectedVersionNumber,
    fetchVersions,
    handleLoadVersion,
  ]);

  const handleRenameVersion = useCallback(
    async (versionNumber) => {
      if (!activeWhiteboard) return;
      const nextLabel = editingVersionLabel.trim();
      if (!nextLabel) return toast.error("Version label is required");
      try {
        await api.patch(`/${activeWhiteboard._id}/versions/${versionNumber}`, {
          version_label: nextLabel,
        });
        setEditingVersionNumber(null);
        setEditingVersionLabel("");
        fetchVersions(activeWhiteboard._id, versionsPage);
        toast.success("Version label updated");
      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to rename version");
      }
    },
    [activeWhiteboard, api, editingVersionLabel, fetchVersions, versionsPage]
  );

  // ─── Handle element changes ───────────────────────────
  const handleElementsChange = useCallback((newElements) => {
    setElements(newElements);

    if (isRemoteRef.current) {
      isRemoteRef.current = false;
      return;
    }

    if (socket && activeWhiteboard) {
      socket.emit("whiteboard-update", {
        whiteboardId: activeWhiteboard._id,
        elements: newElements,
        versionNumber: selectedVersionNumber || 1,
      });
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveContent(newElements), 2000);
  }, [socket, activeWhiteboard, selectedVersionNumber, saveContent]);

  // ─── Socket listeners ─────────────────────────────────
  useEffect(() => {
    if (!socket || !activeWhiteboard) return;

    // Derive myId the same way the socket handshake sends it, so the filter
    // correctly excludes ourselves from the collaborators list.
    const myId = String(user?.id || user?._id || "");

    const handleRemoteUpdate = ({
      whiteboardId,
      elements: remoteEls,
      senderId,
      versionNumber,
    }) => {
      if (whiteboardId !== activeWhiteboard._id) return;
      if (String(senderId) === myId) return;
      const activeV = Number(selectedVersionNumber || 1);
      const incomingV = Number(versionNumber || 1);
      if (incomingV !== activeV) return;
      isRemoteRef.current = true;
      setElements(remoteEls);
    };

    const handleCollaborators = ({ whiteboardId, collaborators }) => {
      if (whiteboardId !== activeWhiteboard._id) return;
      // Filter out self using string comparison (MongoDB ObjectId safe)
      setLiveCollaborators(
        collaborators.filter((c) => String(c.userId) !== myId)
      );
    };

    const handleCursor = ({ whiteboardId, userId, userName, cursor }) => {
      if (whiteboardId !== activeWhiteboard._id) return;
      if (String(userId) === myId) return;
      setRemoteCursors((prev) => ({
        ...prev,
        [userId]: { ...cursor, name: userName, color: userColor(userId) },
      }));
    };

    socket.on("whiteboard-update", handleRemoteUpdate);
    socket.on("whiteboard-collaborators", handleCollaborators);
    socket.on("whiteboard-cursor", handleCursor);

    // Emit join AFTER listeners are registered so we don't miss the
    // initial collaborators broadcast the backend sends on join.
    socket.emit("whiteboard-join", {
      whiteboardId: activeWhiteboard._id,
      userName: getDisplayName(user),
    });

    return () => {
      socket.off("whiteboard-update", handleRemoteUpdate);
      socket.off("whiteboard-collaborators", handleCollaborators);
      socket.off("whiteboard-cursor", handleCursor);
    };
  }, [socket, activeWhiteboard, user, getDisplayName, selectedVersionNumber]);

  // ─── Send cursor position ─────────────────────────────
  const handleCursorMove = useCallback((wx, wy) => {
    if (!socket || !activeWhiteboard) return;
    socket.emit("whiteboard-cursor", {
      whiteboardId: activeWhiteboard._id,
      cursor: { x: wx, y: wy },
      userName: getDisplayName(user),
    });
  }, [socket, activeWhiteboard, user, getDisplayName]);

  // ─── Helpers ──────────────────────────────────────────
  const handleArchive = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.patch(`/${id}/archive`);
      toast.success("Whiteboard archived");
      fetchWhiteboards();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to archive");
    }
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!confirm("Delete this whiteboard permanently?")) return;
    try {
      await api.delete(`/${id}`);
      toast.success("Whiteboard deleted");
      fetchWhiteboards();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete");
    }
  };

  const copyCode = (code, e) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(code);
    toast.success("Session code copied!");
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return whiteboards;
    const q = searchQuery.toLowerCase();
    return whiteboards.filter(
      (wb) => wb.title.toLowerCase().includes(q) || wb.session_code.toLowerCase().includes(q)
    );
  }, [whiteboards, searchQuery]);

  const timeAgo = (date) => {
    if (!date) return "";
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // ════════════════════════════════════════════════════════
  // ─── RENDER ─────────────────────────────────────────────
  // ════════════════════════════════════════════════════════

  return (
    <div className={cn("flex-1 flex flex-col min-h-0", !isVisible && "hidden")}>
      {view === "list" ? (
        /* ─── LIST VIEW ─────────────────────────────────── */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Header */}
        <div className="shrink-0 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <PenLine className="h-5 w-5 text-indigo-400" />
                  Whiteboards
                </h1>
                <p className="text-sm text-zinc-400 mt-0.5">
                  Create & collaborate on drawings in real-time
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={() => setShowJoinInput(!showJoinInput)}
                >
                  <LogIn className="h-4 w-4 mr-1" />
                  Join
                </Button>
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Board
                </Button>
              </div>
            </div>

            {showJoinInput && (
              <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-zinc-900 border border-zinc-700">
                <input
                  type="text"
                  placeholder="Enter session code (e.g. WB-A1B2C3D4)"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
                />
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleJoinByCode}>
                  Join
                </Button>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search whiteboards..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Create Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <h2 className="text-lg font-semibold text-white mb-4">Create New Whiteboard</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-zinc-400 block mb-1">Title</label>
                    <input
                      type="text"
                      placeholder="My Whiteboard"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 block mb-1">Visibility</label>
                    <div className="flex gap-2">
                      <button
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
                          newIsPublic ? "bg-indigo-600/20 border-indigo-500 text-indigo-300" : "bg-zinc-800 border-zinc-600 text-zinc-400 hover:bg-zinc-700"
                        )}
                        onClick={() => setNewIsPublic(true)}
                      >
                        <Globe className="h-4 w-4" /> Public
                      </button>
                      <button
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
                          !newIsPublic ? "bg-indigo-600/20 border-indigo-500 text-indigo-300" : "bg-zinc-800 border-zinc-600 text-zinc-400 hover:bg-zinc-700"
                        )}
                        onClick={() => setNewIsPublic(false)}
                      >
                        <Lock className="h-4 w-4" /> Private
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      {newIsPublic ? "Anyone with the session code can join" : "Only invited collaborators can access"}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="ghost" size="sm" onClick={() => { setShowCreateModal(false); setNewTitle(""); }} className="text-zinc-400">Cancel</Button>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleCreate}>Create</Button>
                </div>
              </div>
            </div>
          )}

          {/* Board List */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-zinc-500">
                <PenLine className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">{searchQuery ? "No whiteboards match your search" : "No whiteboards yet — create one to get started!"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((wb) => (
                  <div
                    key={wb._id}
                    onClick={() => openWhiteboard(wb)}
                    className="group relative bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-indigo-500/50 hover:bg-zinc-900 transition-all duration-200"
                  >
                    <div className="aspect-video rounded-lg bg-zinc-800 mb-3 flex items-center justify-center overflow-hidden">
                      <PenLine className="h-8 w-8 text-zinc-600" />
                    </div>
                    <h3 className="text-sm font-medium text-white truncate">{wb.title}</h3>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" />
                      <span>{timeAgo(wb.updatedAt)}</span>
                      <span className="text-zinc-700">·</span>
                      {wb.is_public ? <Globe className="h-3 w-3 text-emerald-500" /> : <Lock className="h-3 w-3 text-amber-500" />}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500">
                      <User className="h-3 w-3" />
                      <span className="truncate">{wb.owner_id?._id === user?._id ? "You" : wb.owner_id?.name || "Unknown"}</span>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => copyCode(wb.session_code, e)} className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" title="Copy session code">
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                      {wb.owner_id?._id === user?._id && (
                        <>
                          <button onClick={(e) => handleArchive(wb._id, e)} className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 transition-colors" title="Archive">
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={(e) => handleDelete(wb._id, e)} className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400 tracking-wide">{wb.session_code}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─── EDITOR VIEW ───────────────────────────────── */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Editor Header */}
          <div className="shrink-0 h-12 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur flex items-center justify-between px-4 z-10">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={leaveEditor} className="text-zinc-400 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="h-5 w-px bg-zinc-700" />
              <h2 className="text-sm font-medium text-white truncate max-w-[200px]">{activeWhiteboard?.title}</h2>
              <button
                onClick={(e) => copyCode(activeWhiteboard?.session_code, e)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-400 hover:text-white transition-colors"
                title="Copy session code to share"
              >
                <Copy className="h-3 w-3" />
                <span className="font-mono">{activeWhiteboard?.session_code}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowVersionsSidebar((s) => !s)}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 hover:text-white transition-colors"
                title={showVersionsSidebar ? "Hide versions" : "Show versions"}
              >
                {showVersionsSidebar ? (
                  <PanelLeftClose className="h-3.5 w-3.5" />
                ) : (
                  <PanelLeftOpen className="h-3.5 w-3.5" />
                )}
                Versions
              </button>
            </div>

            {/* Live indicator in header */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                {liveCollaborators.length > 0 ? (
                  <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-zinc-600" />
                )}
                <span className="text-xs text-zinc-400">
                  {liveCollaborators.length > 0
                    ? `${liveCollaborators.length + 1} collaborating`
                    : "Only you"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex overflow-hidden">
            {/* Versions sidebar */}
            <div
              className={cn(
                "border-r border-zinc-800 bg-zinc-950/90 flex flex-col transition-all duration-300 ease-out",
                showVersionsSidebar ? "w-72 opacity-100" : "w-0 opacity-0 pointer-events-none"
              )}
            >
              <div className="px-3 py-3 border-b border-zinc-800 bg-zinc-900/60">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white inline-flex items-center gap-1.5">
                      <History className="h-4 w-4 text-indigo-400" />
                      Versions
                    </h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Editing {`v${selectedVersionNumber || 1}`} (manual versions)
                    </p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {versions.length}
                  </span>
                </div>
              </div>
              <div className="px-3 py-2 border-b border-zinc-800">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewVersionDialog(true)}
                    className="flex-1 rounded-lg bg-indigo-600 text-white text-xs py-1.5 hover:bg-indigo-500 transition-colors border border-indigo-500/30"
                    title="Create a new version from the currently loaded version"
                  >
                    New version
                  </button>
                  <button
                    type="button"
                    onClick={handleBackToLatest}
                    className="flex-1 rounded-lg bg-zinc-800 text-zinc-200 text-xs py-1.5 hover:bg-zinc-700 transition-colors border border-zinc-700/70"
                    title="Load the latest committed version"
                  >
                    Load latest
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
                {versionsLoading ? (
                  <p className="text-xs text-zinc-500">Loading versions...</p>
                ) : versions.length === 0 ? (
                  <p className="text-xs text-zinc-500">No versions yet.</p>
                ) : (
                  versions.map((v) => {
                    const canEdit =
                      String(v.created_by?._id || "") === currentUserId ||
                      String(activeWhiteboard?.owner_id?._id || activeWhiteboard?.owner_id || "") === currentUserId;
                    const isEditing = editingVersionNumber === v.version_number;
                    return (
                      <div
                        key={v._id}
                        className={cn(
                          "w-full rounded-xl border px-3 py-2.5 transition-colors shadow-sm",
                          selectedVersionNumber === v.version_number
                            ? "border-indigo-500 bg-indigo-500/15 shadow-indigo-500/10"
                            : "border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleLoadVersion(v.version_number)}
                          className="w-full text-left"
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingVersionLabel}
                              onChange={(e) => setEditingVersionLabel(e.target.value)}
                              className="w-full text-xs font-semibold text-white bg-zinc-800 border border-zinc-700 rounded px-2 py-1 outline-none focus:border-indigo-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <p className="text-xs font-semibold text-white truncate">
                              {`v${v.version_number}`} · {v.version_label}
                            </p>
                          )}
                          <p className="text-[11px] text-zinc-400 truncate mt-1">
                            {v.created_by?.name || "Unknown user"}
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1">
                            {new Date(v.createdAt).toLocaleString()}
                          </p>
                        </button>
                        {canEdit && (
                          <div className="mt-2 flex items-center gap-1.5">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleRenameVersion(v.version_number)}
                                  className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px]"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingVersionNumber(null);
                                    setEditingVersionLabel("");
                                  }}
                                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px]"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingVersionNumber(v.version_number);
                                  setEditingVersionLabel(v.version_label || "");
                                }}
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px]"
                              >
                                Edit label
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="px-3 py-2 border-t border-zinc-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setVersionsPage((p) => Math.max(1, p - 1))}
                  disabled={versionsPage <= 1 || versionsLoading}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs disabled:opacity-50"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Prev
                </button>
                <span className="text-[11px] text-zinc-400">
                  {versionsPage} / {versionsTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setVersionsPage((p) => Math.min(versionsTotalPages, p + 1))
                  }
                  disabled={versionsPage >= versionsTotalPages || versionsLoading}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {!showVersionsSidebar && (
              <button
                type="button"
                onClick={() => setShowVersionsSidebar(true)}
                className="absolute left-3 top-16 z-20 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/95 border border-zinc-700 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Show versions"
              >
                <PanelLeftOpen className="h-3.5 w-3.5" />
                Versions
              </button>
            )}

            {/* Drawing Canvas with built-in online panel */}
            <DrawingCanvas
              elements={elements}
              onElementsChange={handleElementsChange}
              remoteCursors={remoteCursors}
              canvasState={displayCanvasState}
              onCursorMove={handleCursorMove}
              liveCollaborators={liveCollaborators}
              currentUser={user}
            />

          </div>
        </div>
      )}

      <Dialog open={showNewVersionDialog} onOpenChange={setShowNewVersionDialog}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Create new version</DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will copy the current {`v${selectedVersionNumber || 1}`} into a new version. Edits after that will be saved into the new version only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300">Commit message</label>
            <Input
              value={newVersionMessage}
              onChange={(e) => setNewVersionMessage(e.target.value)}
              placeholder="e.g. Added onboarding flow diagram"
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowNewVersionDialog(false)}
              className="text-zinc-300"
              disabled={creatingVersion}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewVersion}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
              disabled={creatingVersion}
            >
              {creatingVersion ? "Creating..." : "Create version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}