import React, { useState, useEffect, useRef, useCallback, useReducer, useMemo, memo } from 'react';
import {
  Undo, Redo, Bold, Italic, Strikethrough, Baseline, AlignLeft, AlignCenter, AlignRight,
  Plus, Menu, Download, Search, Copy, Scissors, Clipboard, Trash2, X, PaintBucket, ZoomIn, ZoomOut
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const numRows = 50;
const numCols = 26;

const emptyRichCell = () => ({
  value: '', bold: false, italic: false, strike: false,
  align: 'left', color: null, bg: null, fontSize: 13,
});

const legacyToRich = (rawGrid) =>
  rawGrid.map(row => row.map(v =>
    typeof v === 'object' && v !== null ? v : { ...emptyRichCell(), value: v ?? '' }
  ));

const freshGrid = () =>
  Array.from({ length: numRows }, () => Array.from({ length: numCols }, emptyRichCell));

// ─────────────────────────────────────────────────────────────────────────────
// UNDO / REDO
// ─────────────────────────────────────────────────────────────────────────────
function historyReducer(state, action) {
  switch (action.type) {
    case 'PUSH':
      return { past: [...state.past.slice(-49), state.present], present: action.payload, future: [] };
    case 'UNDO':
      if (!state.past.length) return state;
      return { past: state.past.slice(0, -1), present: state.past[state.past.length - 1], future: [state.present, ...state.future] };
    case 'REDO':
      if (!state.future.length) return state;
      return { past: [...state.past, state.present], present: state.future[0], future: state.future.slice(1) };
    default: return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const colLetter = (i) => String.fromCharCode(65 + i);
const cellRef = (r, c) => `${colLetter(c)}${r + 1}`;

function parseCellRef(ref) {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  return { r: parseInt(m[2]) - 1, c: m[1].charCodeAt(0) - 65 };
}

function resolveToken(token, grid) {
  token = token.trim();
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'")))
    return token.slice(1, -1);
  if (!isNaN(token)) return parseFloat(token);
  const ref = parseCellRef(token.toUpperCase());
  if (ref) {
    const cell = grid[ref.r]?.[ref.c];
    const v = cell?.value ?? cell ?? '';
    return v;
  }
  return token;
}

const displayValue = (cellOrRaw, grid) => {
  const raw = (cellOrRaw && typeof cellOrRaw === 'object') ? cellOrRaw.value : cellOrRaw;
  return raw === '' || raw == null ? '' : String(raw);
};

function downloadCSV(grid, sheetName = 'spreadsheet') {
  let maxRow = 0, maxCol = 0;
  grid.forEach((row, ri) => row.forEach((cell, ci) => {
    if ((cell?.value ?? cell) !== '') { maxRow = Math.max(maxRow, ri); maxCol = Math.max(maxCol, ci); }
  }));
  const rows = grid.slice(0, maxRow + 1).map(row =>
    row.slice(0, maxCol + 1).map(cell => {
      const val = displayValue(cell, grid);
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${sheetName}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMOIZED CELL — prevents all 1300 cells re-rendering on every keystroke
// ─────────────────────────────────────────────────────────────────────────────
const GridCell = memo(function GridCell({
  r, c, cell, rendered, isSelected, isEditing, inRange, isCopied,
  editVal, width,
  onMouseDown, onMouseEnter, onClick, onDoubleClick, onContextMenu,
  onEditChange, onEditBlur, onEditKeyDown,
  formulaBarRef,
}) {
  return (
    <td
      className={`ss-cell${isSelected ? ' sel' : ''}${inRange ? ' rng' : ''}${isCopied ? ' cop' : ''}`}
      style={{
        width,
        background: cell.bg || undefined,
        textAlign: cell.align || 'left',
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {isEditing ? (
        <input
          autoFocus
          className="ss-inp"
          value={editVal}
          style={{ textAlign: cell.align || 'left' }}
          onChange={onEditChange}
          onBlur={onEditBlur}
          onKeyDown={onEditKeyDown}
        />
      ) : (
        <span
          style={{
            display: 'block', width: '100%', minHeight: '22px', lineHeight: '22px',
            overflow: 'hidden', textOverflow: 'ellipsis',
            fontWeight: cell.bold ? '700' : '400',
            fontStyle: cell.italic ? 'italic' : 'normal',
            textDecoration: cell.strike ? 'line-through' : 'none',
            color: cell.color || undefined,
            fontSize: cell.fontSize || 13,
          }}
        >{rendered}</span>
      )}
    </td>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// THEME — deep black + electric blue, proper dark mode
// ─────────────────────────────────────────────────────────────────────────────
const THEME = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');

  /* ── Base ── */
  .ss-root {
    display:flex; flex-direction:column; width:100%; height:100%;
    background:#08090e; font-family:'Inter',sans-serif;
    color:#f8fafc; overflow:hidden;
    --bg0:#0b0d14;   /* deepest black */
    --bg1:#13151f;   /* surface */
    --bg2:#1a1d2d;   /* raised */
    --bg3:#24283b;   /* hover */
    --line:#2a2f45;  /* borders */
    --acc:#3b82f6;   /* electric blue accent */
    --acc2:#60a5fa;  /* lighter blue */
    --text:#f8fafc;  /* primary text - slate 50 */
    --dim:#94a3b8;   /* dim text - slate 400 */
    --faint:#64748b; /* very faint - slate 500 */
    --sel-bg:rgba(59,130,246,0.15);/* selection bg */
    --sel-br:#3b82f6;/* selection border */
  }

  /* ── Ribbon ── */
  .ss-ribbon {
    display:flex; align-items:center; gap:2px; padding:5px 10px;
    background:var(--bg1); border-bottom:1px solid var(--line);
    flex-wrap:wrap; flex-shrink:0;
  }

  /* ── Tool buttons ── */
  .ss-tb {
    display:flex; align-items:center; justify-content:center;
    width:28px; height:28px; border-radius:5px; border:none;
    background:transparent; color:var(--dim); cursor:pointer; transition:all .1s;
  }
  .ss-tb:hover  { background:rgba(59,130,246,.15); color:var(--acc2); }
  .ss-tb.on     { background:rgba(59,130,246,.22); color:var(--acc); }
  .ss-tb:disabled { opacity:.25; cursor:default; }

  /* ── Divider ── */
  .ss-dv { width:1px; height:18px; background:var(--line); margin:0 4px; flex-shrink:0; }

  /* ── Selects ── */
  .ss-sel {
    background:var(--bg1); border:1px solid var(--line); font-size:11px;
    color:var(--dim); padding:3px 6px; outline:none; cursor:pointer;
    border-radius:5px; font-family:'Inter',sans-serif;
  }
  .ss-sel option { background:var(--bg1); }
  .ss-sel:focus { border-color:var(--acc); }

  /* ── Export button ── */
  .ss-exp {
    display:flex; align-items:center; gap:5px; padding:4px 14px;
    background:rgba(59,130,246,.1); color:var(--acc2);
    border:1px solid rgba(59,130,246,.25); border-radius:6px;
    font-size:11px; font-weight:600; cursor:pointer; transition:all .15s;
    margin-left:auto; font-family:'Inter',sans-serif;
  }
  .ss-exp:hover { background:rgba(59,130,246,.2); color:#93c5fd; border-color:rgba(59,130,246,.5); }

  /* ── Cell ref badge ── */
  .ss-cref {
    display:flex; align-items:center; padding:3px 10px;
    background:var(--bg2); border:1px solid var(--line); border-radius:5px;
    font-size:12px; font-weight:600; color:var(--acc); min-width:54px;
    letter-spacing:.5px; font-family:'JetBrains Mono',monospace; user-select:none;
  }

  /* ── Formula bar ── */
  .ss-fbar {
    display:flex; align-items:center; padding:4px 10px;
    background:var(--bg0); border-bottom:1px solid var(--line); gap:6px; flex-shrink:0;
  }
  .ss-finput {
    flex:1; border:none; outline:none; font-family:'JetBrains Mono',monospace;
    font-size:12px; color:var(--text); background:transparent; padding:3px 0;
  }
  .ss-finput::placeholder { color:var(--faint); }

  /* ── Grid wrapper ── */
  .ss-gw {
    flex:1; overflow:auto; background:var(--bg0); position:relative; outline:none;
  }
  .ss-gw::-webkit-scrollbar { width:8px; height:8px; }
  .ss-gw::-webkit-scrollbar-track  { background:var(--bg0); }
  .ss-gw::-webkit-scrollbar-thumb  { background:var(--bg3); border-radius:4px; }
  .ss-gw::-webkit-scrollbar-thumb:hover { background:#2a3050; }

  /* ── Table ── */
  .ss-tbl { border-collapse:collapse; min-width:100%; table-layout:fixed; }

  /* ── Col header ── */
  .ss-ch {
    background:var(--bg1); color:var(--faint); font-weight:500;
    text-align:center; border:1px solid var(--line); border-top:none;
    user-select:none; position:sticky; top:0; z-index:10;
    font-size:10px; height:26px; letter-spacing:.6px;
    font-family:'Inter',sans-serif; transition:color .1s;
  }
  .ss-ch.chi { color:var(--acc2); background:var(--bg2); }
  .ss-chi { display:flex; align-items:center; justify-content:center; height:100%; position:relative; }
  .ss-rz {
    position:absolute; right:0; top:0; bottom:0; width:5px; cursor:col-resize;
    transition:background .1s;
  }
  .ss-rz:hover { background:rgba(59,130,246,.5); }

  /* ── Row header ── */
  .ss-rh {
    background:var(--bg1); color:var(--faint); font-weight:400; text-align:center;
    border:1px solid var(--line); border-left:none; width:46px;
    position:sticky; left:0; z-index:10; font-size:10px; user-select:none;
    font-family:'JetBrains Mono',monospace; transition:color .1s;
  }
  .ss-rh.rhi { color:var(--acc2); background:var(--bg2); }

  /* ── Corner ── */
  .ss-corner {
    position:sticky; top:0; left:0; z-index:20; background:var(--bg1);
    border-right:1px solid var(--line); border-bottom:1px solid var(--line);
  }

  /* ── Cell ── */
  .ss-cell {
    border-right:1px solid var(--line); border-bottom:1px solid var(--line);
    height:26px; padding:0 6px; font-size:12px;
    font-family:'JetBrains Mono',monospace; color:var(--text);
    position:relative; user-select:none; white-space:nowrap;
    overflow:hidden; cursor:cell; background:var(--bg0);
    box-sizing:border-box;
  }
  .ss-cell:hover { background:#0b0d16; }

  /* Selected cell — electric blue border + fill handle */
  .ss-cell.sel { background:var(--sel-bg); }
  .ss-cell.sel::after {
    content:''; position:absolute; inset:-1px;
    border:2px solid var(--sel-br); z-index:5; pointer-events:none;
    border-radius:1px;
  }
  .ss-cell.sel::before {
    content:''; position:absolute; right:-4px; bottom:-4px;
    width:8px; height:8px; background:var(--sel-br); z-index:6;
    border:2px solid var(--bg0); pointer-events:none; border-radius:1px;
  }

  /* Range highlight — subtle blue wash */
  .ss-cell.rng {
    background:#0a1428;
    box-shadow:inset 0 0 0 1px rgba(59,130,246,.2);
  }

  /* Clipboard dashed */
  .ss-cell.cop { outline:2px dashed #22c55e; outline-offset:-2px; }

  /* ── Inline edit input ── */
  .ss-inp {
    position:absolute; inset:-1px; width:calc(100% + 2px); height:calc(100% + 2px);
    border:2px solid var(--acc); box-sizing:border-box; padding:0 6px;
    font-size:12px; font-family:'JetBrains Mono',monospace; outline:none; z-index:7;
    background:var(--bg0); color:var(--text); box-shadow:0 4px 20px rgba(0,0,0,.6);
    border-radius:1px;
  }

  /* ── Status bar ── */
  .ss-stat {
    display:flex; align-items:center; gap:16px; padding:0 12px; height:22px;
    background:var(--bg1); border-top:1px solid var(--line);
    font-size:10px; color:var(--faint); flex-shrink:0;
    font-family:'JetBrains Mono',monospace;
  }
  .ss-stat .hi { color:var(--acc2); }

  /* ── Tab bar ── */
  .ss-tabs {
    display:flex; align-items:center; background:var(--bg1);
    border-top:1px solid var(--line); height:34px;
    padding:0 10px; flex-shrink:0; gap:3px;
  }
  .ss-tab {
    display:flex; align-items:center; gap:5px; padding:0 12px; height:26px;
    background:transparent; border:1px solid transparent;
    border-radius:5px 5px 0 0; font-size:11px; font-weight:500;
    color:var(--dim); cursor:pointer; transition:all .15s; font-family:'Inter',sans-serif;
    user-select:none;
  }
  .ss-tab:hover  { color:var(--text); background:var(--bg3); border-color:var(--line); }
  .ss-tab.on     { background:var(--bg0); border-color:var(--acc); color:var(--acc2);
                   border-bottom-color:var(--bg0); }
  .ss-tab-x {
    display:flex; width:14px; height:14px; align-items:center; justify-content:center;
    border-radius:3px; color:var(--faint); cursor:pointer;
  }
  .ss-tab-x:hover { background:rgba(239,68,68,.2); color:#f87171; }
  .ss-tab-rn {
    background:transparent; border:none; border-bottom:1px solid var(--acc);
    outline:none; color:var(--acc2); font-size:11px; font-family:'Inter',sans-serif; width:70px;
  }
  .ss-tabadd {
    display:flex; align-items:center; justify-content:center; width:26px; height:26px;
    border-radius:5px; border:1px dashed var(--line); background:transparent;
    color:var(--faint); cursor:pointer; transition:all .15s;
  }
  .ss-tabadd:hover { border-color:var(--acc); color:var(--acc); }

  /* ── Context menu ── */
  .ss-ctx {
    position:fixed; background:var(--bg2); border:1px solid var(--line);
    border-radius:8px; box-shadow:0 12px 40px rgba(0,0,0,.8);
    z-index:1000; min-width:195px; padding:5px 0;
    backdrop-filter:blur(12px);
  }
  .ss-cxi {
    display:flex; align-items:center; gap:9px; padding:7px 14px;
    font-size:12px; color:var(--text); cursor:pointer; transition:all .08s;
    font-family:'Inter',sans-serif;
  }
  .ss-cxi:hover { background:rgba(59,130,246,.12); color:var(--text); }
  .ss-cxs { height:1px; background:var(--line); margin:4px 0; }

  /* ── Find bar ── */
  .ss-find {
    display:flex; align-items:center; gap:8px; padding:6px 12px;
    background:var(--bg2); border-bottom:1px solid var(--line);
    flex-shrink:0; font-size:12px;
  }
  .ss-fi {
    background:var(--bg0); border:1px solid var(--line); color:var(--text);
    padding:4px 9px; border-radius:5px; font-size:12px; outline:none;
    font-family:'JetBrains Mono',monospace; width:155px;
    transition:border-color .15s;
  }
  .ss-fi:focus { border-color:var(--acc); }
  .ss-fbtn {
    padding:4px 11px; background:rgba(59,130,246,.12); color:var(--acc2);
    border:1px solid rgba(59,130,246,.3); border-radius:5px; font-size:11px;
    cursor:pointer; font-family:'Inter',sans-serif; transition:all .1s;
  }
  .ss-fbtn:hover { background:rgba(59,130,246,.22); }

  /* ── Color picker dropdown ── */
  .ss-cp {
    position:absolute; top:32px; left:0; background:var(--bg2);
    border:1px solid var(--line); border-radius:8px; padding:10px;
    display:grid; grid-template-columns:repeat(8,1fr); gap:5px;
    width:200px; z-index:300; box-shadow:0 10px 30px rgba(0,0,0,.7);
  }
  .ss-sw {
    width:20px; height:20px; border-radius:4px; cursor:pointer;
    border:1px solid rgba(255,255,255,.06); transition:transform .1s, border-color .1s;
  }
  .ss-sw:hover { transform:scale(1.3); border-color:rgba(255,255,255,.5); }
`;

// ─────────────────────────────────────────────────────────────────────────────
// VIVID COLOR PALETTES
// ─────────────────────────────────────────────────────────────────────────────
const TEXT_COLORS = [
  // Row 1 — whites + greys
  '#ffffff', '#d0d8f0', '#94a3b8', '#64748b',
  // Row 2 — reds / oranges
  '#ff4444', '#ff7733', '#ffaa00', '#ffd700',
  // Row 3 — greens
  '#00ff88', '#22c55e', '#00e5cc', '#00bfff',
  // Row 4 — blues / purples
  '#3b82f6', '#818cf8', '#a855f7', '#ec4899',
];

const BG_COLORS = [
  // Row 1 — neutrals / dark
  null, '#0d0f18', '#0a0f1a', '#101520',
  // Row 2 — red / orange family
  '#3b0a0a', '#3b1a00', '#2a1a00', '#2a2200',
  // Row 3 — green / teal family
  '#002a14', '#00231e', '#002030', '#0a1428',
  // Row 4 — blue / purple family
  '#0d1a3b', '#160b3b', '#1a0a28', '#2a0a1e',
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function SpreadsheetEditor({ content, onContentChange, isReadOnly }) {

  const [grid, setGrid] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const formulaBarRef = useRef(null);
  const gridWrapperRef = useRef(null);

  const [zoom, setZoom] = useState(1);
  const [selRange, setSelRange] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef(null);
  const [clipboard, setClipboard] = useState(null);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [showFind, setShowFind] = useState(false);
  const [findVal, setFindVal] = useState('');
  const [replaceVal, setReplaceVal] = useState('');
  const [findResults, setFindResults] = useState([]);
  const [showColorPicker, setShowColorPicker] = useState(null);
  const [colWidths, setColWidths] = useState(Array(numCols).fill(100));
  const [sheets, setSheets] = useState(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [renamingSheet, setRenamingSheet] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const [history, dispatch] = useReducer(historyReducer, { past: [], present: null, future: [] });

  // ── Init from content ─────────────────────────────────────────────────────
  useEffect(() => {
    try {
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed && parsed.sheets && Array.isArray(parsed.sheets)) {
          const richSheets = parsed.sheets.map(sh => ({ ...sh, grid: legacyToRich(sh.grid) }));
          setSheets(richSheets);
          setActiveSheet(parsed.activeSheet || 0);
          setGrid(richSheets[parsed.activeSheet || 0].grid);
          dispatch({ type: 'PUSH', payload: richSheets[parsed.activeSheet || 0].grid });
          return;
        }
        if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
          const rich = legacyToRich(parsed);
          setSheets([{ name: 'Sheet1', grid: rich }]);
          setGrid(rich); dispatch({ type: 'PUSH', payload: rich }); return;
        }
      }
    } catch { /* ignore */ }
    const fresh = freshGrid();
    setSheets([{ name: 'Sheet1', grid: fresh }]);
    setGrid(fresh); dispatch({ type: 'PUSH', payload: fresh });
  }, [content]); // eslint-disable-line

  // ── Persist ───────────────────────────────────────────────────────────────
  const persistSheets = useCallback((activeGrid, overrideIdx) => {
    setSheets(prev => {
      if (!prev) return prev;
      const idx = overrideIdx ?? activeSheet;
      const ns = prev.map((sh, i) => i === idx ? { ...sh, grid: activeGrid } : sh);
      onContentChange?.(JSON.stringify({ sheets: ns, activeSheet: idx }));
      return ns;
    });
  }, [activeSheet, onContentChange]);

  // ── Update helpers ────────────────────────────────────────────────────────
  const updateCell = useCallback((r, c, valOrPatch) => {
    if (isReadOnly) return;
    setGrid(prev => {
      const newGrid = prev.map((row, ri) =>
        ri === r ? row.map((cell, ci) => {
          if (ci !== c) return cell;
          if (typeof valOrPatch === 'string') return { ...cell, value: valOrPatch };
          return { ...cell, ...valOrPatch };
        }) : row
      );
      dispatch({ type: 'PUSH', payload: newGrid });
      persistSheets(newGrid);
      return newGrid;
    });
  }, [isReadOnly, persistSheets]);

  const updateRange = useCallback((r1, c1, r2, c2, patch) => {
    if (isReadOnly) return;
    setGrid(prev => {
      const newGrid = prev.map((row, ri) =>
        ri >= Math.min(r1, r2) && ri <= Math.max(r1, r2)
          ? row.map((cell, ci) =>
            ci >= Math.min(c1, c2) && ci <= Math.max(c1, c2) ? { ...cell, ...patch } : cell)
          : row
      );
      dispatch({ type: 'PUSH', payload: newGrid });
      persistSheets(newGrid);
      return newGrid;
    });
  }, [isReadOnly, persistSheets]);

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (!history.past.length) return;
    const prev = history.past[history.past.length - 1];
    dispatch({ type: 'UNDO' }); setGrid(prev); persistSheets(prev);
  }, [history, persistSheets]);

  const handleRedo = useCallback(() => {
    if (!history.future.length) return;
    const next = history.future[0];
    dispatch({ type: 'REDO' }); setGrid(next); persistSheets(next);
  }, [history, persistSheets]);

  // ── Getters ───────────────────────────────────────────────────────────────
  const getSelectedCellValue = () => {
    if (!selectedCell) return '';
    const cell = grid[selectedCell.r]?.[selectedCell.c];
    return cell?.value ?? cell ?? '';
  };

  const getEffectiveRange = useCallback(() => {
    if (selRange) return selRange;
    if (selectedCell) return { r1: selectedCell.r, c1: selectedCell.c, r2: selectedCell.r, c2: selectedCell.c };
    return { r1: 0, c1: 0, r2: 0, c2: 0 };
  }, [selRange, selectedCell]);

  // ── PERF: build a Set of "r,c" strings for range membership — O(1) lookup ─
  const rangeSet = useMemo(() => {
    const s = new Set();
    if (!selRange) return s;
    const r1 = Math.min(selRange.r1, selRange.r2), r2 = Math.max(selRange.r1, selRange.r2);
    const c1 = Math.min(selRange.c1, selRange.c2), c2 = Math.max(selRange.c1, selRange.c2);
    for (let r = r1; r <= r2; r++)
      for (let c = c1; c <= c2; c++)
        s.add(`${r},${c}`);
    return s;
  }, [selRange]);

  // ── Formula bar change ────────────────────────────────────────────────────
  const handleFormulaBarChange = (e) => {
    if (!selectedCell || isReadOnly) return;
    const { r, c } = selectedCell;
    const val = e.target.value;
    if (!editingCell) setEditingCell({ r, c, val });
    else setEditingCell({ ...editingCell, val });
  };

  // ── Cell events ───────────────────────────────────────────────────────────
  const handleCellClick = useCallback((r, c) => {
    if (editingCell && editingCell.r === r && editingCell.c === c) return;
    setEditingCell(null); setSelectedCell({ r, c });
    gridWrapperRef.current?.focus();
  }, [editingCell]);

  const handleCellDoubleClick = useCallback((r, c) => {
    if (isReadOnly) return;
    setEditingCell({ r, c, val: grid[r]?.[c]?.value ?? grid[r]?.[c] ?? '' });
  }, [isReadOnly, grid]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  const applyFormat = useCallback((key, value) => {
    if (!selectedCell) return;
    const rng = getEffectiveRange();
    updateRange(rng.r1, rng.c1, rng.r2, rng.c2, { [key]: value });
  }, [selectedCell, getEffectiveRange, updateRange]);

  const handleCopy = useCallback((isCut = false) => {
    if (!selectedCell) return;
    const rng = getEffectiveRange();
    const cells = [];
    for (let ri = Math.min(rng.r1, rng.r2); ri <= Math.max(rng.r1, rng.r2); ri++) {
      const row = [];
      for (let ci = Math.min(rng.c1, rng.c2); ci <= Math.max(rng.c1, rng.c2); ci++)
        row.push({ ...grid[ri][ci] });
      cells.push(row);
    }
    setClipboard({ cells, isCut, r1: Math.min(rng.r1, rng.r2), c1: Math.min(rng.c1, rng.c2) });
    if (isCut) updateRange(rng.r1, rng.c1, rng.r2, rng.c2, { value: '' });
  }, [selectedCell, getEffectiveRange, grid, updateRange]);

  const handlePaste = useCallback(() => {
    if (!clipboard || !selectedCell || isReadOnly) return;
    const { cells } = clipboard;
    const { r: startR, c: startC } = selectedCell;
    setGrid(prev => {
      const ng = prev.map((row, ri) => {
        const rOff = ri - startR;
        if (rOff < 0 || rOff >= cells.length) return row;
        return row.map((cell, ci) => {
          const cOff = ci - startC;
          if (cOff < 0 || cOff >= cells[rOff].length) return cell;
          return { ...cells[rOff][cOff] };
        });
      });
      dispatch({ type: 'PUSH', payload: ng }); persistSheets(ng); return ng;
    });
  }, [clipboard, selectedCell, isReadOnly, persistSheets]);

  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') { e.preventDefault(); handleUndo(); return; }
      if (e.key === 'y') { e.preventDefault(); handleRedo(); return; }
      if (e.key === 'c') { e.preventDefault(); handleCopy(false); return; }
      if (e.key === 'x') { e.preventDefault(); handleCopy(true); return; }
      if (e.key === 'v') { e.preventDefault(); handlePaste(); return; }
      if (e.key === 'f') { e.preventDefault(); setShowFind(f => !f); return; }
      if (e.key === 'b' && selectedCell) {
        e.preventDefault();
        applyFormat('bold', !grid[selectedCell.r]?.[selectedCell.c]?.bold); return;
      }
      if (e.key === 'i' && selectedCell) {
        e.preventDefault();
        applyFormat('italic', !grid[selectedCell.r]?.[selectedCell.c]?.italic); return;
      }
    }
    if (editingCell) {
      if (e.key === 'Enter') {
        updateCell(editingCell.r, editingCell.c, editingCell.val);
        setEditingCell(null);
        setSelectedCell({ r: Math.min(editingCell.r + 1, numRows - 1), c: editingCell.c });
      } else if (e.key === 'Escape') {
        setEditingCell(null);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        updateCell(editingCell.r, editingCell.c, editingCell.val);
        setEditingCell(null);
        setSelectedCell({ r: editingCell.r, c: e.shiftKey ? Math.max(editingCell.c - 1, 0) : Math.min(editingCell.c + 1, numCols - 1) });
      }
      return;
    }
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nr = Math.max(r - 1, 0);
      if (e.shiftKey) setSelRange(p => ({ r1: p?.r1 ?? r, c1: p?.c1 ?? c, r2: nr, c2: p?.c2 ?? c }));
      else { setSelectedCell({ r: nr, c }); setSelRange(null); }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nr = Math.min(r + 1, numRows - 1);
      if (e.shiftKey) setSelRange(p => ({ r1: p?.r1 ?? r, c1: p?.c1 ?? c, r2: nr, c2: p?.c2 ?? c }));
      else { setSelectedCell({ r: nr, c }); setSelRange(null); }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const nc = Math.max(c - 1, 0);
      if (e.shiftKey) setSelRange(p => ({ r1: p?.r1 ?? r, c1: p?.c1 ?? c, r2: p?.r2 ?? r, c2: nc }));
      else { setSelectedCell({ r, c: nc }); setSelRange(null); }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nc = Math.min(c + 1, numCols - 1);
      if (e.shiftKey) setSelRange(p => ({ r1: p?.r1 ?? r, c1: p?.c1 ?? c, r2: p?.r2 ?? r, c2: nc }));
      else { setSelectedCell({ r, c: nc }); setSelRange(null); }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setSelectedCell({ r, c: e.shiftKey ? Math.max(c - 1, 0) : Math.min(c + 1, numCols - 1) });
      setSelRange(null);
    } else if (e.key === 'Enter' && !isReadOnly) {
      setEditingCell({ r, c, val: grid[r]?.[c]?.value ?? grid[r]?.[c] ?? '' });
      e.preventDefault();
    } else if ((e.key === 'Backspace' || e.key === 'Delete') && !isReadOnly) {
      e.preventDefault();
      const range = getEffectiveRange();
      updateRange(range.r1, range.c1, range.r2, range.c2, { value: '' });
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !isReadOnly) {
      setEditingCell({ r, c, val: e.key });
    }
  }, [editingCell, selectedCell, selRange, grid, isReadOnly, handleUndo, handleRedo, handleCopy, handlePaste, applyFormat, updateCell, updateRange, getEffectiveRange]); // eslint-disable-line

  // ── Mouse drag ────────────────────────────────────────────────────────────
  const handleCellMouseDown = useCallback((e, r, c) => {
    if (e.button !== 0) return;
    setEditingCell(null); handleCellClick(r, c);
    if (e.shiftKey && selectedCell) {
      setSelRange({ r1: selectedCell.r, c1: selectedCell.c, r2: r, c2: c });
    } else { setSelRange(null); setIsDragging(true); dragStart.current = { r, c }; }
    gridWrapperRef.current?.focus();
  }, [handleCellClick, selectedCell]);

  const handleCellMouseEnter = useCallback((r, c) => {
    if (!isDragging || !dragStart.current) return;
    setSelRange({ r1: dragStart.current.r, c1: dragStart.current.c, r2: r, c2: c });
    setSelectedCell(dragStart.current);
  }, [isDragging]);

  const handleMouseUp = () => { setIsDragging(false); dragStart.current = null; };

  // ── Context menu ──────────────────────────────────────────────────────────
  const handleContextMenu = useCallback((e, r, c) => {
    e.preventDefault();
    if (!rangeSet.has(`${r},${c}`)) { setSelectedCell({ r, c }); setSelRange(null); }
    setCtxMenu({ x: e.clientX, y: e.clientY, r, c });
  }, [rangeSet]);

  const closeCtx = () => setCtxMenu(null);

  const insertRow = (after) => {
    setGrid(prev => {
      const ng = [...prev];
      ng.splice(after ? ctxMenu.r + 1 : ctxMenu.r, 0, Array.from({ length: numCols }, emptyRichCell));
      if (ng.length > numRows) ng.pop();
      dispatch({ type: 'PUSH', payload: ng }); persistSheets(ng); return ng;
    }); closeCtx();
  };
  const deleteRow = () => {
    setGrid(prev => {
      let ng = prev.filter((_, i) => i !== ctxMenu.r);
      while (ng.length < numRows) ng.push(Array.from({ length: numCols }, emptyRichCell));
      dispatch({ type: 'PUSH', payload: ng }); persistSheets(ng); return ng;
    }); closeCtx();
  };
  const insertCol = (after) => {
    setGrid(prev => {
      const ng = prev.map(row => {
        const nr = [...row];
        nr.splice(after ? ctxMenu.c + 1 : ctxMenu.c, 0, emptyRichCell());
        if (nr.length > numCols) nr.pop(); return nr;
      });
      dispatch({ type: 'PUSH', payload: ng }); persistSheets(ng); return ng;
    }); closeCtx();
  };
  const deleteCol = () => {
    setGrid(prev => {
      const ng = prev.map(row => {
        const nr = row.filter((_, i) => i !== ctxMenu.c);
        while (nr.length < numCols) nr.push(emptyRichCell()); return nr;
      });
      dispatch({ type: 'PUSH', payload: ng }); persistSheets(ng); return ng;
    }); closeCtx();
  };

  // ── Find & replace ────────────────────────────────────────────────────────
  const runFind = () => {
    if (!findVal) { setFindResults([]); return; }
    const results = [];
    grid.forEach((row, ri) => row.forEach((cell, ci) => {
      if (String(cell?.value ?? '').toLowerCase().includes(findVal.toLowerCase()))
        results.push({ r: ri, c: ci });
    }));
    setFindResults(results);
    if (results.length) setSelectedCell(results[0]);
  };
  const doReplaceAll = () => {
    if (!findVal) return;
    setGrid(prev => {
      const ng = prev.map(row => row.map(cell => ({
        ...cell,
        value: typeof cell.value === 'string' ? cell.value.split(findVal).join(replaceVal) : cell.value,
      })));
      dispatch({ type: 'PUSH', payload: ng }); persistSheets(ng); return ng;
    }); setFindResults([]);
  };

  // ── Column resize ─────────────────────────────────────────────────────────
  const startColResize = (e, col) => {
    e.preventDefault();
    const startX = e.clientX, startW = colWidths[col];
    const onMove = (ev) => setColWidths(cw => cw.map((v, i) => i === col ? Math.max(30, startW + ev.clientX - startX) : v));
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
  };

  // ── Sheet management ──────────────────────────────────────────────────────
  const addSheet = () => {
    const fresh = freshGrid();
    const ns = [...(sheets ?? []), { name: `Sheet${(sheets?.length ?? 0) + 1}`, grid: fresh }];
    const na = ns.length - 1;
    setSheets(ns); setActiveSheet(na); setGrid(fresh);
    dispatch({ type: 'PUSH', payload: fresh });
    onContentChange?.(JSON.stringify({ sheets: ns, activeSheet: na }));
  };
  const switchSheet = (i) => {
    const savedGrid = grid;
    setSheets(prev => {
      if (!prev) return prev;
      const ns = prev.map((sh, idx) => idx === activeSheet ? { ...sh, grid: savedGrid } : sh);
      setActiveSheet(i); setGrid(ns[i].grid);
      dispatch({ type: 'PUSH', payload: ns[i].grid });
      setSelectedCell(null); setSelRange(null); setEditingCell(null);
      onContentChange?.(JSON.stringify({ sheets: ns, activeSheet: i }));
      return ns;
    });
  };
  const deleteSheet = (i) => {
    if (!sheets || sheets.length === 1) return;
    const ns = sheets.filter((_, idx) => idx !== i);
    const na = Math.min(activeSheet, ns.length - 1);
    setSheets(ns); setActiveSheet(na); setGrid(ns[na].grid);
    dispatch({ type: 'PUSH', payload: ns[na].grid });
    onContentChange?.(JSON.stringify({ sheets: ns, activeSheet: na }));
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentCell = selectedCell ? grid[selectedCell.r]?.[selectedCell.c] : null;

  const statusStats = useMemo(() => {
    if (!selectedCell) return null;
    const rng = getEffectiveRange();
    const vals = [];
    for (let ri = Math.min(rng.r1, rng.r2); ri <= Math.max(rng.r1, rng.r2); ri++)
      for (let ci = Math.min(rng.c1, rng.c2); ci <= Math.max(rng.c1, rng.c2); ci++) {
        const n = parseFloat(displayValue(grid[ri]?.[ci], grid));
        if (!isNaN(n)) vals.push(n);
      }
    if (vals.length < 2) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return { sum, avg: (sum / vals.length).toFixed(2), count: vals.length };
  }, [selectedCell, selRange, grid]); // eslint-disable-line

  if (!grid.length) return <div style={{ background: '#08090e', flex: 1 }} />;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="ss-root"
      onMouseUp={handleMouseUp}
      onClick={(e) => {
        if (ctxMenu && !e.target.closest('.ss-ctx')) closeCtx();
        if (showColorPicker && !e.target.closest('.ss-cp') && !e.target.closest('[data-cpb]'))
          setShowColorPicker(null);
      }}
    >
      <style>{THEME}</style>

      {/* ── Ribbon ── */}
      <div className="ss-ribbon">
        <button className="ss-tb" title="Undo (Ctrl+Z)" disabled={!history.past.length} onClick={handleUndo}><Undo size={14} /></button>
        <button className="ss-tb" title="Redo (Ctrl+Y)" disabled={!history.future.length} onClick={handleRedo}><Redo size={14} /></button>
        <div className="ss-dv" />
        <button className="ss-tb" title="Cut (Ctrl+X)" onClick={() => handleCopy(true)}><Scissors size={14} /></button>
        <button className="ss-tb" title="Copy (Ctrl+C)" onClick={() => handleCopy(false)}><Copy size={14} /></button>
        <button className="ss-tb" title="Paste (Ctrl+V)" onClick={handlePaste}><Clipboard size={14} /></button>
        <div className="ss-dv" />
        <button className="ss-tb" title="Zoom Out" onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}><ZoomOut size={14} /></button>
        <span style={{ fontSize: 11, color: 'var(--dim)', width: '36px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button className="ss-tb" title="Zoom In" onClick={() => setZoom(z => Math.min(z + 0.25, 2))}><ZoomIn size={14} /></button>
        <div className="ss-dv" />
        <select className="ss-sel" style={{ width: 96 }}>
          <option>JetBrains Mono</option><option>Arial</option><option>Courier</option>
        </select>
        <select className="ss-sel" style={{ width: 46 }}>
          {[10, 11, 12, 13, 14, 16, 18].map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="ss-dv" />

        {/* Formatting — bold / italic / strike */}
        <button className={`ss-tb${currentCell?.bold ? ' on' : ''}`} title="Bold (Ctrl+B)"
          onClick={() => applyFormat('bold', !currentCell?.bold)}><Bold size={13} /></button>
        <button className={`ss-tb${currentCell?.italic ? ' on' : ''}`} title="Italic (Ctrl+I)"
          onClick={() => applyFormat('italic', !currentCell?.italic)}><Italic size={13} /></button>
        <button className={`ss-tb${currentCell?.strike ? ' on' : ''}`} title="Strikethrough"
          onClick={() => applyFormat('strike', !currentCell?.strike)}><Strikethrough size={13} /></button>

        {/* Text color */}
        <div style={{ position: 'relative' }}>
          <button className="ss-tb" data-cpb="1" title="Text color"
            onClick={() => setShowColorPicker(p => p === 'text' ? null : 'text')}>
            <Baseline size={13} style={{ color: currentCell?.color || 'var(--dim)' }} />
          </button>
          {showColorPicker === 'text' && (
            <div className="ss-cp">
              {TEXT_COLORS.map(clr => (
                <div key={clr} className="ss-sw" style={{ background: clr }}
                  onClick={() => { applyFormat('color', clr); setShowColorPicker(null); }} />
              ))}
            </div>
          )}
        </div>

        {/* BG color */}
        <div style={{ position: 'relative' }}>
          <button className="ss-tb" data-cpb="1" title="Cell background"
            onClick={() => setShowColorPicker(p => p === 'bg' ? null : 'bg')}>
            <PaintBucket size={13} style={{ color: currentCell?.bg || 'var(--dim)' }} />
          </button>
          {showColorPicker === 'bg' && (
            <div className="ss-cp">
              {BG_COLORS.map((clr, i) => (
                <div key={i} className="ss-sw"
                  style={{ background: clr ?? 'repeating-linear-gradient(45deg,#1c2030 0,#1c2030 3px,#0d0f18 3px,#0d0f18 6px)' }}
                  onClick={() => { applyFormat('bg', clr); setShowColorPicker(null); }} />
              ))}
            </div>
          )}
        </div>

        <div className="ss-dv" />

        {/* Alignment */}
        <button className={`ss-tb${!currentCell?.align || currentCell?.align === 'left' ? ' on' : ''}`}
          title="Left" onClick={() => applyFormat('align', 'left')}><AlignLeft size={13} /></button>
        <button className={`ss-tb${currentCell?.align === 'center' ? ' on' : ''}`}
          title="Center" onClick={() => applyFormat('align', 'center')}><AlignCenter size={13} /></button>
        <button className={`ss-tb${currentCell?.align === 'right' ? ' on' : ''}`}
          title="Right" onClick={() => applyFormat('align', 'right')}><AlignRight size={13} /></button>

        <div className="ss-dv" />

        <button className="ss-tb" title="Find & Replace (Ctrl+F)"
          onClick={() => setShowFind(f => !f)}>
          <Search size={13} style={{ color: showFind ? 'var(--acc)' : undefined }} />
        </button>

        <button className="ss-exp"
          onClick={() => downloadCSV(grid, sheets?.[activeSheet]?.name || 'sheet')}
          title="Export CSV">
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* ── Find bar ── */}
      {showFind && (
        <div className="ss-find">
          <span style={{ color: 'var(--faint)', fontSize: 11 }}>Find</span>
          <input className="ss-fi" placeholder="Search…" value={findVal}
            onChange={e => setFindVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && runFind()} autoFocus />
          <span style={{ color: 'var(--faint)', fontSize: 11 }}>Replace</span>
          <input className="ss-fi" placeholder="Replace with…" value={replaceVal}
            onChange={e => setReplaceVal(e.target.value)} />
          <button className="ss-fbtn" onClick={runFind}>Find</button>
          <button className="ss-fbtn" onClick={doReplaceAll}>Replace All</button>
          {findResults.length > 0 &&
            <span style={{ color: 'var(--acc2)', fontSize: 11, fontFamily: 'JetBrains Mono,monospace' }}>{findResults.length} found</span>}
          {findVal && findResults.length === 0 &&
            <span style={{ color: '#f87171', fontSize: 11, fontFamily: 'JetBrains Mono,monospace' }}>No results</span>}
          <button className="ss-tb" style={{ marginLeft: 'auto' }} onClick={() => setShowFind(false)}><X size={12} /></button>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="ss-fbar">
        <div className="ss-cref">{selectedCell ? cellRef(selectedCell.r, selectedCell.c) : '—'}</div>
        <div className="ss-dv" style={{ margin: '0 4px' }} />
        <input
          ref={formulaBarRef}
          className="ss-finput"
          placeholder="Enter value"
          value={editingCell ? editingCell.val : getSelectedCellValue()}
          onChange={handleFormulaBarChange}
          readOnly={isReadOnly}
          onBlur={() => {
            if (editingCell) {
              updateCell(editingCell.r, editingCell.c, editingCell.val);
              setEditingCell(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && editingCell) {
              updateCell(editingCell.r, editingCell.c, editingCell.val);
              setEditingCell(null);
              setSelectedCell({ r: Math.min(editingCell.r + 1, numRows - 1), c: editingCell.c });
            } else if (e.key === 'Escape') {
              setEditingCell(null);
            }
          }}
        />
      </div>

      {/* ── Grid ── */}
      <div ref={gridWrapperRef} className="ss-gw" tabIndex={0} onKeyDown={handleKeyDown}>
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: 'fit-content' }}>
          <table className="ss-tbl">
            <thead>
              <tr>
                <th className="ss-corner" />
                {Array.from({ length: numCols }).map((_, c) => (
                  <th key={c}
                    className={`ss-ch${selectedCell?.c === c ? ' chi' : ''}`}
                    style={{ width: colWidths[c] }}
                  >
                    <div className="ss-chi">
                      {colLetter(c)}
                      <div className="ss-rz" onMouseDown={e => startColResize(e, c)} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.slice(0, numRows).map((row, r) => (
                <tr key={r}>
                  <td className={`ss-rh${selectedCell?.r === r ? ' rhi' : ''}`}>{r + 1}</td>
                  {Array.from({ length: numCols }).map((_, c) => {
                    const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                    const isEditing = editingCell?.r === r && editingCell?.c === c;
                    const inRange = rangeSet.has(`${r},${c}`) && !isSelected;
                    const isCopied = clipboard && !clipboard.isCut &&
                      r >= clipboard.r1 && r < clipboard.r1 + clipboard.cells.length &&
                      c >= clipboard.c1 && c < clipboard.c1 + (clipboard.cells[0]?.length ?? 0);

                    const cell = row[c] || emptyRichCell();
                    const rawVal = cell.value ?? '';
                    const rendered = displayValue(cell, grid);
                    const isFormula = typeof rawVal === 'string' && rawVal.startsWith('=');

                    return (
                      <GridCell
                        key={c}
                        r={r} c={c}
                        cell={cell}
                        rendered={rendered}
                        isFormula={isFormula}
                        isSelected={isSelected}
                        isEditing={isEditing}
                        inRange={inRange}
                        isCopied={isCopied}
                        editVal={editingCell?.val ?? ''}
                        width={colWidths[c]}
                        formulaBarRef={formulaBarRef}
                        onMouseDown={(e) => handleCellMouseDown(e, r, c)}
                        onMouseEnter={() => handleCellMouseEnter(r, c)}
                        onClick={() => handleCellClick(r, c)}
                        onDoubleClick={() => handleCellDoubleClick(r, c)}
                        onContextMenu={(e) => handleContextMenu(e, r, c)}
                        onEditChange={(e) => setEditingCell(prev => ({ ...prev, val: e.target.value }))}
                        onEditBlur={() => {
                          if (document.activeElement !== formulaBarRef.current) {
                            updateCell(r, c, editingCell?.val ?? '');
                            setEditingCell(null);
                          }
                        }}
                        onEditKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') {
                            updateCell(r, c, editingCell?.val ?? '');
                            setEditingCell(null);
                            setSelectedCell({ r: Math.min(r + 1, numRows - 1), c });
                            e.preventDefault();
                          } else if (e.key === 'Escape') {
                            setEditingCell(null);
                          } else if (e.key === 'Tab') {
                            updateCell(r, c, editingCell?.val ?? '');
                            setEditingCell(null);
                            setSelectedCell({ r, c: e.shiftKey ? Math.max(c - 1, 0) : Math.min(c + 1, numCols - 1) });
                            e.preventDefault();
                          }
                        }}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="ss-stat">
        <span className="hi">{sheets?.[activeSheet]?.name ?? 'Sheet1'}</span>
        <span>{selectedCell ? cellRef(selectedCell.r, selectedCell.c) : '—'}</span>
        {selRange && (
          <span className="hi">
            {Math.abs(selRange.r2 - selRange.r1) + 1} × {Math.abs(selRange.c2 - selRange.c1) + 1}
          </span>
        )}
        {statusStats && <>
          <span>∑ {statusStats.sum}</span>
          <span>avg {statusStats.avg}</span>
          <span>n={statusStats.count}</span>
        </>}
        <span style={{ marginLeft: 'auto' }}>{numRows} × {numCols}</span>
      </div>

      {/* ── Sheet tabs ── */}
      <div className="ss-tabs">
        <button className="ss-tb"><Menu size={13} /></button>
        <button className="ss-tabadd" title="Add sheet" onClick={addSheet}><Plus size={12} /></button>
        {(sheets ?? [{ name: 'Sheet1' }]).map((sh, i) => (
          <div key={i}
            className={`ss-tab${i === activeSheet ? ' on' : ''}`}
            onClick={() => switchSheet(i)}
            onDoubleClick={() => { setRenamingSheet(i); setRenameVal(sh.name); }}
          >
            {renamingSheet === i ? (
              <input className="ss-tab-rn" value={renameVal} autoFocus
                onChange={e => setRenameVal(e.target.value)}
                onBlur={() => {
                  if (renameVal.trim()) {
                    const ns = (sheets ?? []).map((s, idx) => idx === i ? { ...s, name: renameVal.trim() } : s);
                    setSheets(ns); onContentChange?.(JSON.stringify({ sheets: ns, activeSheet }));
                  }
                  setRenamingSheet(null);
                }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') e.target.blur(); }}
                onClick={e => e.stopPropagation()}
              />
            ) : sh.name}
            {(sheets?.length ?? 0) > 1 && (
              <span className="ss-tab-x" onClick={e => { e.stopPropagation(); deleteSheet(i); }}>
                <X size={9} />
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ── Context menu ── */}
      {ctxMenu && (
        <div className="ss-ctx" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
          <div className="ss-cxi" onClick={() => { handleCopy(false); closeCtx(); }}><Copy size={12} /> Copy</div>
          <div className="ss-cxi" onClick={() => { handleCopy(true); closeCtx(); }}><Scissors size={12} /> Cut</div>
          <div className="ss-cxi" onClick={() => { handlePaste(); closeCtx(); }}><Clipboard size={12} /> Paste</div>
          <div className="ss-cxs" />
          <div className="ss-cxi" onClick={() => insertRow(false)}>Insert row above</div>
          <div className="ss-cxi" onClick={() => insertRow(true)}>Insert row below</div>
          <div className="ss-cxi" onClick={deleteRow}><Trash2 size={12} /> Delete row</div>
          <div className="ss-cxs" />
          <div className="ss-cxi" onClick={() => insertCol(false)}>Insert column left</div>
          <div className="ss-cxi" onClick={() => insertCol(true)}>Insert column right</div>
          <div className="ss-cxi" onClick={deleteCol}><Trash2 size={12} /> Delete column</div>
          <div className="ss-cxs" />
          <div className="ss-cxi" onClick={() => {
            updateRange(ctxMenu.r, ctxMenu.c, ctxMenu.r, ctxMenu.c,
              { value: '', bold: false, italic: false, strike: false, color: null, bg: null });
            closeCtx();
          }}><Trash2 size={12} /> Clear cell</div>
        </div>
      )}
    </div>
  );
}