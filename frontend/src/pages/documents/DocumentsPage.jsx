import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../../../config";
import { useAuthContext } from "@/context/AuthContextProvider";

const S = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Inter:wght@400;500;600&display=swap');

  .dp-root {
    min-height: 100vh;
    background: black;
    font-family: 'Inter', sans-serif;
    color: #e2e8f0;
    position: relative;
    overflow-x: hidden;
  }

  .dp-root::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noise)" opacity="0.04"/></svg>');
    pointer-events: none;
    z-index: 0;
  }

  .dp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 48px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    position: sticky;
    top: 0;
    z-index: 20;
    background: rgba(9,9,11,0.6);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  }

  .dp-header-left { display: flex; align-items: center; gap: 16px; }

  .dp-icon-wrap {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 24px rgba(99,102,241,0.4);
    flex-shrink: 0;
    position: relative;
  }
  .dp-icon-wrap::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 13px;
    background: linear-gradient(135deg, rgba(255,255,255,0.4), transparent);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }

  .dp-icon-wrap svg { width: 22px; height: 22px; color: #fff; }

  .dp-title { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; line-height: 1.1; }
  .dp-subtitle { font-size: 13px; color: #94a3b8; margin-top: 4px; font-weight: 400; }

  .dp-new-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.1);
    padding: 12px 24px;
    border-radius: 9999px;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: 0 4px 20px rgba(99,102,241,0.4), inset 0 1px 1px rgba(255,255,255,0.2);
    position: relative;
    overflow: hidden;
  }
  .dp-new-btn::before {
    content: '';
    position: absolute; top:0; left:-100%; width:50%; height:100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    transform: skewX(-20deg);
    transition: all 0.5s;
  }
  .dp-new-btn:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 8px 28px rgba(99,102,241,0.6), inset 0 1px 1px rgba(255,255,255,0.3);
  }
  .dp-new-btn:hover::before { left: 200%; }
  .dp-new-btn svg { width: 16px; height: 16px; }

  .dp-stats {
    display: flex;
    gap: 20px;
    padding: 48px 48px 32px;
    flex-wrap: wrap;
    position: relative;
    z-index: 10;
  }

  .dp-stat {
    background: rgba(15,23,42,0.6);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 20px 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 200px;
    flex: 1;
    transition: all 0.3s ease;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    position: relative;
    overflow: hidden;
  }
  .dp-stat:hover {
    transform: translateY(-3px);
    background: rgba(15,23,42,0.8);
    border-color: rgba(255,255,255,0.15);
    box-shadow: 0 10px 30px rgba(0,0,0,0.4);
  }
  .dp-stat::after {
    content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 2px;
    background: var(--stat-color, rgba(255,255,255,0.1));
    opacity: 0.5;
  }

  .dp-stat-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
  .dp-stat-icon svg { width: 24px; height: 24px; }
  .dp-stat-label { font-size: 13px; color: #94a3b8; font-weight: 500; margin-bottom: 4px; }
  .dp-stat-value { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 700; color: #ffffff; line-height: 1; }

  .dp-toolbar { padding: 0 48px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; position: relative; z-index: 20; }

  .dp-delete-btn { display: flex; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; width: 28px; height: 28px; cursor: pointer; transition: all 0.2s; margin-left: auto; }
  .dp-delete-btn:hover { background: rgba(239, 68, 68, 0.2); transform: scale(1.05); }
  .dp-delete-btn svg { width: 14px; height: 14px; }

  .dp-search {
    position: relative;
    flex: 1;
    max-width: 480px;
  }

  .dp-search svg {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    color: #64748b;
    pointer-events: none;
    transition: color 0.3s;
  }

  .dp-search input {
    width: 100%;
    background: rgba(15,23,42,0.5);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 9999px;
    padding: 12px 20px 12px 44px;
    color: #f8fafc;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    outline: none;
    transition: all 0.3s ease;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
  }

  .dp-search input::placeholder { color: #64748b; }
  .dp-search input:focus { 
    background: rgba(15,23,42,0.8);
    border-color: rgba(99,102,241,0.5); 
    box-shadow: 0 0 0 4px rgba(99,102,241,0.15), inset 0 2px 4px rgba(0,0,0,0.2);
  }
  .dp-search input:focus + svg { color: #6366f1; }

  .dp-section { padding: 0 48px 80px; position: relative; z-index: 10; }

  .dp-section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 32px 0 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  .dp-section-label { font-family: 'Outfit', sans-serif; font-size: 20px; color: #f8fafc; font-weight: 500; letter-spacing: -0.2px; }

  .dp-count {
    font-size: 12px;
    font-weight: 600;
    color: #8b5cf6;
    background: rgba(139,92,246,0.15);
    border: 1px solid rgba(139,92,246,0.2);
    padding: 4px 10px;
    border-radius: 9999px;
  }

  .dp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }

  .dp-card {
    background: rgba(15,23,42,0.6);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .dp-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    border-radius: 16px;
    padding: 2px;
    background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  .dp-card:hover { 
    transform: translateY(-6px) scale(1.02); 
    box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.2);
    background: rgba(30,41,59,0.8);
  }
  .dp-card:hover::before { opacity: 1; }

  .dp-card-thumb {
    height: 140px;
    background: linear-gradient(to bottom, rgba(255,255,255,0.02), rgba(0,0,0,0.2));
    padding: 20px;
    overflow: hidden;
    position: relative;
    border-bottom: 1px solid rgba(255,255,255,0.03);
  }
  .dp-card-thumb::after {
    content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 40px;
    background: linear-gradient(to top, rgba(15,23,42,0.8), transparent);
  }

  .dp-card-thumb-line { height: 6px; background: rgba(255,255,255,0.08); border-radius: 9999px; margin-bottom: 10px; }
  .dp-card-thumb-line:nth-child(1) { width: 85%; }
  .dp-card-thumb-line:nth-child(2) { width: 60%; }
  .dp-card-thumb-line:nth-child(3) { width: 95%; }
  .dp-card-thumb-line:nth-child(4) { width: 50%; }
  .dp-card-thumb-line:nth-child(5) { width: 75%; }
  .dp-card-thumb-line:nth-child(6) { width: 45%; }
  .dp-card-thumb-line:nth-child(7) { width: 80%; }

  .dp-card-thumb-text { font-size: 11px; line-height: 1.8; color: #94a3b8; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; position: relative; z-index: 1; }

  .dp-card-body { padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; }
  .dp-card-title { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: 0.2px; }

  .dp-card-meta { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #64748b; flex-wrap: wrap; }
  .dp-card-meta-time { display: flex; align-items: center; gap: 4px; }
  
  .dp-badge { font-family: 'Inter', sans-serif; font-size: 10px; padding: 4px 10px; border-radius: 9999px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .dp-badge-public { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
  .dp-badge-mine { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.3); }

  .dp-empty { grid-column: 1/-1; text-align: center; padding: 100px 20px; }
  .dp-empty-icon { 
    width: 80px; height: 80px; 
    background: rgba(255,255,255,0.03); 
    border: 1px solid rgba(255,255,255,0.08); 
    border-radius: 20px; 
    display: flex; align-items: center; justify-content: center; 
    margin: 0 auto 24px;
    box-shadow: inset 0 2px 10px rgba(255,255,255,0.05);
  }
  .dp-empty-icon svg { width: 36px; height: 36px; color: #64748b; }
  .dp-empty-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 600; color: #f8fafc; margin-bottom: 8px; }
  .dp-empty-sub { font-size: 14px; color: #94a3b8; }

  .dp-loading { display: flex; align-items: center; justify-content: center; height: 300px; gap: 12px; }
  .dp-dot { width: 10px; height: 10px; border-radius: 50%; background: #6366f1; animation: dp-p 1.4s ease-in-out infinite; box-shadow: 0 0 10px #6366f1; }
  .dp-dot:nth-child(2) { animation-delay: 0.2s; background: #a855f7; box-shadow: 0 0 10px #a855f7; }
  .dp-dot:nth-child(3) { animation-delay: 0.4s; background: #ec4899; box-shadow: 0 0 10px #ec4899; }

  @keyframes dp-p {
    0%, 100% { opacity: 0.3; transform: scale(0.6); }
    50% { opacity: 1; transform: scale(1.2); }
  }

  @media (max-width: 768px) {
    .dp-header { padding: 20px; }
    .dp-stats { padding: 20px; gap: 12px; }
    .dp-toolbar { padding: 0 20px 20px; }
    .dp-section { padding: 0 20px 60px; }
    .dp-stat { min-width: calc(50% - 6px); padding: 16px; }
  }
`;

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DocCard({ doc, navigate, isMine, onDelete }) {
  const preview = doc.content ? doc.content.replace(/<[^>]+>/g, "").slice(0, 300) : null;
  
  const getDocTypeIcon = () => {
    switch (doc.doc_type) {
      case "sheet":
        return <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16,flexShrink:0}}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="9" x2="9" y2="21"></line><line x1="15" y1="9" x2="15" y2="21"></line></svg>;
      case "markdown":
        return <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16,flexShrink:0}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="10" y1="13" x2="8" y2="13"></line><line x1="16" y1="13" x2="14" y2="13"></line><line x1="12" y1="11" x2="12" y2="15"></line></svg>;
      default:
        return <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16,flexShrink:0}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
    }
  };

  return (
    <div className="dp-card" onClick={() => navigate(`/documents/${doc._id || doc.id}`)}>
      <div className="dp-card-thumb">
        {doc.doc_type === "sheet" ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, opacity: 0.3 }}>
             {Array.from({length: 16}).map((_, i) => <div key={i} style={{ height: 16, background: '#fff', borderRadius: 2 }} />)}
          </div>
        ) : doc.doc_type === "markdown" ? (
          <div style={{ fontSize: 11, lineHeight: 1.6, color: '#94a3b8', fontFamily: 'monospace', overflow: 'hidden' }}>
            {(doc.content || '').slice(0, 200)}
          </div>
        ) : preview ? (
          <div className="dp-card-thumb-text">{preview}</div>
        ) : (
          [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="dp-card-thumb-line" />)
        )}
      </div>
      <div className="dp-card-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {getDocTypeIcon()}
          <div className="dp-card-title" title={doc.title || "Untitled"}>{doc.title || "Untitled"}</div>
        </div>
        <div className="dp-card-meta">
          <span>{timeAgo(doc.updated_at)}</span>
          {isMine && <><div className="dp-card-dot" /><span className="dp-badge dp-badge-mine">Mine</span></>}
          {doc.is_public && <><div className="dp-card-dot" /><span className="dp-badge dp-badge-public">Public</span></>}

          {isMine && (
            <button className="dp-delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(doc._id || doc.id); }} title="Delete Document">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/documents`, { headers: { Authorization: `Bearer ${token}` } });
      setDocs(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDocs(); }, []);

  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  const createNew = async (doc_type) => {
    setCreateMenuOpen(false);
    let defaultTitle = "Untitled document";
    if (doc_type === "sheet") defaultTitle = "Untitled spreadsheet";
    if (doc_type === "markdown") defaultTitle = "Untitled markdown";

    // Set default content structure depending on type
    let defaultContent = "";
    if (doc_type === "sheet") {
      // 20x10 empty grid
      const grid = Array.from({length: 20}, () => Array(10).fill(""));
      defaultContent = JSON.stringify(grid);
    } else if (doc_type === "markdown") {
      // Default markdown content
      defaultContent = "# New Document\n\nStart writing your markdown here...";
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${BACKEND_URL}/documents`,
        { title: defaultTitle, content: defaultContent, doc_type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/documents/${res.data._id || res.data.id}`);
    } catch (err) { console.error(err); }
  };

  const deleteDoc = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/documents/${docId}`, { headers: { Authorization: `Bearer ${token}` } });
      setDocs((prev) => prev.filter((d) => d._id !== docId && d.id !== docId));
    } catch (err) { console.error(err); }
  };

  const userId = user?._id || user?.id;
  const filtered = docs.filter((d) => !search || d.title?.toLowerCase().includes(search.toLowerCase()));
  const myDocs = filtered.filter((d) => d.my_access === "owner" || String(d.owner?._id || d.owner) === String(userId));
  const otherDocs = filtered.filter((d) => d.my_access !== "owner" && String(d.owner?._id || d.owner) !== String(userId));

  return (
    <div className="dp-root">
      <style>{S}</style>

      <div className="dp-stats">
        {[
          { label: "Total", value: docs.length, color: "#4f8ef7", bg: "rgba(79,142,247,0.12)", icon: <svg viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
          { label: "Mine", value: myDocs.length, color: "#7c3aed", bg: "rgba(124,58,237,0.12)", icon: <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
          { label: "Shared", value: otherDocs.length, color: "#34d399", bg: "rgba(52,211,153,0.12)", icon: <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg> },
          { label: "Public", value: docs.filter((d) => d.is_public).length, color: "#fb923c", bg: "rgba(251,146,60,0.12)", icon: <svg viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg> },
        ].map(({ label, value, bg, icon }) => (
          <div key={label} className="dp-stat">
            <div className="dp-stat-icon" style={{ background: bg }}>{icon}</div>
            <div><div className="dp-stat-label">{label}</div><div className="dp-stat-value">{value}</div></div>
          </div>
        ))}
      </div>

      <div className="dp-toolbar">
        <div className="dp-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ position: 'relative' }}>
          <button className="dp-new-btn" onClick={() => setCreateMenuOpen(prev => !prev)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New
          </button>
          
          {createMenuOpen && (
            <>
              <div 
                style={{ position: 'fixed', inset: 0, zIndex: 100 }} 
                onClick={() => setCreateMenuOpen(false)} 
              />
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: 8, minWidth: 200, zIndex: 101,
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
              }}>
                <button
                  onClick={() => createNew("sheet")}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', background: 'none', border: 'none', color: '#e2e8f0', fontFamily: 'Inter', fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 8, transition: 'background 0.2s', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="9" x2="9" y2="21"></line><line x1="15" y1="9" x2="15" y2="21"></line></svg>
                  </div>
                  Spreadsheet
                </button>
                <button
                  onClick={() => createNew("markdown")}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', background: 'none', border: 'none', color: '#e2e8f0', fontFamily: 'Inter', fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 8, transition: 'background 0.2s', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="10" y1="13" x2="8" y2="13"></line><line x1="16" y1="13" x2="14" y2="13"></line><line x1="12" y1="11" x2="12" y2="15"></line></svg>
                  </div>
                  Markdown
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="dp-section">
        {loading ? (
          <div className="dp-loading"><div className="dp-dot" /><div className="dp-dot" /><div className="dp-dot" /></div>
        ) : (
          <>
            {myDocs.length > 0 && (
              <>
                <div className="dp-section-header">
                  <div className="dp-section-label">My Documents</div>
                  <div className="dp-count">{myDocs.length}</div>
                </div>
                <div className="dp-grid" style={{ marginBottom: 28 }}>
                  {myDocs.map((d) => <DocCard key={d._id} doc={d} navigate={navigate} isMine onDelete={deleteDoc} />)}
                </div>
              </>
            )}
            {otherDocs.length > 0 && (
              <>
                <div className="dp-section-header">
                  <div className="dp-section-label">Shared with me</div>
                  <div className="dp-count">{otherDocs.length}</div>
                </div>
                <div className="dp-grid">
                  {otherDocs.map((d) => <DocCard key={d._id} doc={d} navigate={navigate} onDelete={deleteDoc} />)}
                </div>
              </>
            )}
            {filtered.length === 0 && (
              <div className="dp-grid">
                <div className="dp-empty">
                  <div className="dp-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  </div>
                  <div className="dp-empty-title">{search ? "No documents found" : "No documents yet"}</div>
                  <div className="dp-empty-sub">{search ? "Try a different search term" : "Click New Document to get started"}</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}