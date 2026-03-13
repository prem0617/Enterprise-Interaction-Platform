/**
 * DocumentEditor — self-contained, creates its own socket.
 * Includes a full Share panel: search users, invite with read/write access,
 * manage collaborators, remove them. Read-only users see the doc but cannot type.
 *
 * Route: <Route path="/documents/:id" element={<DocumentEditor />} />
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_URL } from "../../../config";
import { useAuthContext } from "@/context/AuthContextProvider";
import { createSocketConnection } from "../../hooks/useSocket";
import { useDocumentCollaboration } from "../../hooks/useDocumentCollboration";

import SpreadsheetEditor from "./SpreadsheetEditor";
import MarkdownEditor from "./MarkdownEditor";
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Helpers & tiny utils
// ---------------------------------------------------------------------------
function countWords(html) {
  const t = html.replace(/<[^>]+>/g, " ").trim();
  return t ? t.split(/\s+/).filter(Boolean).length : 0;
}
function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}
const PALETTE = ["#4f8ef7", "#7c3aed", "#4e9663ff", "#fb923c", "#f472b6", "#38bdf8"];
function seedColor(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}
function initials(name = "") {
  return name.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}
function fullName(u) {
  if (!u) return "Unknown";
  return `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || "Unknown";
}

// ---------------------------------------------------------------------------
// UserAvatar
// ---------------------------------------------------------------------------
function UserAvatar({ user, size = 32 }) {
  const name = fullName(user);
  if (user?.profile_picture) {
    return <img src={user.profile_picture} alt={name}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: seedColor(name),
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: "#fff", flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SharePanel
// ---------------------------------------------------------------------------
function SharePanel({ docId, isOwner, isPublic, onPublicToggle, onClose, currentUserId, shareToken }) {
  const [collaborators, setCollaborators] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pendingAccess, setPendingAccess] = useState("read");
  const [adding, setAdding] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => {
    axios.get(`${BACKEND_URL}/documents/${docId}/collaborators`, { headers: authHeader() })
      .then(r => setCollaborators(r.data))
      .catch(console.error)
      .finally(() => setLoadingList(false));
  }, [docId]);

  useEffect(() => {
    if (query.trim().length < 2) { setSearchResults([]); setSearching(false); return; }
    clearTimeout(searchTimer.current);
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const r = await axios.get(`${BACKEND_URL}/documents/search-users`, {
          headers: authHeader(), params: { q: query, docId },
        });
        setSearchResults(r.data);
      } catch { /* empty */ }
      finally { setSearching(false); }
    }, 300);
  }, [query, docId]);

  const handleAdd = async () => {
    if (!selectedUser) return;
    setAdding(true);
    try {
      const r = await axios.post(
        `${BACKEND_URL}/documents/${docId}/collaborators`,
        { userId: selectedUser._id, access: pendingAccess },
        { headers: authHeader() }
      );
      setCollaborators(r.data);
      setSelectedUser(null); setQuery(""); setSearchResults([]);
    } catch (err) { console.error(err); }
    finally { setAdding(false); }
  };

  const handleAccessChange = async (uid, access) => {
    try {
      const r = await axios.patch(
        `${BACKEND_URL}/documents/${docId}/collaborators/${uid}`,
        { access }, { headers: authHeader() }
      );
      setCollaborators(r.data);
    } catch (err) { console.error(err); }
  };

  const handleRemove = async (uid) => {
    try {
      const r = await axios.delete(
        `${BACKEND_URL}/documents/${docId}/collaborators/${uid}`,
        { headers: authHeader() }
      );
      setCollaborators(r.data);
    } catch (err) { console.error(err); }
  };

  const ICONS = {
    globe: <svg style={{ width: 16, height: 16, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
    lock: <svg style={{ width: 16, height: 16, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    close: <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    plus: <svg style={{ width: 13, height: 13 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
    trash: <svg style={{ width: 13, height: 13 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" /></svg>,
    eye: <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
    pencil: <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
    search: <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    copy: <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
  };

  const sp = {
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: "60px 20px 20px", backdropFilter: "blur(3px)" },
    panel: { width: "100%", maxWidth: 430, background: "#141622", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 80px)", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,.7)" },
    panelHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,.06)" },
    panelTitle: { fontSize: 15, fontWeight: 600, color: "#f1f5f9" },
    closeBtn: { background: "none", border: "none", color: "#475569", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex" },
    body: { padding: "16px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 },
    sectionLbl: { fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: ".7px", marginBottom: 8 },
    visRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#0d0e14", border: "1px solid rgba(255,255,255,.06)", borderRadius: 10 },
    visLeft: { display: "flex", alignItems: "center", gap: 10, color: "#94a3b8" },
    visLabel: { fontSize: 13, fontWeight: 500, color: "#e2e8f0" },
    visSub: { fontSize: 11, color: "#475569", marginTop: 1 },
    searchWrap: { position: "relative" },
    searchIcon: { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#475569", pointerEvents: "none" },
    searchInput: { width: "100%", background: "#0d0e14", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "9px 12px 9px 34px", color: "#e2e8f0", fontFamily: "Inter,sans-serif", fontSize: 13, outline: "none" },
    results: { background: "#0d0e14", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, marginTop: 6, overflow: "hidden" },
    resultItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,.04)" },
    siInfo: { flex: 1, minWidth: 0 },
    siName: { fontSize: 13, fontWeight: 500, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    siEmail: { fontSize: 11, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    siAdd: { display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#4f8ef7", fontWeight: 500, whiteSpace: "nowrap" },
    accRow: { display: "flex", alignItems: "center", gap: 8, padding: "4px 12px 10px", flexWrap: "wrap" },
    accLabel: { fontSize: 11, color: "#475569" },
    accRadio: { display: "flex", gap: 6 },
    ar: (sel) => ({ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", border: `1px solid ${sel ? "#4f8ef7" : "rgba(255,255,255,.08)"}`, borderRadius: 6, cursor: "pointer", fontSize: 12, color: sel ? "#4f8ef7" : "#94a3b8", background: sel ? "rgba(79,142,247,.1)" : "transparent" }),
    confirmBtn: { display: "flex", alignItems: "center", gap: 5, background: "linear-gradient(135deg,#4f8ef7,#7c3aed)", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 7, fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer", marginLeft: "auto" },
    collabEntry: { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "#0d0e14", border: "1px solid rgba(255,255,255,.06)", borderRadius: 10, marginBottom: 6 },
    ceInfo: { flex: 1, minWidth: 0 },
    ceName: { fontSize: 13, fontWeight: 500, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    ceEmail: { fontSize: 11, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    ceControls: { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 },
    accSelect: { background: "#1a1d2e", border: "1px solid rgba(255,255,255,.08)", borderRadius: 6, color: "#94a3b8", fontFamily: "Inter,sans-serif", fontSize: 11, padding: "4px 7px", cursor: "pointer", outline: "none" },
    removeBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, background: "none", border: "1px solid rgba(255,255,255,.06)", borderRadius: 6, color: "#475569", cursor: "pointer" },
    empty: { textAlign: "center", padding: 20, color: "#334155", fontSize: 13 },
    spinner: { display: "flex", justifyContent: "center", padding: 14, gap: 6 },
  };

  const Toggle = ({ checked, onChange }) => (
    <label style={{ position: "relative", width: 38, height: 21, cursor: "pointer", flexShrink: 0 }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
      <div style={{ position: "absolute", inset: 0, background: checked ? "#4f8ef7" : "#1e2235", borderRadius: 21, border: `1px solid ${checked ? "#4f8ef7" : "rgba(255,255,255,.08)"}`, transition: "background .2s" }} />
      <div style={{ position: "absolute", top: 3, left: checked ? 20 : 3, width: 15, height: 15, background: "#fff", borderRadius: "50%", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.4)" }} />
    </label>
  );

  const Spinner = () => (
    <div style={sp.spinner}>
      {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#4f8ef7", animation: "de-p 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />)}
    </div>
  );

  return (
    <div style={sp.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={sp.panel}>
        <div style={sp.panelHead}>
          <span style={sp.panelTitle}>Share document</span>
          <button style={sp.closeBtn} onClick={onClose}>{ICONS.close}</button>
        </div>

        <div style={sp.body}>

          {/* Public toggle */}
          {isOwner && (
            <div style={sp.visRow}>
              <div style={sp.visLeft}>
                {isPublic ? ICONS.globe : ICONS.lock}
                <div>
                  <div style={sp.visLabel}>{isPublic ? "Public" : "Private"}</div>
                  <div style={sp.visSub}>{isPublic ? "Anyone with the link can view" : "Only invited people"}</div>
                </div>
              </div>
              <Toggle checked={isPublic} onChange={e => onPublicToggle(e.target.checked)} />
            </div>
          )}

          {/* Share Link (Always visible for owners, or you can make it visible for all with read access) */}
          <div style={sp.visRow}>
            <div style={{ ...sp.visLeft, width: '100%', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <div style={sp.visLabel}>Share Link</div>
              <div style={{ display: 'flex', width: '100%', gap: 8, alignItems: 'center' }}>
                <input
                  readOnly
                  value={`${window.location.origin}/documents/share/${shareToken || ""}`}
                  style={{ ...sp.searchInput, flex: 1, padding: "8px 12px", color: "#5f6368", fontSize: 13 }}
                />
                <button
                  style={{ ...sp.confirmBtn, background: "#f8f9fa", color: "#202124", border: "1px solid #e0e0e0", padding: "8px 14px", flexShrink: 0 }}
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/documents/share/${shareToken || ""}`);
                  }}
                  title="Copy link"
                >
                  {ICONS.copy} Copy Link
                </button>
              </div>
            </div>
          </div>

          {/* Invite */}
          {isOwner && (
            <div>
              <div style={sp.sectionLbl}>Invite people</div>
              <div style={sp.searchWrap}>
                <span style={sp.searchIcon}>{ICONS.search}</span>
                <input
                  style={sp.searchInput}
                  placeholder="Search by name or email…"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSelectedUser(null); }}
                />
              </div>

              {/* Dropdown results */}
              {!selectedUser && (searching || searchResults.length > 0 || (query.length >= 2 && !searching)) && (
                <div style={sp.results}>
                  {searching && <Spinner />}
                  {!searching && searchResults.length === 0 && query.length >= 2 && (
                    <div style={sp.empty}>No users found</div>
                  )}
                  {searchResults.map(u => (
                    <div key={u._id} style={sp.resultItem}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8f9fa"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      onClick={() => { setSelectedUser(u); setSearchResults([]); }}>
                      <UserAvatar user={u} size={32} />
                      <div style={sp.siInfo}>
                        <div style={sp.siName}>{fullName(u)}</div>
                        <div style={sp.siEmail}>{u.email}</div>
                      </div>
                      <span style={sp.siAdd}>{ICONS.plus} Add</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected user + access picker */}
              {selectedUser && (
                <div style={sp.results}>
                  <div style={{ ...sp.resultItem, cursor: "default" }}>
                    <UserAvatar user={selectedUser} size={32} />
                    <div style={sp.siInfo}>
                      <div style={sp.siName}>{fullName(selectedUser)}</div>
                      <div style={sp.siEmail}>{selectedUser.email}</div>
                    </div>
                    <button style={sp.closeBtn} onClick={() => { setSelectedUser(null); setQuery(""); }}>
                      {ICONS.close}
                    </button>
                  </div>
                  <div style={sp.accRow}>
                    <span style={sp.accLabel}>Access:</span>
                    <div style={sp.accRadio}>
                      {[{ val: "read", label: "View", icon: ICONS.eye }, { val: "write", label: "Edit", icon: ICONS.pencil }].map(({ val, label, icon }) => (
                        <div key={val} style={sp.ar(pendingAccess === val)} onClick={() => setPendingAccess(val)}>
                          {icon} {label}
                        </div>
                      ))}
                    </div>
                    <button style={{ ...sp.confirmBtn, opacity: adding ? .5 : 1 }} onClick={handleAdd} disabled={adding}>
                      {adding ? "Adding…" : "Invite"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Collaborator list */}
          <div>
            <div style={sp.sectionLbl}>
              People with access{collaborators.length > 0 ? ` (${collaborators.length})` : ""}
            </div>
            {loadingList && <Spinner />}
            {!loadingList && collaborators.length === 0 && (
              <div style={sp.empty}>No collaborators yet{isOwner ? " — invite someone above." : "."}</div>
            )}
            {collaborators.map(c => {
              const u = c.user;
              const uid = String(u?._id ?? u);
              const isSelf = uid === String(currentUserId);
              return (
                <div key={uid} style={sp.collabEntry}>
                  <UserAvatar user={u} size={32} />
                  <div style={sp.ceInfo}>
                    <div style={sp.ceName}>{fullName(u)}{isSelf ? " (you)" : ""}</div>
                    <div style={sp.ceEmail}>{u?.email}</div>
                  </div>
                  <div style={sp.ceControls}>
                    <select
                      style={{ ...sp.accSelect, opacity: isOwner ? 1 : .5 }}
                      value={c.access}
                      disabled={!isOwner}
                      onChange={e => handleAccessChange(uid, e.target.value)}
                    >
                      <option value="read">View</option>
                      <option value="write">Edit</option>
                    </select>
                    {(isOwner || isSelf) && (
                      <button
                        style={sp.removeBtn}
                        title={isSelf && !isOwner ? "Leave" : "Remove"}
                        onClick={() => handleRemove(uid)}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(234,67,53,.08)"; e.currentTarget.style.color = "#d93025"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#5f6368"; }}
                      >
                        {ICONS.trash}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div >
  );
}

// ---------------------------------------------------------------------------
// DocumentEditor (main)
// ---------------------------------------------------------------------------
const S = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400&display=swap');
  * { box-sizing: border-box; }

  /* Root */
  .de-root { min-height:100vh; background:#0f1117; font-family:'Inter',sans-serif; display:flex; flex-direction:column; color:#e2e8f0; }

  /* Header */
  .de-menubar { display:flex; align-items:center; padding:0 16px; height:56px; background:#131720; border-bottom:1px solid rgba(255,255,255,.08); position:sticky; top:0; z-index:40; backdrop-filter:blur(12px); gap:12px; }
  .de-back-btn { display:flex; align-items:center; gap:6px; background:none; border:none; color:#94a3b8; font-size:13px; font-family:'Inter',sans-serif; cursor:pointer; padding:7px 11px; border-radius:8px; transition:all .15s; white-space:nowrap; flex-shrink:0; }
  .de-back-btn:hover { background:#1e2535; color:#e2e8f0; }
  .de-back-btn svg { width:15px; height:15px; }
  .de-menu-sep { width:1px; height:22px; background:rgba(255,255,255,.1); flex-shrink:0; }
  .de-title-wrap { flex:1; min-width:0; }
  .de-title-input { background:none; border:none; outline:none; font-family:'Inter',sans-serif; font-size:15px; font-weight:600; color:#f8fafc; min-width:80px; max-width:360px; padding:5px 8px; border-radius:7px; transition:background .15s; letter-spacing:-.2px; }
  .de-title-input:hover:not(:disabled) { background:rgba(255,255,255,.06); }
  .de-title-input:focus { background:rgba(255,255,255,.08); box-shadow:0 1px 0 #60a5fa; }
  .de-title-input:disabled { color:#64748b; cursor:default; }
  .de-title-input::placeholder { color:#475569; }
  .de-menubar-right { display:flex; align-items:center; gap:10px; margin-left:auto; flex-shrink:0; }
  .de-share-btn { display:flex; align-items:center; gap:7px; background:#1d4ed8; border:none; color:#fff; padding:7px 16px; border-radius:8px; font-family:'Inter',sans-serif; font-size:13px; font-weight:600; cursor:pointer; transition:background .2s; white-space:nowrap; box-shadow:0 1px 8px rgba(29,78,216,.4); }
  .de-share-btn:hover { background:#2563eb; }
  .de-share-btn svg { width:15px; height:15px; }
  .de-avatars { display:flex; align-items:center; }
  .de-avatar { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#fff; border:2px solid #131720; margin-left:-7px; flex-shrink:0; position:relative; cursor:default; transition:transform .15s; }
  .de-avatar:first-child { margin-left:0; }
  .de-avatar:hover { transform:translateY(-2px); z-index:5; }
  .de-avatar-tip { position:absolute; top:36px; left:50%; transform:translateX(-50%); background:#1e293b; border:1px solid rgba(255,255,255,.12); border-radius:6px; padding:4px 10px; font-size:11px; white-space:nowrap; pointer-events:none; opacity:0; transition:opacity .15s; z-index:100; color:#e2e8f0; }
  .de-avatar:hover .de-avatar-tip { opacity:1; }
  .de-save-status { display:flex; align-items:center; gap:6px; font-size:12px; color:#94a3b8; white-space:nowrap; }
  .de-status-dot { width:6px; height:6px; border-radius:50%; background:#334155; transition:background .3s; }
  .de-status-dot.saving { background:#60a5fa; animation:de-blink .8s ease-in-out infinite; }
  .de-status-dot.saved  { background:#34d399; }
  @keyframes de-blink { 0%,100%{opacity:1} 50%{opacity:.3} }
  .de-save-btn { display:flex; align-items:center; gap:6px; background:linear-gradient(135deg,#3b82f6,#7c3aed); color:#fff; border:none; padding:7px 16px; border-radius:8px; font-family:'Inter',sans-serif; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; white-space:nowrap; box-shadow:0 2px 12px rgba(59,130,246,.3); }
  .de-save-btn:hover { transform:translateY(-1px); box-shadow:0 4px 18px rgba(59,130,246,.45); }
  .de-save-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }

  /* Banners */
  .de-readonly-banner { padding:8px 20px; background:rgba(251,146,60,.1); border-bottom:1px solid rgba(251,146,60,.25); display:flex; align-items:center; gap:8px; font-size:12px; color:#fdba74; }
  .de-readonly-banner svg { width:13px; height:13px; flex-shrink:0; }
  .de-collab-banner { padding:6px 20px; background:rgba(96,165,250,.1); border-bottom:1px solid rgba(96,165,250,.2); display:flex; align-items:center; gap:8px; font-size:12px; color:#93c5fd; }
  .de-collab-banner svg { width:13px; height:13px; flex-shrink:0; }
  .de-typing-bar { min-height:24px; display:flex; align-items:center; gap:6px; padding:0 20px; font-size:11px; color:#64748b; background:#0f1117; border-bottom:1px solid rgba(255,255,255,.05); }
  .de-typing-dots { display:flex; gap:3px; align-items:center; }
  .de-typing-dot { width:4px; height:4px; border-radius:50%; animation:de-td 1.2s ease-in-out infinite; }
  .de-typing-dot:nth-child(2){animation-delay:.15s} .de-typing-dot:nth-child(3){animation-delay:.3s}
  @keyframes de-td { 0%,100%{opacity:.3;transform:translateY(0)} 50%{opacity:1;transform:translateY(-2px)} }

  /* Toolbar */
  .de-toolbar { display:flex; align-items:center; gap:0; padding:5px 14px; background:#161b27; border-bottom:1px solid rgba(255,255,255,.07); flex-wrap:wrap; position:relative; z-index:38; }
  .de-tb-group { display:flex; align-items:center; gap:1px; padding:0 5px; border-right:1px solid rgba(255,255,255,.07); }
  .de-tb-group:last-child { border-right:none; }
  .de-tb-btn { display:flex; align-items:center; justify-content:center; min-width:30px; height:30px; padding:0 5px; background:none; border:none; border-radius:6px; color:#94a3b8; cursor:pointer; transition:all .15s; font-size:13px; font-family:'Inter',sans-serif; font-weight:600; }
  .de-tb-btn svg { width:15px; height:15px; stroke-width:2; }
  .de-tb-btn:hover:not(:disabled) { background:#1e2535; color:#e2e8f0; }
  .de-tb-btn:disabled { opacity:.25; cursor:not-allowed; }
  .de-tb-select { background:#1a2032; border:1px solid rgba(255,255,255,.1); border-radius:6px; color:#cbd5e1; font-family:'Inter',sans-serif; font-size:12px; padding:4px 8px; cursor:pointer; outline:none; transition:all .15s; }
  .de-tb-select:hover:not(:disabled) { border-color:#60a5fa; color:#e2e8f0; }
  .de-tb-select:focus { border-color:#60a5fa; color:#e2e8f0; outline:none; }
  .de-tb-select:disabled { opacity:.25; cursor:not-allowed; }
  .de-tb-select option { background:#1a2032; color:#e2e8f0; }
  .de-color-wrap { width:30px; height:30px; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:2px; border-radius:6px; cursor:pointer; transition:background .15s; }
  .de-color-wrap:hover { background:#1e2535; }
  .de-color-swatch { width:16px; height:4px; border-radius:2px; pointer-events:none; }

  /* Page area */
  .de-page-area { flex:1; background:#0c0e15; padding:24px 16px 60px; overflow-y:auto; display:flex; justify-content:center; align-items:flex-start; }
  .de-page { width:100%; max-width:816px; min-height:1056px; background:#fff; border-radius:8px; box-shadow:0 8px 48px rgba(0,0,0,.8),0 2px 16px rgba(0,0,0,.5); padding:64px 96px 100px; }
  @media(max-width:900px){ .de-page{padding:48px 48px 80px} }
  @media(max-width:600px){ .de-page{padding:32px 24px 60px} }
  .de-editor { min-height:900px; outline:none; font-family:'Inter',sans-serif; font-size:15px; line-height:1.85; color:#1e293b; caret-color:#3b82f6; }
  .de-editor:empty::before { content:'Start typing your document…'; color:#94a3b8; pointer-events:none; }
  .de-editor ul { list-style-type:disc !important; padding-left:24px; margin:8px 0 12px; }
  .de-editor ol { list-style-type:decimal !important; padding-left:24px; margin:8px 0 12px; }
  .de-editor li { margin-bottom:5px; display:list-item !important; }
  .de-editor h1{font-size:30px;font-weight:700;color:#0f172a;line-height:1.2;margin:0 0 18px;letter-spacing:-.5px}
  .de-editor h2{font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;margin:24px 0 12px}
  .de-editor h3{font-size:17px;font-weight:600;color:#334155;margin:20px 0 8px}
  .de-editor p{margin:0 0 12px}
  .de-editor blockquote{margin:18px 0;padding:14px 20px;border-left:3px solid #3b82f6;background:rgba(59,130,246,.06);color:#334155;font-style:italic;border-radius:0 8px 8px 0}
  .de-editor code{font-family:'JetBrains Mono',monospace;font-size:13px;background:#f1f5f9;padding:1px 5px;border-radius:4px;color:#7c3aed}
  .de-editor a{color:#2563eb;text-decoration:underline}
  .de-editor hr{border:none;border-top:1px solid #e2e8f0;margin:24px 0}
  .de-editor table{border-collapse:collapse;width:100%;margin:12px 0}
  .de-editor th,.de-editor td{border:1px solid #e2e8f0;padding:8px 12px;text-align:left}
  .de-editor th{background:#f8fafc;font-weight:600}
  .de-editor img{max-width:100%;height:auto;border-radius:6px;margin:12px 0;display:block}
  .de-editor sub{vertical-align:sub;font-size:smaller}
  .de-editor sup{vertical-align:super;font-size:smaller}

  /* Find bar */
  .de-find-bar{display:flex;align-items:center;gap:6px;padding:6px 14px;background:#161b27;border-bottom:1px solid rgba(255,255,255,.07)}
  .de-find-input{background:#0d0e14;border:1px solid rgba(255,255,255,.1);border-radius:6px;color:#e2e8f0;font-family:'Inter',sans-serif;font-size:12px;padding:5px 10px;outline:none;width:180px}
  .de-find-input:focus{border-color:#60a5fa}
  .de-find-input::placeholder{color:#475569}
  .de-find-btn{display:flex;align-items:center;justify-content:center;background:none;border:none;color:#94a3b8;cursor:pointer;padding:4px 8px;border-radius:6px;font-size:12px;font-family:'Inter',sans-serif;transition:all .15s}
  .de-find-btn:hover{background:#1e2535;color:#e2e8f0}
  .de-find-close{display:flex;align-items:center;justify-content:center;width:24px;height:24px;background:none;border:none;color:#475569;cursor:pointer;border-radius:6px}
  .de-find-close:hover{background:#1e2535;color:#e2e8f0}

  /* Footer */
  .de-footer{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);background:#161b27;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:6px 18px;font-size:12px;color:#94a3b8;backdrop-filter:blur(12px);z-index:10;display:flex;align-items:center;gap:14px;box-shadow:0 4px 20px rgba(0,0,0,.5)}
  .de-footer-sep{width:1px;height:12px;background:rgba(255,255,255,.1)}

  /* Loading */
  .de-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#0f1117;gap:16px}
  .de-loading-text{font-family:'Inter',sans-serif;font-size:14px;color:#64748b}
  .de-ld{width:8px;height:8px;border-radius:50%;animation:de-p 1.2s ease-in-out infinite}
  .de-ld:nth-child(1){background:#3b82f6} .de-ld:nth-child(2){background:#7c3aed;animation-delay:.2s} .de-ld:nth-child(3){background:#06b6d4;animation-delay:.4s}
  @keyframes de-p{0%,100%{opacity:.2;transform:scale(.7)} 50%{opacity:1;transform:scale(1)}}

  /* Print */
  @media print {
    .de-menubar,.de-toolbar,.de-footer,.de-collab-banner,.de-readonly-banner,.de-typing-bar{display:none !important;}
    .de-page-area{background:white !important;padding:0 !important;}
    .de-page{box-shadow:none !important;padding:0 !important;}
  }
`;

const Ic = {
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>,
  bold: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>,
  italic: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>,
  under: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" /><line x1="4" y1="21" x2="20" y2="21" /></svg>,
  strike: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.3 4.9c-2.3-.6-4.4-1-6.2-.9-2.7 0-5.3.7-5.3 3.6 0 1.5 1.8 3.3 3.6 3.6h1" /><path d="M7.7 19.1c2.3.6 4.4 1 6.2.9 2.7 0 5.3-.7 5.3-3.6 0-1.5-1.7-3.1-3.6-3.6H10" /><path d="M5 12h14" /></svg>,
  link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  ul: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>,
  ol: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></svg>,
  aL: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6" /><line x1="15" y1="12" x2="3" y2="12" /><line x1="17" y1="18" x2="3" y2="18" /></svg>,
  aC: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6" /><line x1="18" y1="12" x2="6" y2="12" /><line x1="21" y1="18" x2="3" y2="18" /></svg>,
  aR: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="12" x2="9" y2="12" /><line x1="21" y1="18" x2="7" y2="18" /></svg>,
  quote: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" /></svg>,
  undo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>,
  redo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 14 20 9 15 4" /><path d="M4 20v-7a4 4 0 0 1 4-4h12" /></svg>,
  doc: <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#4285f4" /><polyline points="14 2 14 8 20 8" fill="#a8c7fa" /><line x1="8" y1="13" x2="16" y2="13" stroke="white" strokeWidth="1.5" /><line x1="8" y1="17" x2="16" y2="17" stroke="white" strokeWidth="1.5" /></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  share: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>,
  warn: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  print: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>,
  table: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /></svg>,
  image: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  indent: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="11" y2="6" /><line x1="21" y1="12" x2="11" y2="12" /><line x1="21" y1="18" x2="11" y2="18" /><polyline points="4 8 8 12 4 16" /></svg>,
  outdent: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="11" y2="6" /><line x1="21" y1="12" x2="11" y2="12" /><line x1="21" y1="18" x2="11" y2="18" /><polyline points="8 8 4 12 8 16" /></svg>,
  highlight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>,
  superscript: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19l8-8" /><path d="M12 19l-8-8" /><path d="M20 9h-4c0-1.5.44-2 1.5-2.5S20 5.33 20 4c0-.47-.17-.93-.48-1.29a2.11 2.11 0 0 0-2.62-.44c-.42.24-.74.62-.9 1.07" /></svg>,
  subscript: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16l8-8" /><path d="M12 16l-8-8" /><path d="M20 19h-4c0-1.5.44-2 1.5-2.5S20 15.33 20 14c0-.47-.17-.93-.48-1.29a2.11 2.11 0 0 0-2.62-.44c-.42.24-.74.62-.9 1.07" /></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  find: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  chatbot: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.938 15.525a2 2 0 0 0-1.463-1.463l-5.63-1.455a.5.5 0 0 1 0-.964l5.63-1.455a2 2 0 0 0 1.463-1.463l1.454-5.63a.5.5 0 0 1 .964 0l1.455 5.63a2 2 0 0 0 1.463 1.463l5.63 1.455a.5.5 0 0 1 0 .964l-5.63 1.455a2 2 0 0 0-1.463 1.463l-1.455 5.63a.5.5 0 0 1-.964 0l-1.454-5.63z" /></svg>,
  send: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
};

export default function CommonEditor() {
  const { id, token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const userName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email : "Anonymous";
  const currentUserId = user?._id || user?.id;

  // Socket — created here, lives for the lifetime of this page
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!currentUserId) return;
    const s = createSocketConnection(currentUserId);
    socketRef.current = s;
    setSocket(s);
    return () => { socketRef.current?.disconnect(); socketRef.current = null; };
  }, [currentUserId]);

  const [doc, setDoc] = useState(null);
  const [myAccess, setMyAccess] = useState("read");

  const docIdForSocket = id || (doc ? doc._id : null);

  const { collaborators, typingUsers, registerRemoteUpdateHandler, registerRemoteTitleUpdateHandler, registerRemoteSlideUpdateHandler, broadcastUpdate, broadcastTitleUpdate, broadcastSlideUpdate, broadcastTyping } =
    useDocumentCollaboration(socket, docIdForSocket, currentUserId, userName);


  const [saveStatus, setSaveStatus] = useState("idle");
  const [showShare, setShowShare] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const saveTimerRef = useRef(null);
  const fullSaveTimerRef = useRef(null);
  const [remotePatch, setRemotePatch] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const [askAIPopover, setAskAIPopover] = useState({ show: false, x: 0, y: 0, text: "" });


  const isReadOnly = myAccess === "read";
  const isOwner = myAccess === "owner";
  const tb = isReadOnly;

  useEffect(() => {
    // Determine which URL to call based on the route match
    if (token) {
      axios.get(`${BACKEND_URL}/documents/share/${token}`) // No auth required for public link
        .then(res => { setDoc(res.data); setMyAccess(res.data.my_access ?? "read"); })
        .catch(err => {
          console.error(err);
          setErrorMsg(err.response?.data?.error || "Invalid or private share link");
        });
    } else if (id) {
      axios.get(`${BACKEND_URL}/documents/${id}`, { headers: authHeader() })
        .then(res => { setDoc(res.data); setMyAccess(res.data.my_access ?? "read"); })
        .catch(err => {
          console.error(err);
          setErrorMsg(err.response?.data?.error || "Failed to load document");
        });
    }
  }, [id, token]);

  useEffect(() => {
    // For doc_type "doc", the DocumentEditor component will handle content initialization.
    // For other types, this effect is still relevant if they don't use a dedicated component.
    if (doc?.doc_type === "sheet" || doc?.doc_type === "slide") return;
    // The original logic for doc_type "doc" is now moved into the DocumentEditor component.
    // This useEffect will no longer directly manipulate editorRef.current for "doc" type.
  }, [doc]);

  useEffect(() => {
    registerRemoteSlideUpdateHandler(({ patch }) => {
      setRemotePatch({ ...patch, _ts: Date.now(), _rand: Math.random() });
    });
  }, [registerRemoteSlideUpdateHandler]);

  // Handle generic full-text string updates for DocumentEditor and SpreadsheetEditor
  useEffect(() => {
    registerRemoteUpdateHandler(({ content, isFullState }) => {
      if (doc?.doc_type === "sheet" || doc?.doc_type === "doc") {
        setDoc(prev => ({ ...prev, content }));
        return;
      }
      if (doc?.doc_type === "slide") {
        setDoc(prev => ({ ...prev, content }));
        if (isFullState) {
          try {
            const p = JSON.parse(content);
            if (p.slides) {
              setRemotePatch({ type: "SYNC_ALL", sourceSlides: p.slides, _ts: Date.now(), _rand: Math.random() });
            }
          } catch { }
        }
        return;
      }
    });
  }, [registerRemoteUpdateHandler, doc?.doc_type]);

  useEffect(() => {
    registerRemoteTitleUpdateHandler(({ title }) => {
      setDoc(d => d ? { ...d, title } : d);
    });
  }, [registerRemoteTitleUpdateHandler]);

  /* Listen for slide theme updates from collaborators */
  useEffect(() => {
    if (!socket || !docIdForSocket) return;
    const handler = ({ theme }) => {
      if (theme) setDoc(d => d ? { ...d, slide_theme: theme } : d);
    };
    socket.on("doc-theme-update", handler);
    return () => socket.off("doc-theme-update", handler);
  }, [socket, docIdForSocket]);

  const save = useCallback(async (contentToSave, overrideTitle) => {
    if (isReadOnly) return;
    setSaveStatus("saving");
    try {
      const finalContent = contentToSave;
      const finalTitle = typeof overrideTitle === "string" ? overrideTitle : doc?.title;
      await axios.put(`${BACKEND_URL}/documents/${id}`, { content: finalContent, title: finalTitle }, { headers: authHeader() });
      setSaveStatus("saved");
    } catch (err) { console.error(err); setSaveStatus("idle"); }
  }, [id, doc?.title, isReadOnly]);

  const handleContentChange = useCallback((newContent) => {
    if (isReadOnly) return;
    setDoc(d => ({ ...d, content: newContent }));
    setSaveStatus("Unsaved changes");
    broadcastUpdate(newContent);
    broadcastTyping();

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      save(newContent);
    }, 1500);
  }, [broadcastUpdate, broadcastTyping, isReadOnly, save]);

  useEffect(() => {
    const onKey = e => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); save(doc?.content); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, doc?.content]);

  const handlePublicToggle = async val => {
    try {
      await axios.put(`${BACKEND_URL}/documents/${id}`, { is_public: val }, { headers: authHeader() });
      setDoc(d => ({ ...d, is_public: val }));
    } catch (err) { console.error(err); }
  };

  const handleSelection = useCallback((selection, editorRef) => {
    if (!selection || selection.isCollapsed || !editorRef.current) {
      setAskAIPopover({ show: false, x: 0, y: 0, text: "" });
      return;
    }

    if (!editorRef.current.contains(selection.anchorNode)) {
      setAskAIPopover({ show: false, x: 0, y: 0, text: "" });
      return;
    }

    const text = selection.toString().trim();
    if (text.length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setAskAIPopover({
        show: true,
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
        text
      });
    } else {
      setAskAIPopover({ show: false, x: 0, y: 0, text: "" });
    }
  }, []);

  const askQuestion = async (directQuestion = null) => {
    const q = typeof directQuestion === "string" ? directQuestion : chatInput;
    if (!q.trim() || chatLoading || !id) return;
    if (typeof directQuestion !== "string") setChatInput("");
    setShowChat(true);
    setChatMessages(prev => [...prev, { role: "user", content: q }]);
    setChatLoading(true);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/ai/documents/${id}/qa`,
        { question: q },
        { headers: authHeader() }
      );
      setChatMessages(prev => [...prev, { role: "assistant", content: res.data.answer }]);
    } catch { // ignore error type internally
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process your question. Please try again." }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  const handleAskAI = (selText) => {
    setAskAIPopover({ show: false, x: 0, y: 0, text: "" });
    askQuestion(`Explain this from the document:\n"${selText}"`);
  };

  if (errorMsg) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#0f172a", fontFamily: "sans-serif" }}>
      <div style={{ padding: "40px", backgroundColor: "#1e293b", borderRadius: "12px", textAlign: "center", border: "1px solid #334155", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 48, height: 48, color: "#ef4444", margin: "0 auto 16px" }}>
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h2 style={{ margin: "0 0 8px 0", color: "#f8fafc", fontSize: "20px" }}>Cannot access document</h2>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>{errorMsg}</p>
        <button
          onClick={() => navigate('/')}
          style={{ marginTop: "24px", padding: "8px 16px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );

  if (!doc) return (
    <div className="de-loading">
      <style>{S}</style>
      <div style={{ display: "flex", gap: 8 }}>
        <div className="de-ld" /><div className="de-ld" /><div className="de-ld" /><div className="de-ld" />
      </div>
      <div className="de-loading-text">Loading document…</div>
    </div>
  );

  return (
    <div className="de-root">
      <style>{S}</style>

      {/* Menubar */}
      <div className="de-menubar">
        <button className="de-back-btn" onClick={() => {
          if (user?.user_type === "admin" || user?.has_admin_role) {
            navigate("/adminDashboard?tab=documents");
          } else {
            navigate("/dashboard?tab=files");
          }
        }}>{Ic.back}</button>
        {/* Dynamic Logo Based on Doc Type */}
        <div className={"flex items-center justify-center w-8 h-8 rounded-lg shadow-lg flex-shrink-0 " + (doc.doc_type === "sheet" ? "bg-gradient-to-br from-green-600 to-emerald-600 shadow-green-600/30" : "bg-gradient-to-br from-purple-600 to-violet-600 shadow-purple-600/30")}>
          {doc.doc_type === "sheet" ? (
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="white" fillOpacity="0.95" />
              <rect x="6" y="8" width="12" height="12" fill="rgba(255,255,255,0.2)" />
              <line x1="6" y1="12" x2="18" y2="12" stroke="white" strokeWidth="1" />
              <line x1="6" y1="16" x2="18" y2="16" stroke="white" strokeWidth="1" />
              <line x1="12" y1="8" x2="12" y2="20" stroke="white" strokeWidth="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="white" fillOpacity="0.95" />
              <polyline points="14 2 14 8 20 8" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none" />
              <line x1="10" y1="13" x2="8" y2="13" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
              <line x1="16" y1="13" x2="14" y2="13" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
              <line x1="12" y1="11" x2="12" y2="15" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
            </svg>
          )}
        </div>
        <div className="de-title-wrap">
          <input className="de-title-input" value={doc.title || ""} disabled={isReadOnly}
            onChange={e => {
              const newTitle = e.target.value;
              setDoc({ ...doc, title: newTitle });
              broadcastTitleUpdate(newTitle);
              setSaveStatus("Unsaved changes");
              if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
              saveTimerRef.current = setTimeout(() => save(newTitle), 1500);
            }} placeholder="Untitled document" />
        </div>
        <div className="de-menubar-right">
          {collaborators.length > 0 && (
            <div className="de-avatars">
              {collaborators.slice(0, 5).map(c => (
                <div key={c.userId} className="de-avatar" style={{ background: c.color || seedColor(c.name) }}>
                  {initials(c.name)}
                  <div className="de-avatar-tip">{c.name}</div>
                </div>
              ))}
              {collaborators.length > 5 && (
                <div className="de-avatar" style={{ background: "#334155" }}>
                  +{collaborators.length - 5}
                  <div className="de-avatar-tip">{collaborators.length - 5} more</div>
                </div>
              )}
            </div>
          )}
          <button
            className="de-share-btn"
            onClick={() => setShowShare(true)}
            style={{
              background: doc?.doc_type === "sheet" ? "#325c39ff" : "#7c3aed",
              boxShadow: doc?.doc_type === "sheet" ? "0 1px 8px #1c4823ff" : "0 1px 8px rgba(124,58,237,.4)"
            }}
          >
            {Ic.share} Share
          </button>
          <button
            title="AI Document Assistant"
            onClick={() => setShowChat(c => !c)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#ffffff",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 600,
              background: showChat ? "#334155" : "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
              border: "1px solid",
              borderColor: showChat ? "#475569" : "#334155",
              boxShadow: showChat ? "none" : "0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseOver={e => {
              if (!showChat) {
                e.currentTarget.style.background = "linear-gradient(180deg, #334155 0%, #1e293b 100%)";
                e.currentTarget.style.borderColor = "#475569";
              }
            }}
            onMouseOut={e => {
              if (!showChat) {
                e.currentTarget.style.background = "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)";
                e.currentTarget.style.borderColor = "#334155";
              }
            }}
          >
            <div style={{ width: 16, height: 16 }}>{Ic.chatbot}</div> Ask AI
          </button>
        </div>
      </div>

      {/* Read-only warning */}
      {
        isReadOnly && (
          <div className="de-readonly-banner">
            {Ic.warn}
            <span>You have <strong>view-only</strong> access. Contact the owner to request edit permissions.</span>
          </div>
        )
      }

      {
        doc.doc_type === "sheet" ? (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <SpreadsheetEditor
              content={doc.content}
              isReadOnly={isReadOnly}
              onContentChange={(newContent) => {
                setDoc(d => ({ ...d, content: newContent }));
                setSaveStatus("Unsaved changes");
                broadcastUpdate(newContent);
                broadcastTyping();
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                // Wait a bit longer for sheets to avoid saving mid-stroke
                saveTimerRef.current = setTimeout(() => {
                  axios.put(`${BACKEND_URL}/documents/${id}`, { content: newContent }, { headers: authHeader() })
                    .then(() => setSaveStatus("saved"))
                    .catch(err => { console.error(err); setSaveStatus("idle"); });
                }, 2000);
              }}
            />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <MarkdownEditor
              content={doc.content}
              isReadOnly={isReadOnly}
              onContentChange={(newContent) => {
                setDoc(d => ({ ...d, content: newContent }));
                setSaveStatus("Unsaved changes");
                broadcastUpdate(newContent);
                broadcastTyping();
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                saveTimerRef.current = setTimeout(() => {
                  axios.put(`${BACKEND_URL}/documents/${id}`, { content: newContent }, { headers: authHeader() })
                    .then(() => setSaveStatus("saved"))
                    .catch(err => { console.error(err); setSaveStatus("idle"); });
                }, 1500);
              }}
            />
          </div>
        )
      }

      {/* Footer */}
      <div className="de-footer">
        {collaborators.length > 0 && (
          <><div className="de-footer-sep" /><span style={{ color: "#60a5fa" }}>{collaborators.length + 1} online</span></>
        )}
        <div className="de-footer-sep" />
        {isReadOnly
          ? <span style={{ color: "#f59e0b", marginLeft: "auto" }}>View only</span>
          : <span style={{ color: saveStatus === "Unsaved changes" ? "#fbbf24" : saveStatus === "saving" ? "#60a5fa" : "#34d399", marginLeft: "auto" }}>
            {saveStatus === "Unsaved changes" ? "Unsaved changes" : saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "All changes saved" : "Saved"}
          </span>
        }
      </div>

      {/* Share panel */}
      {
        showShare && (
          <SharePanel
            docId={id}
            isOwner={isOwner}
            isPublic={!!doc.is_public}
            onPublicToggle={handlePublicToggle}
            onClose={() => setShowShare(false)}
            currentUserId={currentUserId}
          />
        )
      }

      {/* ── Chat Assistant Panel ── */}
      {showChat && (
        <div style={{
          position: "fixed", right: 24, bottom: 80, width: 380, height: 520,
          background: "#0b0f19", border: "1px solid #1e293b",
          borderRadius: "16px", display: "flex", flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.05)", zIndex: 100,
          overflow: "hidden", fontFamily: "Inter, sans-serif"
        }}>
          {/* Header */}
          <div style={{
            padding: "16px 20px", background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: "1px solid #1e293b"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#f8fafc", fontWeight: 600, fontSize: 14 }}>
              <div style={{ width: 18, height: 18 }}>{Ic.chatbot}</div> AI Assistant
            </div>
            <button
              onClick={() => setShowChat(false)}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", transition: "color 0.2s" }}
              onMouseOver={e => e.currentTarget.style.color = "#f8fafc"}
              onMouseOut={e => e.currentTarget.style.color = "#94a3b8"}
            >
              <div style={{ width: 18, height: 18 }}>{Ic.close}</div>
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16, background: "#0b0f19" }}>
            {chatMessages.length === 0 && (
              <div style={{ color: "#64748b", fontSize: 13, textAlign: "center", margin: "auto", padding: 20 }}>
                <div style={{ width: 32, height: 32, margin: "0 auto 12px", opacity: 0.5 }}>{Ic.chatbot}</div>
                How can I help you with this document?
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                background: msg.role === "user" ? "linear-gradient(180deg, #334155 0%, #1e293b 100%)" : "transparent",
                border: msg.role === "user" ? "1px solid #475569" : "none",
                color: "#f8fafc",
                padding: msg.role === "user" ? "10px 14px" : "4px 8px",
                borderRadius: "12px",
                maxWidth: "85%",
                fontSize: 13, lineHeight: 1.6,
                borderBottomRightRadius: msg.role === "user" ? 4 : 12,
                borderBottomLeftRadius: msg.role === "assistant" ? 4 : 12,
                whiteSpace: "pre-wrap",
                display: "flex",
                gap: 12,
                alignItems: "flex-start"
              }}>
                {msg.role === "assistant" && (
                  <div style={{ width: 24, height: 24, color: "#94a3b8", flexShrink: 0, marginTop: 2 }}>{Ic.chatbot}</div>
                )}
                <div>{msg.content}</div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ alignSelf: "flex-start", color: "#64748b", padding: "4px 8px", fontSize: 13, display: "flex", gap: 12 }}>
                <div style={{ width: 24, height: 24, color: "#64748b", flexShrink: 0 }}>{Ic.chatbot}</div>
                <div style={{ marginTop: 2 }}>Thinking...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "16px", background: "#0f172a", borderTop: "1px solid #1e293b", display: "flex", gap: 8, alignItems: "center" }}>
            <input
              style={{
                flex: 1, background: "#1e293b", border: "1px solid #334155",
                color: "#f8fafc", padding: "10px 16px", borderRadius: "100px", fontSize: 13, outline: "none",
                fontFamily: "Inter, sans-serif", transition: "border-color 0.2s"
              }}
              placeholder="Ask a question..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") askQuestion(); }}
              disabled={chatLoading}
              onFocus={e => e.currentTarget.style.borderColor = "#475569"}
              onBlur={e => e.currentTarget.style.borderColor = "#334155"}
            />
            <button
              onClick={() => askQuestion()}
              disabled={!chatInput.trim() || chatLoading}
              style={{
                background: chatInput.trim() && !chatLoading ? "linear-gradient(180deg, #334155 0%, #1e293b 100%)" : "#1e293b",
                color: chatInput.trim() && !chatLoading ? "#ffffff" : "#64748b",
                border: "1px solid",
                borderColor: chatInput.trim() && !chatLoading ? "#475569" : "#334155",
                borderRadius: "50%", width: 36, height: 36, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: chatInput.trim() && !chatLoading ? "pointer" : "not-allowed",
                transition: "all 0.2s"
              }}
            >
              <div style={{ width: 16, height: 16 }}>{Ic.send}</div>
            </button>
          </div>
        </div>
      )}

      {/* ── Ask AI Popover (Text Selection) ── */}
      {askAIPopover.show && (
        <div style={{
          position: "fixed",
          left: askAIPopover.x,
          top: askAIPopover.y,
          transform: "translate(-50%, -100%)",
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: 6, padding: 4,
          boxShadow: "0 4px 12px rgba(0,0,0,.3)", zIndex: 110,
          display: "flex", alignItems: "center"
        }}>
          <button
            onClick={() => handleAskAI(askAIPopover.text)}
            style={{
              background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
              border: "1px solid #334155",
              color: "#f8fafc",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "20px",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)"
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = "linear-gradient(180deg, #334155 0%, #1e293b 100%)";
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)";
            }}
          >
            <div style={{ width: 14, height: 14 }}>{Ic.chatbot}</div> Ask AI
          </button>
        </div>
      )}

    </div >
  );
}