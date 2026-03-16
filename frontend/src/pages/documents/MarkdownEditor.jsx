import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Link, Image, Table, CheckSquare,
  Eye, EyeOff, Download, Maximize2, Minimize2, Minus, Braces,
  Plus, Trash2, ArrowDown, ArrowRight, X, Columns, Rows
} from "lucide-react";

// Simple markdown parser for preview
const parseMarkdown = (md) => {
  if (!md) return "";

  // Process tables before general line-by-line transforms
  const lines = md.split("\n");
  const processed = [];
  let i = 0;

  while (i < lines.length) {
    // Detect markdown table: at least a header row, a separator row, and data rows
    if (
      i + 1 < lines.length &&
      lines[i].trim().startsWith("|") &&
      lines[i + 1].trim().match(/^\|[\s\-:|]+\|/)
    ) {
      let tableLines = [lines[i]];
      let j = i + 1;
      // Skip separator
      j++;
      while (j < lines.length && lines[j].trim().startsWith("|")) {
        tableLines.push(lines[j]);
        j++;
      }

      const parseRow = (line) =>
        line.split("|").slice(1, -1).map((c) => c.trim());

      const headers = parseRow(tableLines[0]);
      const dataRows = tableLines.slice(1).map(parseRow);

      let tableHtml = '<table><thead><tr>';
      headers.forEach((h) => { tableHtml += `<th>${h}</th>`; });
      tableHtml += '</tr></thead><tbody>';
      dataRows.forEach((row) => {
        tableHtml += '<tr>';
        row.forEach((cell) => { tableHtml += `<td>${cell}</td>`; });
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table>';
      processed.push(tableHtml);
      i = j;
      continue;
    }

    processed.push(lines[i]);
    i++;
  }

  let html = processed.join("\n");

  html = html
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headings
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^\*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    // Links
    .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0"/>')
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    // Horizontal rule
    .replace(/^---$/gim, '<hr/>')
    // Task list (must be before regular lists)
    .replace(/^- \[(x)\] (.*$)/gim, '<li class="task-item"><input type="checkbox" checked disabled/> $2</li>')
    .replace(/^- \[( )\] (.*$)/gim, '<li class="task-item"><input type="checkbox" disabled/> $2</li>')
    // Unordered list
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    // Ordered list
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    // Wrap list items
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  return html;
};

// Table Builder Dialog
const TableBuilderDialog = ({ onInsert, onClose }) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [headers, setHeaders] = useState([]);
  const [hoverCell, setHoverCell] = useState(null);

  useEffect(() => {
    setHeaders(Array.from({ length: cols }, (_, i) => `Header ${i + 1}`));
  }, [cols]);

  const handleInsert = () => {
    const headerRow = "| " + headers.join(" | ") + " |";
    const sepRow = "| " + headers.map(() => "---").join(" | ") + " |";
    const dataRows = Array.from({ length: rows }, () =>
      "| " + Array.from({ length: cols }, () => "     ").join(" | ") + " |"
    );
    onInsert("\n" + [headerRow, sepRow, ...dataRows].join("\n") + "\n");
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, backdropFilter: "blur(3px)"
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#161b27", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 14, padding: "24px 28px", width: 420,
        boxShadow: "0 20px 60px rgba(0,0,0,0.7)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>Insert Table</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Quick grid picker */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>Quick select size</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 3, width: "fit-content" }}>
            {Array.from({ length: 36 }, (_, idx) => {
              const r = Math.floor(idx / 6) + 1;
              const c = (idx % 6) + 1;
              const isActive = hoverCell ? r <= hoverCell.r && c <= hoverCell.c : r <= rows && c <= cols;
              return (
                <div key={idx}
                  onMouseEnter={() => setHoverCell({ r, c })}
                  onMouseLeave={() => setHoverCell(null)}
                  onClick={() => { setRows(r); setCols(c); }}
                  style={{
                    width: 22, height: 22, borderRadius: 3,
                    border: `1px solid ${isActive ? "#8b5cf6" : "rgba(255,255,255,0.1)"}`,
                    background: isActive ? "rgba(139,92,246,0.2)" : "transparent",
                    cursor: "pointer", transition: "all 0.1s"
                  }}
                />
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
            {hoverCell ? `${hoverCell.r} × ${hoverCell.c}` : `${rows} × ${cols}`}
          </div>
        </div>

        {/* Manual inputs */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 4 }}>Rows</label>
            <input type="number" min={1} max={20} value={rows}
              onChange={e => setRows(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              style={{
                width: "100%", padding: "8px 10px", background: "#0d0e14",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                color: "#e2e8f0", fontFamily: "Inter,sans-serif", fontSize: 14, outline: "none"
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 4 }}>Columns</label>
            <input type="number" min={1} max={10} value={cols}
              onChange={e => setCols(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              style={{
                width: "100%", padding: "8px 10px", background: "#0d0e14",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                color: "#e2e8f0", fontFamily: "Inter,sans-serif", fontSize: 14, outline: "none"
              }}
            />
          </div>
        </div>

        {/* Header names */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>Column Headers</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {headers.map((h, idx) => (
              <input key={idx} value={h}
                onChange={e => {
                  const next = [...headers];
                  next[idx] = e.target.value;
                  setHeaders(next);
                }}
                style={{
                  flex: "1 1 80px", minWidth: 70, padding: "6px 8px", background: "#0d0e14",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
                  color: "#e2e8f0", fontFamily: "Inter,sans-serif", fontSize: 12, outline: "none"
                }}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        <div style={{
          padding: 12, background: "#0d0e14", borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.06)", marginBottom: 20,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#64748b",
          lineHeight: 1.6, overflow: "auto", maxHeight: 120
        }}>
          <div>| {headers.join(" | ")} |</div>
          <div>| {headers.map(() => "---").join(" | ")} |</div>
          {Array.from({ length: Math.min(rows, 3) }, (_, i) => (
            <div key={i}>| {Array.from({ length: cols }, () => "     ").join(" | ")} |</div>
          ))}
          {rows > 3 && <div style={{ color: "#475569" }}>... +{rows - 3} more rows</div>}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "8px 16px", background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            color: "#94a3b8", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter,sans-serif"
          }}>Cancel</button>
          <button onClick={handleInsert} style={{
            padding: "8px 16px", background: "linear-gradient(135deg, #7c3aed, #6366f1)",
            border: "none", borderRadius: 8, color: "#fff", fontSize: 13,
            fontWeight: 600, cursor: "pointer", fontFamily: "Inter,sans-serif"
          }}>Insert Table</button>
        </div>
      </div>
    </div>
  );
};


const MarkdownEditor = ({ content, onContentChange, isReadOnly }) => {
  const [markdownText, setMarkdownText] = useState(content || "");
  const [showPreview, setShowPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const textareaRef = useRef(null);
  const isInternalChangeRef = useRef(false);

  // Sync external content changes
  useEffect(() => {
    if (content !== markdownText && !isInternalChangeRef.current) {
      setMarkdownText(content || "");
    }
    isInternalChangeRef.current = false;
  }, [content]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setMarkdownText(newValue);
    isInternalChangeRef.current = true;
    onContentChange(newValue);
  };

  const insertText = (before, after = "", placeholder = "") => {
    if (isReadOnly) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdownText.substring(start, end);
    const textToInsert = selectedText || placeholder;
    const newText = markdownText.substring(0, start) + before + textToInsert + after + markdownText.substring(end);

    setMarkdownText(newText);
    isInternalChangeRef.current = true;
    onContentChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + textToInsert.length
      );
    }, 0);
  };

  const insertAtLineStart = (prefix) => {
    if (isReadOnly) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = markdownText.lastIndexOf('\n', start - 1) + 1;
    const newText = markdownText.substring(0, lineStart) + prefix + markdownText.substring(lineStart);

    setMarkdownText(newText);
    isInternalChangeRef.current = true;
    onContentChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const insertRawText = (text) => {
    if (isReadOnly) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const newText = markdownText.substring(0, start) + text + markdownText.substring(start);

    setMarkdownText(newText);
    isInternalChangeRef.current = true;
    onContentChange(newText);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + text.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // Table manipulation helpers based on cursor position
  const getTableContext = () => {
    const textarea = textareaRef.current;
    if (!textarea) return null;

    const cursorPos = textarea.selectionStart;
    const lines = markdownText.split("\n");
    let charCount = 0;
    let cursorLine = 0;

    for (let i = 0; i < lines.length; i++) {
      if (charCount + lines[i].length >= cursorPos) {
        cursorLine = i;
        break;
      }
      charCount += lines[i].length + 1;
    }

    // Find table boundaries
    let tableStart = cursorLine;
    let tableEnd = cursorLine;

    while (tableStart > 0 && lines[tableStart - 1].trim().startsWith("|")) {
      tableStart--;
    }
    while (tableEnd < lines.length - 1 && lines[tableEnd + 1].trim().startsWith("|")) {
      tableEnd++;
    }

    if (!lines[tableStart]?.trim().startsWith("|")) return null;

    const tableLines = lines.slice(tableStart, tableEnd + 1);
    if (tableLines.length < 2) return null;

    // Check if second line is separator
    if (!tableLines[1].match(/^\|[\s\-:|]+\|/)) return null;

    return { tableStart, tableEnd, tableLines, cursorLine, allLines: lines };
  };

  const addTableRow = () => {
    const ctx = getTableContext();
    if (!ctx) return;

    const { tableEnd, tableLines, allLines } = ctx;
    const colCount = tableLines[0].split("|").filter(c => c.trim() !== "").length;
    const newRow = "| " + Array.from({ length: colCount }, () => "     ").join(" | ") + " |";

    const newLines = [...allLines];
    newLines.splice(tableEnd + 1, 0, newRow);
    const newText = newLines.join("\n");

    setMarkdownText(newText);
    isInternalChangeRef.current = true;
    onContentChange(newText);
  };

  const addTableColumn = () => {
    const ctx = getTableContext();
    if (!ctx) return;

    const { tableStart, tableEnd, allLines } = ctx;
    const newLines = [...allLines];

    for (let i = tableStart; i <= tableEnd; i++) {
      const line = newLines[i].trimEnd();
      if (i === tableStart) {
        newLines[i] = line + " New Col |";
      } else if (i === tableStart + 1) {
        newLines[i] = line + " --- |";
      } else {
        newLines[i] = line + "      |";
      }
    }

    const newText = newLines.join("\n");
    setMarkdownText(newText);
    isInternalChangeRef.current = true;
    onContentChange(newText);
  };

  const deleteTableRow = () => {
    const ctx = getTableContext();
    if (!ctx) return;

    const { tableStart, cursorLine, allLines } = ctx;
    // Don't delete header or separator
    if (cursorLine <= tableStart + 1) return;

    const newLines = [...allLines];
    newLines.splice(cursorLine, 1);
    const newText = newLines.join("\n");

    setMarkdownText(newText);
    isInternalChangeRef.current = true;
    onContentChange(newText);
  };

  const downloadMarkdown = () => {
    const blob = new Blob([markdownText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Word/char count
  const wordCount = markdownText.trim() ? markdownText.trim().split(/\s+/).length : 0;
  const charCount = markdownText.length;

  // Detect if cursor is inside a table for contextual table tools
  const [inTable, setInTable] = useState(false);
  const checkTableContext = useCallback(() => {
    setInTable(!!getTableContext());
  }, [markdownText]);

  const toolbarButtons = [
    { icon: <Bold size={16} />, action: () => insertText('**', '**', 'bold text'), title: 'Bold (Ctrl+B)', shortcut: 'B' },
    { icon: <Italic size={16} />, action: () => insertText('*', '*', 'italic text'), title: 'Italic (Ctrl+I)', shortcut: 'I' },
    { icon: <Strikethrough size={16} />, action: () => insertText('~~', '~~', 'strikethrough'), title: 'Strikethrough' },
    { icon: <Code size={16} />, action: () => insertText('`', '`', 'code'), title: 'Inline Code' },
    { icon: <Braces size={16} />, action: () => insertText('\n```\n', '\n```\n', 'code block'), title: 'Code Block' },
    { type: 'separator' },
    { icon: <Heading1 size={16} />, action: () => insertAtLineStart('# '), title: 'Heading 1' },
    { icon: <Heading2 size={16} />, action: () => insertAtLineStart('## '), title: 'Heading 2' },
    { icon: <Heading3 size={16} />, action: () => insertAtLineStart('### '), title: 'Heading 3' },
    { type: 'separator' },
    { icon: <List size={16} />, action: () => insertAtLineStart('- '), title: 'Bullet List' },
    { icon: <ListOrdered size={16} />, action: () => insertAtLineStart('1. '), title: 'Numbered List' },
    { icon: <CheckSquare size={16} />, action: () => insertAtLineStart('- [ ] '), title: 'Task List' },
    { type: 'separator' },
    { icon: <Quote size={16} />, action: () => insertAtLineStart('> '), title: 'Blockquote' },
    { icon: <Minus size={16} />, action: () => insertRawText('\n---\n'), title: 'Horizontal Rule' },
    { icon: <Link size={16} />, action: () => insertText('[', '](url)', 'link text'), title: 'Link' },
    { icon: <Image size={16} />, action: () => insertText('![', '](url)', 'alt text'), title: 'Image' },
    { type: 'separator' },
    { icon: <Table size={16} />, action: () => setShowTableDialog(true), title: 'Insert Table', highlight: true },
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isReadOnly) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        insertText('**', '**', 'bold text');
      } else if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        insertText('*', '*', 'italic text');
      }
    };
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener("keydown", handleKeyDown);
      return () => textarea.removeEventListener("keydown", handleKeyDown);
    }
  }, [isReadOnly, markdownText]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: '#0c0e15',
      fontFamily: 'Inter, sans-serif',
      position: isFullscreen ? 'fixed' : 'relative',
      top: isFullscreen ? 0 : 'auto',
      left: isFullscreen ? 0 : 'auto',
      right: isFullscreen ? 0 : 'auto',
      bottom: isFullscreen ? 0 : 'auto',
      zIndex: isFullscreen ? 9999 : 'auto'
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '8px 16px',
        background: '#161b27',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexWrap: 'wrap'
      }}>
        {toolbarButtons.map((btn, idx) =>
          btn.type === 'separator' ? (
            <div key={idx} style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          ) : (
            <button
              key={idx}
              onClick={btn.action}
              disabled={isReadOnly}
              title={btn.title}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                background: btn.highlight ? 'rgba(139,92,246,0.1)' : 'transparent',
                border: btn.highlight ? '1px solid rgba(139,92,246,0.2)' : 'none',
                borderRadius: 6,
                color: btn.highlight ? '#a78bfa' : '#94a3b8',
                cursor: isReadOnly ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                opacity: isReadOnly ? 0.3 : 1
              }}
              onMouseEnter={e => !isReadOnly && (e.currentTarget.style.background = btn.highlight ? 'rgba(139,92,246,0.2)' : '#1e2535', e.currentTarget.style.color = btn.highlight ? '#c4b5fd' : '#e2e8f0')}
              onMouseLeave={e => (e.currentTarget.style.background = btn.highlight ? 'rgba(139,92,246,0.1)' : 'transparent', e.currentTarget.style.color = btn.highlight ? '#a78bfa' : '#94a3b8')}
            >
              {btn.icon}
            </button>
          )
        )}

        {/* Table editing tools - shown when cursor is inside a table */}
        {inTable && !isReadOnly && (
          <>
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
            <div style={{ display: 'flex', gap: 2, alignItems: 'center', background: 'rgba(16,185,129,0.08)', borderRadius: 6, padding: '2px 4px', border: '1px solid rgba(16,185,129,0.15)' }}>
              <button onClick={addTableRow} title="Add Row Below"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: 'transparent', border: 'none', borderRadius: 4, color: '#34d399', cursor: 'pointer', transition: 'all 0.15s', gap: 2 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Rows size={14} />
                <Plus size={10} />
              </button>
              <button onClick={addTableColumn} title="Add Column"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: 'transparent', border: 'none', borderRadius: 4, color: '#34d399', cursor: 'pointer', transition: 'all 0.15s', gap: 2 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Columns size={14} />
                <Plus size={10} />
              </button>
              <button onClick={deleteTableRow} title="Delete Current Row"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: 'transparent', border: 'none', borderRadius: 4, color: '#f87171', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Word count */}
          <span style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap' }}>
            {wordCount} words · {charCount} chars
          </span>

          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: showPreview ? 'rgba(139,92,246,0.15)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: showPreview ? '#a78bfa' : '#94a3b8',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>

          <button
            onClick={downloadMarkdown}
            title="Download as Markdown"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: '#94a3b8',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1e2535', e.currentTarget.style.color = '#e2e8f0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = '#94a3b8')}
          >
            <Download size={14} />
            .md
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              background: 'transparent',
              border: 'none',
              borderRadius: 6,
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1e2535', e.currentTarget.style.color = '#e2e8f0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = '#94a3b8')}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Editor Pane */}
        <div style={{
          flex: showPreview ? 1 : '1 1 100%',
          display: 'flex',
          flexDirection: 'column',
          borderRight: showPreview ? '1px solid rgba(255,255,255,0.08)' : 'none'
        }}>
          <textarea
            ref={textareaRef}
            value={markdownText}
            onChange={handleChange}
            onSelect={checkTableContext}
            onClick={checkTableContext}
            onKeyUp={checkTableContext}
            disabled={isReadOnly}
            placeholder="# Start writing markdown...\n\nUse the toolbar or type markdown syntax directly."
            style={{
              flex: 1,
              padding: '24px',
              background: '#0c0e15',
              border: 'none',
              outline: 'none',
              color: '#e2e8f0',
              fontSize: 14,
              lineHeight: 1.7,
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              resize: 'none',
              caretColor: '#8b5cf6'
            }}
          />
        </div>

        {/* Preview Pane */}
        {showPreview && (
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            background: '#0f1117'
          }}>
            <style>{`
              .markdown-preview h1 { font-size: 2em; font-weight: 700; color: #f8fafc; margin: 0.67em 0; line-height: 1.2; }
              .markdown-preview h2 { font-size: 1.5em; font-weight: 600; color: #e2e8f0; margin: 0.83em 0; }
              .markdown-preview h3 { font-size: 1.17em; font-weight: 600; color: #cbd5e1; margin: 1em 0; }
              .markdown-preview p { margin: 1em 0; color: #94a3b8; }
              .markdown-preview code { font-family: 'JetBrains Mono', monospace; background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #a78bfa; font-size: 0.9em; }
              .markdown-preview pre { background: #1e293b; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; }
              .markdown-preview pre code { background: none; padding: 0; }
              .markdown-preview blockquote { border-left: 3px solid #8b5cf6; padding-left: 16px; margin: 16px 0; color: #94a3b8; font-style: italic; }
              .markdown-preview ul, .markdown-preview ol { padding-left: 24px; margin: 12px 0; color: #94a3b8; }
              .markdown-preview li { margin: 6px 0; }
              .markdown-preview a { color: #60a5fa; text-decoration: underline; }
              .markdown-preview hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0; }
              .markdown-preview table { border-collapse: collapse; width: 100%; margin: 16px 0; }
              .markdown-preview th, .markdown-preview td { border: 1px solid rgba(255,255,255,0.1); padding: 8px 12px; text-align: left; }
              .markdown-preview th { background: #1e293b; font-weight: 600; color: #e2e8f0; }
              .markdown-preview td { color: #94a3b8; }
              .markdown-preview strong { font-weight: 600; color: #f8fafc; }
              .markdown-preview em { font-style: italic; }
              .markdown-preview del { text-decoration: line-through; opacity: 0.7; }
              .markdown-preview .task-item { list-style: none; }
              .markdown-preview .task-item input { margin-right: 8px; }
            `}</style>
            <div
              className="markdown-preview"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(markdownText) }}
            />
          </div>
        )}
      </div>

      {/* Table Builder Dialog */}
      {showTableDialog && (
        <TableBuilderDialog
          onInsert={(text) => insertRawText(text)}
          onClose={() => setShowTableDialog(false)}
        />
      )}
    </div>
  );
};

export default MarkdownEditor;
