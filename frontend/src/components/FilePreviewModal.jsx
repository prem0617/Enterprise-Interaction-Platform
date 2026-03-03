import React, { useEffect, useRef, useMemo } from "react";
import { X, Download, FileText, Eye, Code2, FileSpreadsheet } from "lucide-react";
import hljs from "highlight.js/lib/core";

// Register only the languages we need to keep the bundle small
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import cpp from "highlight.js/lib/languages/cpp";
import rust from "highlight.js/lib/languages/rust";
import java from "highlight.js/lib/languages/java";
import go from "highlight.js/lib/languages/go";
import ruby from "highlight.js/lib/languages/ruby";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import sql from "highlight.js/lib/languages/sql";
import bash from "highlight.js/lib/languages/bash";
import yaml from "highlight.js/lib/languages/yaml";
import typescript from "highlight.js/lib/languages/typescript";
import php from "highlight.js/lib/languages/php";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("c", cpp);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("java", java);
hljs.registerLanguage("go", go);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("css", css);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("json", json);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("php", php);

// Map file extensions to highlight.js language names
const EXT_TO_LANG = {
    ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript",
    ".ts": "typescript", ".tsx": "typescript",
    ".py": "python",
    ".cpp": "cpp", ".c": "c", ".h": "c", ".hpp": "cpp", ".cc": "cpp",
    ".rs": "rust",
    ".java": "java", ".kt": "java",
    ".go": "go",
    ".rb": "ruby",
    ".css": "css", ".scss": "css",
    ".html": "html", ".xml": "xml", ".svg": "xml",
    ".json": "json",
    ".md": "markdown", ".markdown": "markdown",
    ".sql": "sql",
    ".sh": "bash", ".bash": "bash", ".zsh": "bash",
    ".yaml": "yaml", ".yml": "yaml", ".toml": "yaml",
    ".php": "php",
};

function getExtension(filename) {
    if (!filename) return "";
    const idx = filename.lastIndexOf(".");
    return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Fix Cloudinary URLs that mistakenly use /image/upload/ for non-image files.
 */
function fixCloudinaryUrl(url, mimeType) {
    if (!url) return url;
    const isImage = mimeType?.startsWith("image/");
    if (!isImage && url.includes("/image/upload/")) {
        return url.replace("/image/upload/", "/raw/upload/");
    }
    return url;
}

/**
 * Determine preview type based on MIME type and file extension.
 */
function getPreviewType(mimeType, fileName) {
    const ext = getExtension(fileName);
    if (mimeType?.startsWith("image/")) return "image";
    if (mimeType === "application/pdf" || ext === ".pdf") return "pdf";
    if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword" ||
        ext === ".docx" || ext === ".doc"
    ) return "document";
    if (ext === ".csv" || mimeType === "text/csv") return "csv";
    if (ext === ".md" || ext === ".markdown" || mimeType === "text/markdown") return "markdown";
    if (
        mimeType?.startsWith("text/") ||
        mimeType === "application/json" ||
        mimeType === "application/javascript" ||
        mimeType === "application/xml" ||
        mimeType === "application/x-yaml" ||
        EXT_TO_LANG[ext]
    ) return "code";
    return "unknown";
}

/* ═══════════════════════════════════════════════════════════════
   CSV TABLE RENDERER
   ═══════════════════════════════════════════════════════════════ */
