import React, { useState, useRef, useEffect } from "react";

// Icons
const Ic = {
  bold: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>,
  italic: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>,
  under: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>,
  strike: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><path d="M16 6C16 6 13 4 11 4C8.79086 4 7 5.79086 7 8C7 10.2091 9 11 11 11C13 11 16 11.5 16 13.5C16 15.5 14 17 11 17C8.5 17 6 15.5 6 15.5"/></svg>,
  aL: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  aC: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  aR: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  ul: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  ol: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>,
  quote: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.99c1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>,
  link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  image: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  undo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>,
  redo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>,
  outdent: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="11" y1="6" x2="21" y2="6"/><line x1="11" y1="12" x2="21" y2="12"/><line x1="11" y1="18" x2="21" y2="18"/><polyline points="7 8 3 12 7 16"/></svg>,
  indent: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="18" x2="11" y2="18"/><polyline points="3 8 7 12 3 16"/></svg>,
  table: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>,
  superscript: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19l8-14"/><path d="M12 19L4 5"/><path d="M20 5h-4l2 3h-2"/></svg>,
  subscript: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5l8 14"/><path d="M12 5l-8 14"/><path d="M20 19h-4l2-3h-2"/></svg>,
  find: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  print: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
};

export default function DocumentEditor({ content, onContentChange, isReadOnly, docTitle }) {
  const tb = isReadOnly;
  const editorRef = useRef(null);
  
  // Local active states for toolbars
  const colorRef = useRef(null);
  const highlightRef = useRef(null);
  const imageInputRef = useRef(null);
  const [textColor, setTextColor] = useState("#0f172a");
  const [highlightColor, setHighlightColor] = useState("#fef08a");
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showFind, setShowFind] = useState(false);
  
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

  const handleInput = () => {
    if (!editorRef.current || isInternalChangeRef.current || isReadOnly) return;
    const html = editorRef.current.innerHTML;
    if (onContentChange) onContentChange(html);
  };

  const exec = (cmd, val = null) => {
    if (isReadOnly) return;
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
      alert("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      editorRef.current?.focus();
      document.execCommand("insertHTML", false, `<img src="${reader.result}" alt="${file.name}" style="max-width:100%" /><p><br></p>`);
      handleInput();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

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
        {/* Print */}
        <div className="de-tb-group">
          <button className="de-tb-btn" title="Print (Ctrl+P)" onClick={() => window.print()}>{Ic.print}</button>
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
            style={{ width: 52 }}
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
        {/* Text color */}
        <div className="de-tb-group">
          <div className="de-color-wrap" title="Text color" style={{ opacity: tb ? .35 : 1, cursor: tb ? "not-allowed" : "pointer", flexDirection: "column", gap: 1 }}
            onClick={() => !tb && colorRef.current?.click()}>
            <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1, color: "#cbd5e1", fontFamily: "Inter,sans-serif" }}>A</span>
            <div className="de-color-swatch" style={{ background: textColor }} />
            <input ref={colorRef} type="color" style={{ display: "none" }} value={textColor}
              onChange={e => { setTextColor(e.target.value); exec("foreColor", e.target.value); }} />
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
          <button className="de-tb-btn" title="Clear formatting" disabled={tb} onClick={() => exec("removeFormat")}>
            <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>Tx</span>
          </button>
        </div>
        {/* Table / Image */}
        <div className="de-tb-group">
          <button className="de-tb-btn" title="Insert table" disabled={tb} onClick={insertTable}>{Ic.table}</button>
          <button className="de-tb-btn" title="Insert image" disabled={tb} onClick={insertImage}>{Ic.image}</button>
        </div>
        {/* Indent / Outdent */}
        <div className="de-tb-group">
          <button className="de-tb-btn" title="Outdent" disabled={tb} onClick={() => exec("outdent")}>{Ic.outdent}</button>
          <button className="de-tb-btn" title="Indent" disabled={tb} onClick={() => exec("indent")}>{Ic.indent}</button>
        </div>
        {/* Superscript / Subscript */}
        <div className="de-tb-group">
          <button className="de-tb-btn" title="Superscript" disabled={tb} onClick={() => exec("superscript")}>{Ic.superscript}</button>
          <button className="de-tb-btn" title="Subscript" disabled={tb} onClick={() => exec("subscript")}>{Ic.subscript}</button>
        </div>
        {/* Highlight */}
        <div className="de-tb-group">
          <div className="de-color-wrap" title="Highlight color" style={{ opacity: tb ? .35 : 1, cursor: tb ? "not-allowed" : "pointer", flexDirection: "column", gap: 1 }}
            onClick={() => !tb && highlightRef.current?.click()}>
            <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1, color: "#cbd5e1", fontFamily: "Inter,sans-serif" }}>H</span>
            <div className="de-color-swatch" style={{ background: highlightColor }} />
            <input ref={highlightRef} type="color" style={{ display: "none" }} value={highlightColor}
              onChange={e => { setHighlightColor(e.target.value); exec("hiliteColor", e.target.value); }} />
          </div>
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