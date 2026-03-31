import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

// Icons
const Ic = {
  bold: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>,
  italic: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>,
  under: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" /><line x1="4" y1="21" x2="20" y2="21" /></svg>,
  strike: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><path d="M16 6C16 6 13 4 11 4C8.79086 4 7 5.79086 7 8C7 10.2091 9 11 11 11C13 11 16 11.5 16 13.5C16 15.5 14 17 11 17C8.5 17 6 15.5 6 15.5" /></svg>,
  aL: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
  aC: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
  aR: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
  ul: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>,
  ol: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></svg>,
  quote: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.99c1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /></svg>,
  link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  image: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  undo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>,
  redo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" /></svg>,
  outdent: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="11" y1="6" x2="21" y2="6" /><line x1="11" y1="12" x2="21" y2="12" /><line x1="11" y1="18" x2="21" y2="18" /><polyline points="7 8 3 12 7 16" /></svg>,
  indent: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="11" y2="6" /><line x1="21" y1="12" x2="11" y2="12" /><line x1="21" y1="18" x2="11" y2="18" /><polyline points="3 8 7 12 3 16" /></svg>,
  table: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>,
  superscript: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19l8-14" /><path d="M12 19L4 5" /><path d="M20 5h-4l2 3h-2" /></svg>,
  subscript: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5l8 14" /><path d="M12 5l-8 14" /><path d="M20 19h-4l2-3h-2" /></svg>,
  find: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  print: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>,
};

