import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Link, Image, Table, CheckSquare,
  Eye, EyeOff, Download, Maximize2, Minimize2
} from "lucide-react";

// Simple markdown parser for preview
const parseMarkdown = (md) => {
  if (!md) return "";

  let html = md
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
    // Unordered list
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    // Ordered list
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    // Task list
    .replace(/^- \[([ x])\] (.*$)/gim, '<li class="task-item"><input type="checkbox" $1 disabled/> $2</li>')
    // Wrap list items
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  return html;
};

const MarkdownEditor = ({ content, onContentChange, isReadOnly }) => {
  const [markdownText, setMarkdownText] = useState(content || "");
  const [showPreview, setShowPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  const toolbarButtons = [
    { icon: <Bold size={16} />, action: () => insertText('**', '**', 'bold text'), title: 'Bold' },
    { icon: <Italic size={16} />, action: () => insertText('*', '*', 'italic text'), title: 'Italic' },
    { icon: <Strikethrough size={16} />, action: () => insertText('~~', '~~', 'strikethrough'), title: 'Strikethrough' },
    { icon: <Code size={16} />, action: () => insertText('`', '`', 'code'), title: 'Inline Code' },
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
    { icon: <Link size={16} />, action: () => insertText('[', '](url)', 'link text'), title: 'Link' },
    { icon: <Image size={16} />, action: () => insertText('![', '](url)', 'alt text'), title: 'Image' },
    { icon: <Table size={16} />, action: () => insertText('\n| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n'), title: 'Table' },
  ];

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
                background: 'transparent',
                border: 'none',
                borderRadius: 6,
                color: '#94a3b8',
                cursor: isReadOnly ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                opacity: isReadOnly ? 0.3 : 1
              }}
              onMouseEnter={e => !isReadOnly && (e.currentTarget.style.background = '#1e2535', e.currentTarget.style.color = '#e2e8f0')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = '#94a3b8')}
            >
              {btn.icon}
            </button>
          )
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
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
    </div>
  );
};

export default MarkdownEditor;