function CsvTable({ text }) {
    const rows = useMemo(() => {
        if (!text) return [];
        return text
            .split("\n")
            .filter((line) => line.trim())
            .map((line) => line.split(",").map((cell) => cell.trim()));
    }, [text]);

    if (rows.length === 0) return <p className="text-zinc-500 text-sm">Empty CSV</p>;

    const header = rows[0];
    const body = rows.slice(1);

    return (
        <div className="overflow-auto max-h-[70vh] rounded-lg border border-zinc-700/60">
            <table className="w-full text-sm text-left">
                <thead className="bg-zinc-800/80 sticky top-0">
                    <tr>
                        {header.map((cell, i) => (
                            <th
                                key={i}
                                className="px-3 py-2 text-xs font-semibold text-indigo-300 border-b border-zinc-700 whitespace-nowrap"
                            >
                                {cell}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                    {body.map((row, ri) => (
                        <tr key={ri} className="hover:bg-zinc-800/40 transition-colors">
                            {row.map((cell, ci) => (
                                <td key={ci} className="px-3 py-1.5 text-zinc-300 whitespace-nowrap">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   CODE BLOCK WITH HIGHLIGHTING
   ═══════════════════════════════════════════════════════════════ */
function HighlightedCode({ text, fileName }) {
    const codeRef = useRef(null);
    const ext = getExtension(fileName);
    const lang = EXT_TO_LANG[ext] || null;

    useEffect(() => {
        if (codeRef.current && text) {
            try {
                if (lang) {
                    codeRef.current.innerHTML = hljs.highlight(text, { language: lang }).value;
                } else {
                    codeRef.current.innerHTML = hljs.highlightAuto(text).value;
                }
            } catch {
                codeRef.current.textContent = text;
            }
        }
    }, [text, lang]);

    return (
        <div className="overflow-auto max-h-[70vh] rounded-lg border border-zinc-700/60 bg-zinc-900/90">
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/80 border-b border-zinc-700/60">
                <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                    {lang || ext.replace(".", "") || "plain text"}
                </span>
                <span className="text-[10px] text-zinc-500">
                    {text ? text.split("\n").length : 0} lines
                </span>
            </div>
            <pre className="p-4 text-sm leading-relaxed overflow-x-auto">
                <code ref={codeRef} className="text-zinc-200 font-mono text-[13px]">
                    {text}
                </code>
            </pre>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   FILE PREVIEW MODAL
   ═══════════════════════════════════════════════════════════════ */
const FilePreviewModal = ({ message, onClose }) => {
    if (!message) return null;

    const previewType = getPreviewType(message.file_type, message.file_name);
    const fileUrl = fixCloudinaryUrl(message.file_url, message.file_type);
    const ext = getExtension(message.file_name);

    // Icon based on type
    const TypeIcon = previewType === "code" ? Code2
        : previewType === "csv" ? FileSpreadsheet
            : FileText;

    const handleDownload = () => {
        window.open(fileUrl, "_blank");
    };

    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ─── Header ─── */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-700/60 bg-zinc-900/95 flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                            <TypeIcon className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                                {message.file_name || "File Preview"}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                {message.file_size && <span>{formatFileSize(message.file_size)}</span>}
                                <span className="uppercase">{ext.replace(".", "")}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={handleDownload}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                            title="Download"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Download
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ─── Content ─── */}
                <div className="flex-1 overflow-auto p-5 min-h-0">
                    {/* PDF — iframe */}
                    {previewType === "pdf" && (
                        <iframe
                            src={fileUrl}
                            title={message.file_name}
                            className="w-full h-[75vh] rounded-lg border border-zinc-700/60 bg-white"
                        />
                    )}

                    {/* Image — full size */}
                    {previewType === "image" && (
                        <div className="flex items-center justify-center">
                            <img
                                src={fileUrl}
                                alt={message.file_name}
                                className="max-w-full max-h-[75vh] rounded-lg object-contain"
                            />
                        </div>
                    )}

                    {/* CSV — table */}
                    {previewType === "csv" && message.extracted_text && (
                        <CsvTable text={message.extracted_text} />
                    )}

                    {/* Code / text files — highlighted */}
                    {previewType === "code" && message.extracted_text && (
                        <HighlightedCode text={message.extracted_text} fileName={message.file_name} />
                    )}

                    {/* Markdown — highlighted as markdown */}
                    {previewType === "markdown" && message.extracted_text && (
                        <HighlightedCode text={message.extracted_text} fileName={message.file_name} />
                    )}

                    {/* DOCX / DOC — extracted plain text */}
                    {previewType === "document" && message.extracted_text && (
                        <div className="overflow-auto max-h-[70vh] rounded-lg border border-zinc-700/60 bg-zinc-900/90 p-5">
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
                                <FileText className="w-4 h-4 text-indigo-400" />
                                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    Document Content
                                </span>
                            </div>
                            <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                                {message.extracted_text}
                            </div>
                        </div>
                    )}

                    {/* No extracted text available */}
                    {!message.extracted_text && previewType !== "pdf" && previewType !== "image" && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
                                <Eye className="w-7 h-7 text-zinc-600" />
                            </div>
                            <h3 className="text-base font-semibold text-zinc-300 mb-1">
                                Preview not available
                            </h3>
                            <p className="text-sm text-zinc-500 mb-4 max-w-xs">
                                This file type doesn't support inline preview. You can download it to view.
                            </p>
                            <button
                                onClick={handleDownload}
                                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium flex items-center gap-2 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Download File
                            </button>
                        </div>
                    )}

                    {/* Unknown type with text — show as plain text */}
                    {previewType === "unknown" && message.extracted_text && (
                        <HighlightedCode text={message.extracted_text} fileName={message.file_name} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilePreviewModal;