export default function DocumentEditor({ content, onContentChange, isReadOnly, docTitle, onSelectionChange }) {
  const tb = isReadOnly;
  const editorRef = useRef(null);
  const lastRangeRef = useRef(null);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [selectedImageMeta, setSelectedImageMeta] = useState(null); // { x, y, w }
  const draggingResizeRef = useRef(null);

  // Local active states for toolbars
  const colorRef = useRef(null);
  const highlightRef = useRef(null);
  const imageInputRef = useRef(null);
  const [textColor, setTextColor] = useState("#0f172a");
  const [highlightColor, setHighlightColor] = useState("#fef08a");
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showFind, setShowFind] = useState(false);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const TEXT_COLORS = [
    "#111827", // near-black
    "#475569", // slate
    "#2563eb", // blue
    "#7c3aed", // violet
    "#16a34a", // green
    "#ea580c", // orange
    "#dc2626", // red
    "#0f766e", // teal
  ];

  const isInternalChangeRef = useRef(false);

  // Initialize and React to remote changes
  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML) {
      isInternalChangeRef.current = true;
      const sel = window.getSelection();
      let saved = null;
      try { if (sel?.rangeCount > 0) saved = sel.getRangeAt(0).cloneRange(); } catch { /* ignore */ }
      editorRef.current.innerHTML = content || "";
      try { if (saved) { sel.removeAllRanges(); sel.addRange(saved); } } catch { /* ignore */ }
      isInternalChangeRef.current = false;
    }
  }, [content]);

  useEffect(() => {
    const handleSelection = () => {
      // Keep last valid selection inside the editor so toolbar actions
      // (like color picker) can still apply.
      try {
        const sel = window.getSelection();
        if (
          sel?.rangeCount > 0 &&
          editorRef.current &&
          editorRef.current.contains(sel.anchorNode)
        ) {
          lastRangeRef.current = sel.getRangeAt(0).cloneRange();
        }
      } catch {
        /* ignore */
      }

      if (onSelectionChange && editorRef.current) {
        onSelectionChange(window.getSelection(), editorRef);
      }
    };
    document.addEventListener("selectionchange", handleSelection);
    return () => document.removeEventListener("selectionchange", handleSelection);
  }, [onSelectionChange]);

  const restoreSelection = () => {
    try {
      const r = lastRangeRef.current;
      if (!r) return;
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    } catch {
      /* ignore */
    }
  };

  const handleInput = () => {
    if (!editorRef.current || isInternalChangeRef.current || isReadOnly) return;
    const html = editorRef.current.innerHTML;
    if (onContentChange) onContentChange(html);
  };

  const exec = (cmd, val = null) => {
    if (isReadOnly) return;
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    handleInput();
  };

  const insertLink = () => { const url = prompt("Enter URL:"); if (url) exec("createLink", url); };

  const insertTable = () => {
    if (isReadOnly) return;
    const rows = parseInt(prompt("Number of rows:", "3"), 10);
    const cols = parseInt(prompt("Number of columns:", "3"), 10);
    if (!rows || !cols || rows < 1 || cols < 1) return;
    let html = "<table style='width:100%;border-collapse:collapse;margin-bottom:1em;'><tbody>";
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        html += "<td style='border:1px solid #ccc;padding:8px;'> <br> </td>";
      }
      html += "</tr>";
    }
    html += "</tbody></table><p><br></p>";
    exec("insertHTML", html);
  };

  const insertImage = () => {
    if (isReadOnly) return;
    imageInputRef.current?.click();
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      editorRef.current?.focus();
      const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      // Wrap in a non-editable span so it can be selected/resized/removed safely.
      document.execCommand(
        "insertHTML",
        false,
        `<span class="de-img-wrap" contenteditable="false" data-img-id="${id}" style="width:360px;max-width:100%;"><img src="${reader.result}" alt="${file.name}" /></span><p><br></p>`
      );
      handleInput();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const clearImageSelection = () => {
    setSelectedImageId(null);
    setSelectedImageMeta(null);
    try {
      editorRef.current?.querySelectorAll?.(".de-img-wrap.de-img-selected")?.forEach((n) => {
        n.classList.remove("de-img-selected");
      });
    } catch {
      /* ignore */
    }
  };

  const selectImageWrap = (wrap) => {
    if (!wrap) return;
    const id = wrap.getAttribute("data-img-id");
    if (!id) return;

    // Remove selection class from others
    try {
      editorRef.current?.querySelectorAll?.(".de-img-wrap.de-img-selected")?.forEach((n) => {
        if (n !== wrap) n.classList.remove("de-img-selected");
      });
    } catch {
      /* ignore */
    }

    wrap.classList.add("de-img-selected");
    const rect = wrap.getBoundingClientRect();
    const w = rect.width;
    setSelectedImageId(id);
    setSelectedImageMeta({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      w,
    });
  };

  const removeSelectedImage = () => {
    if (!selectedImageId || !editorRef.current) return;
    const wrap = editorRef.current.querySelector(`.de-img-wrap[data-img-id="${selectedImageId}"]`);
    if (wrap) wrap.remove();
    clearImageSelection();
    handleInput();
  };

  const setSelectedImageWidth = (nextWidthPx) => {
    if (!selectedImageId || !editorRef.current) return;
    const wrap = editorRef.current.querySelector(`.de-img-wrap[data-img-id="${selectedImageId}"]`);
    if (!wrap) return;
    const w = Math.max(120, Math.min(900, Number(nextWidthPx) || 360));
    wrap.style.width = `${w}px`;
    const rect = wrap.getBoundingClientRect();
    setSelectedImageMeta((m) =>
      m ? { ...m, x: rect.left + rect.width / 2, y: rect.top - 8, w: rect.width } : m
    );
    handleInput();
  };

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const onClick = (ev) => {
      if (isReadOnly) return;
      const target = ev.target;
      const wrap = target?.closest?.(".de-img-wrap");
      if (wrap && el.contains(wrap)) {
        ev.preventDefault();
        selectImageWrap(wrap);
        return;
      }
      clearImageSelection();
    };

    const onKeyDown = (ev) => {
      if (isReadOnly) return;
      if ((ev.key === "Delete" || ev.key === "Backspace") && selectedImageId) {
        ev.preventDefault();
        removeSelectedImage();
      }
    };

    const onScrollOrResize = () => {
      if (!selectedImageId || !el) return;
      const wrap = el.querySelector(`.de-img-wrap[data-img-id="${selectedImageId}"]`);
      if (!wrap) return clearImageSelection();
      const rect = wrap.getBoundingClientRect();
      setSelectedImageMeta({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
        w: rect.width,
      });
    };

    el.addEventListener("click", onClick);
    el.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      el.removeEventListener("click", onClick);
      el.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [isReadOnly, selectedImageId]);

  useEffect(() => {
    const move = (ev) => {
      if (!draggingResizeRef.current) return;
      const { startX, startW } = draggingResizeRef.current;
      const dx = ev.clientX - startX;
      setSelectedImageWidth(startW + dx);
    };
    const up = () => {
      draggingResizeRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    if (draggingResizeRef.current) {
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    }
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [selectedImageId]);

  // Export handling
  useEffect(() => {
    const handleDownload = () => {
      if (!editorRef.current) return;
      try {
        const html = editorRef.current.innerHTML;
        const title = docTitle || 'Untitled_Document';
        const wrappedHtml = `<html xmlns:v="urn:schemas-microsoft-com:vml"
xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${title}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page { size: A4; margin: 2.54cm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.6; color: #333; }
  h1 { font-size: 24pt; font-weight: bold; color: #0f172a; margin: 0 0 14pt; }
  h2 { font-size: 18pt; font-weight: bold; color: #1e293b; margin: 18pt 0 10pt; }
  h3 { font-size: 14pt; font-weight: bold; color: #334155; margin: 14pt 0 8pt; }
  p { margin: 0 0 8pt; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
  th { background: #f5f5f5; font-weight: bold; }
  blockquote { margin: 12pt 0; padding: 8pt 16pt; border-left: 3px solid #3b82f6; color: #555; font-style: italic; }
  code { font-family: 'Courier New', monospace; font-size: 10pt; background: #f1f5f9; padding: 1px 4px; }
  img { max-width: 100%; }
  ul { list-style-type: disc; padding-left: 24pt; }
  ol { list-style-type: decimal; padding-left: 24pt; }
  a { color: #2563eb; text-decoration: underline; }
</style>
</head>
<body>
${html}
</body>
</html>`;
        const blob = new Blob([wrappedHtml], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Download error:", err);
        alert("Failed to generate document. Please try again.");
      }
    };

    document.addEventListener('download-doc', handleDownload);
    return () => document.removeEventListener('download-doc', handleDownload);
  }, [docTitle]);

  const handleFindReplace = () => {
    if (!findText || !editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    editorRef.current.innerHTML = html.replace(regex, replaceText);
    handleInput();
    setFindText("");
    setReplaceText("");
  };

  const handleFindHighlight = () => {
    if (!findText || !editorRef.current) return;
    window.find(findText, false, false, true, false, false, false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      {/* Toolbar */}
      <div className="de-toolbar">
        {/* Undo / Redo */}
        <div className="de-tb-group">
          <button className="de-tb-btn" title="Undo (Ctrl+Z)" disabled={tb} onClick={() => exec("undo")}>{Ic.undo}</button>
          <button className="de-tb-btn" title="Redo (Ctrl+Y)" disabled={tb} onClick={() => exec("redo")}>{Ic.redo}</button>
        </div>
        {/* Font family */}
        <div className="de-tb-group">
          <select className="de-tb-select" disabled={tb}
            style={{ minWidth: 110 }}
            onChange={e => exec("fontName", e.target.value)} defaultValue="">
            <option value="" disabled>Font</option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
            <option value="Trebuchet MS">Trebuchet MS</option>
            <option value="Roboto">Roboto</option>
          </select>
        </div>
        {/* Font size */}
        <div className="de-tb-group">
          <select className="de-tb-select" disabled={tb}
            style={{ width: 64 }}
            onChange={e => exec("fontSize", e.target.value)} defaultValue="3">
            {[["1", "8pt"], ["2", "10pt"], ["3", "11pt"], ["4", "12pt"], ["5", "14pt"], ["6", "18pt"], ["7", "24pt"]].map(([v, l]) =>
              <option key={v} value={v}>{l}</option>
            )}
          </select>
        </div>
        {/* Block format */}
        <div className="de-tb-group">
          <select className="de-tb-select" disabled={tb}
            style={{ minWidth: 100 }}
            onChange={e => exec("formatBlock", e.target.value)} defaultValue="">
            <option value="" disabled>Normal text</option>
            <option value="p">Normal text</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
            <option value="blockquote">Quote</option>
            <option value="pre">Code</option>
          </select>
        </div>
        {/* Bold/Italic/Underline/Strike */}
        <div className="de-tb-group">
          <button className="de-tb-btn" title="Bold (Ctrl+B)" disabled={tb} onClick={() => exec("bold")}>{Ic.bold}</button>
          <button className="de-tb-btn" title="Italic (Ctrl+I)" disabled={tb} onClick={() => exec("italic")}>{Ic.italic}</button>
          <button className="de-tb-btn" title="Underline (Ctrl+U)" disabled={tb} onClick={() => exec("underline")}>{Ic.under}</button>
          <button className="de-tb-btn" title="Strikethrough" disabled={tb} onClick={() => exec("strikeThrough")}>{Ic.strike}</button>
        </div>
        {/* Text color (palette) */}
        <div className="de-tb-group">
          <div style={{ position: "relative", opacity: tb ? 0.35 : 1 }}>
            <button
              type="button"
              disabled={tb}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => !tb && setShowColorPalette((v) => !v)}
              className="de-tb-btn"
              title="Text color"
              style={{ padding: "0 6px", gap: 4 }}
            >
              <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1, color: "#cbd5e1", fontFamily: "Inter,sans-serif" }}>A</span>
              <span
                style={{
                  width: 14,
                  height: 4,
                  borderRadius: 999,
                  background: textColor,
                  border: "1px solid rgba(15,23,42,.6)",
                }}
              />
            </button>
            {showColorPalette && !tb && (
              <div
                style={{
                  position: "absolute",
                  top: "110%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#020617",
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,.4)",
                  padding: "6px 8px",
                  boxShadow: "0 10px 30px rgba(0,0,0,.6)",
                  display: "flex",
                  gap: 6,
                  zIndex: 50,
                }}
              >
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setTextColor(c);
                      exec("foreColor", c);
                      setShowColorPalette(false);
                    }}
                    title={c}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 5,
                      background: c,
                      border: c === textColor ? "2px solid #e2e8f0" : "1px solid rgba(255,255,255,.18)",
                      boxShadow: c === textColor ? "0 0 0 1px rgba(59,130,246,.45)" : "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Alignment */}
        <div className="de-tb-group">
          <button className="de-tb-btn" title="Align left" disabled={tb} onClick={() => exec("justifyLeft")}>{Ic.aL}</button>
          <button className="de-tb-btn" title="Center" disabled={tb} onClick={() => exec("justifyCenter")}>{Ic.aC}</button>
          <button className="de-tb-btn" title="Align right" disabled={tb} onClick={() => exec("justifyRight")}>{Ic.aR}</button>
        </div>
        {/* Lists / Quote */}
        <div className="de-tb-group">
          <button className="de-tb-btn" title="Bulleted list" disabled={tb} onClick={() => exec("insertUnorderedList")}>{Ic.ul}</button>
          <button className="de-tb-btn" title="Numbered list" disabled={tb} onClick={() => exec("insertOrderedList")}>{Ic.ol}</button>
          <button className="de-tb-btn" title="Quote" disabled={tb} onClick={() => exec("formatBlock", "blockquote")}>{Ic.quote}</button>
        </div>
        {/* Link / HR / Clear */}
        <div className="de-tb-group">
          <button className="de-tb-btn" title="Insert link" disabled={tb} onClick={insertLink}>{Ic.link}</button>
          <button className="de-tb-btn" title="Horizontal line" disabled={tb} onClick={() => exec("insertHorizontalRule")}>
            <span style={{ fontSize: 16, lineHeight: 1, fontWeight: 500, color: "#94a3b8" }}>—</span>
          </button>
        </div>
        {/* Table / Image */}
        <div className="de-tb-group">
          <button className="de-tb-btn" title="Insert table" disabled={tb} onClick={insertTable}>{Ic.table}</button>
          <button className="de-tb-btn" title="Insert image" disabled={tb} onClick={insertImage}>{Ic.image}</button>
        </div>
        
        {/* Find */}
        <div className="de-tb-group">
          <button className="de-tb-btn" title="Find & Replace (Ctrl+H)" onClick={() => setShowFind(f => !f)}>{Ic.find}</button>
        </div>
      </div>

      {/* Find & Replace Bar */}
      {showFind && (
        <div className="de-find-bar">
          <input
            className="de-find-input"
            placeholder="Find…"
            value={findText}
            onChange={e => setFindText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleFindHighlight(); if (e.key === "Escape") setShowFind(false); }}
            autoFocus
          />
          <button className="de-find-btn" onClick={handleFindHighlight}>Find</button>
          <input
            className="de-find-input"
            placeholder="Replace with…"
            value={replaceText}
            onChange={e => setReplaceText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleFindReplace(); if (e.key === "Escape") setShowFind(false); }}
          />
          <button className="de-find-btn" onClick={handleFindReplace}>Replace All</button>
          <button className="de-find-close" onClick={() => setShowFind(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}

      {/* Page Area */}
      <div className="de-page-area" style={{ flex: 1 }}>
        <div className="de-page">
          <div ref={editorRef} className="de-editor"
            contentEditable={!isReadOnly}
            suppressContentEditableWarning
            onInput={handleInput}
            spellCheck
          />

          {/* Selected image controls */}
          {!isReadOnly && selectedImageId && selectedImageMeta && (
            <div
              style={{
                position: "fixed",
                left: selectedImageMeta.x,
                top: selectedImageMeta.y,
                transform: "translate(-50%, -100%)",
                zIndex: 200,
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 10,
                padding: "8px 10px",
                boxShadow: "0 10px 30px rgba(0,0,0,.4)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700 }}>
                Image
              </span>
              <input
                type="range"
                min="120"
                max="900"
                value={Math.round(selectedImageMeta.w || 360)}
                onChange={(e) => setSelectedImageWidth(e.target.value)}
                style={{ width: 140 }}
                title="Resize"
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const wrap = editorRef.current?.querySelector(`.de-img-wrap[data-img-id="${selectedImageId}"]`);
                  const rect = wrap?.getBoundingClientRect();
                  draggingResizeRef.current = { startX: e.clientX, startW: rect?.width || selectedImageMeta.w || 360 };
                }}
                style={{
                  background: "rgba(59,130,246,.12)",
                  border: "1px solid rgba(59,130,246,.35)",
                  color: "#93c5fd",
                  padding: "4px 8px",
                  borderRadius: 8,
                  cursor: "nwse-resize",
                  fontSize: 11,
                  fontWeight: 800,
                }}
                title="Drag to resize"
              >
                Resize
              </button>
              <button
                type="button"
                onClick={removeSelectedImage}
                style={{
                  background: "rgba(239,68,68,.12)",
                  border: "1px solid rgba(239,68,68,.35)",
                  color: "#fca5a5",
                  padding: "4px 8px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 800,
                }}
                title="Remove image"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input for images */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageFileChange}
      />
    </div>
  );
}