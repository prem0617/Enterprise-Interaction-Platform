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
const PALETTE = ["#4f8ef7", "#7c3aed", "#34d399", "#fb923c", "#f472b6", "#38bdf8"];
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
      } catch (_) { }
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
  .de-toolbar { display:flex; align-items:center; gap:0; padding:5px 14px; background:#161b27; border-bottom:1px solid rgba(255,255,255,.07); flex-wrap:wrap; position:sticky; top:56px; z-index:38; }
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
  .de-page-area { flex:1; background:#0c0e15; padding:40px 16px 60px; overflow-y:auto; display:flex; justify-content:center; align-items:flex-start; }
  .de-page { width:100%; max-width:816px; min-height:1056px; background:#fff; border-radius:8px; box-shadow:0 8px 48px rgba(0,0,0,.8),0 2px 16px rgba(0,0,0,.5); padding:80px 96px 100px; }
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
  chatbot: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><line x1="9" y1="10" x2="9.01" y2="10" /><line x1="15" y1="10" x2="15.01" y2="10" /></svg>,
  send: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
};

export default function DocumentEditor() {
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

  const { collaborators, typingUsers, registerRemoteUpdateHandler, registerRemoteTitleUpdateHandler, broadcastUpdate, broadcastTitleUpdate, broadcastTyping } =
    useDocumentCollaboration(socket, docIdForSocket, currentUserId, userName);

  const editorRef = useRef(null);
  const colorRef = useRef(null);
  const isRemoteRef = useRef(false);

  const [saveStatus, setSaveStatus] = useState("idle");
  const [wordCount, setWordCount] = useState(0);
  const [textColor, setTextColor] = useState("#000000");
  const [highlightColor, setHighlightColor] = useState("#ffff00");
  const [showShare, setShowShare] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const highlightRef = useRef(null);
  const imageInputRef = useRef(null);
  const saveTimerRef = useRef(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [askAIPopover, setAskAIPopover] = useState({ show: false, x: 0, y: 0, text: "" });
  const chatEndRef = useRef(null);

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
    if (doc && editorRef.current && !editorRef.current._initialized) {
      editorRef.current.innerHTML = doc.content || "";
      editorRef.current._initialized = true;
      setWordCount(countWords(doc.content || ""));
    }
  }, [doc]);

  useEffect(() => {
    registerRemoteUpdateHandler(({ content }) => {
      if (!editorRef.current) return;
      isRemoteRef.current = true;
      const sel = window.getSelection();
      let saved = null;
      try { if (sel?.rangeCount > 0) saved = sel.getRangeAt(0).cloneRange(); } catch (_) { }
      editorRef.current.innerHTML = content;
      setWordCount(countWords(content));
      try { if (saved) { sel.removeAllRanges(); sel.addRange(saved); } } catch (_) { }
      isRemoteRef.current = false;
    });
  }, [registerRemoteUpdateHandler]);

  useEffect(() => {
    registerRemoteTitleUpdateHandler(({ title }) => {
      setDoc(d => d ? { ...d, title } : d);
    });
  }, [registerRemoteTitleUpdateHandler]);

  const save = useCallback(async (overrideTitle) => {
    if (isReadOnly) return;
    setSaveStatus("saving");
    try {
      const content = editorRef.current?.innerHTML || "";
      const finalTitle = typeof overrideTitle === "string" ? overrideTitle : doc?.title;
      await axios.put(`${BACKEND_URL}/documents/${id}`, { content, title: finalTitle }, { headers: authHeader() });
      setSaveStatus("saved");
    } catch (err) { console.error(err); setSaveStatus("idle"); }
  }, [id, doc?.title, isReadOnly]);

  const handleInput = useCallback(() => {
    if (isRemoteRef.current || isReadOnly) return;
    const html = editorRef.current?.innerHTML || "";
    setWordCount(countWords(html));
    setSaveStatus("Unsaved changes");
    broadcastUpdate(html);
    broadcastTyping();

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      save();
    }, 1500);
  }, [broadcastUpdate, broadcastTyping, isReadOnly, save]);

  useEffect(() => {
    const onKey = e => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); save(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const handlePublicToggle = async val => {
    try {
      await axios.put(`${BACKEND_URL}/documents/${id}`, { is_public: val }, { headers: authHeader() });
      setDoc(d => ({ ...d, is_public: val }));
    } catch (err) { console.error(err); }
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
    let html = "<table>";
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        html += r === 0 ? `<th>Header ${c + 1}</th>` : "<td>&nbsp;</td>";
      }
      html += "</tr>";
    }
    html += "</table><p><br></p>";
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

  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
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

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelection);
    return () => document.removeEventListener("selectionchange", handleSelection);
  }, [handleSelection]);

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
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process your question. Please try again." }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  const handleAskAI = (selText) => {
    setAskAIPopover({ show: false, x: 0, y: 0, text: "" });
    askQuestion(`Explain this from the document:\n"${selText}"\n`);
  };

  const downloadDocx = () => {
    try {
      const html = editorRef.current?.innerHTML || "";
      const title = doc?.title || "document";
      const wrappedHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
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
    // Use browser's find — simple visual highlight approach
    window.find(findText, false, false, true, false, false, false);
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

  const statusText = saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Unsaved changes";

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
        {/* Docs Logo — Tailwind styled */}
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/30 flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="white" fillOpacity="0.95" />
            <polyline points="14 2 14 8 20 8" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none" />
            <line x1="8" y1="13" x2="16" y2="13" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
            <line x1="8" y1="17" x2="13" y2="17" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
          </svg>
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
          {!isReadOnly && (
            <button
              className="de-tb-btn"
              title="Download as DOC"
              onClick={downloadDocx}
              style={{ color: "#94a3b8", padding: "6px 10px", borderRadius: 8, marginLeft: "auto" }}
            >
              {Ic.download}
              <span style={{ fontSize: 11, marginLeft: 4, fontWeight: 500 }}>DOC</span>
            </button>
          )}
          {isReadOnly && token && user && (doc?.owner === currentUserId || doc?.collaborators?.some(c => c.userId === currentUserId && (c.role === "editor" || c.role === "owner"))) && (
            <button
              className="de-save-btn"
              style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center", background: "#3b82f6" }}
              onClick={() => {
                navigate(`/documents/${doc._id}`);
                window.location.reload();
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
              Edit Document
            </button>
          )}
          <button className="de-share-btn" onClick={() => setShowShare(true)}>
            {Ic.share} Share
          </button>
          <button
            className="de-tb-btn"
            title="AI Document Assistant"
            onClick={() => setShowChat(c => !c)}
            style={{
              color: showChat ? "#60a5fa" : "#94a3b8",
              padding: "6px 10px",
              borderRadius: 8,
              background: showChat ? "rgba(96,165,250,.12)" : "none",
              border: showChat ? "1px solid rgba(96,165,250,.25)" : "1px solid transparent",
            }}
          >
            {Ic.chatbot}
          </button>
        </div>
      </div>

      {/* Read-only warning */}
      {isReadOnly && (
        <div className="de-readonly-banner">
          {Ic.warn}
          <span>You have <strong>view-only</strong> access. Contact the owner to request edit permissions.</span>
        </div>
      )}

      {/* Live editing banner */}
      {collaborators.length > 0 && (
        <div className="de-collab-banner">
          {Ic.users}
          <span>{collaborators.map(c => c.name).join(", ")} {collaborators.length === 1 ? "is" : "are"} also here</span>
        </div>
      )}

      {/* Typing bar */}
      <div className="de-typing-bar">
        {typingUsers.length > 0 && (
          <>
            <div className="de-typing-dots">
              {[0, 1, 2].map(i => (
                <div key={i} className="de-typing-dot"
                  style={{ background: typingUsers[0]?.color || "#4f8ef7", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span>{typingUsers.map(u => u.name).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing…</span>
          </>
        )}
      </div>

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

      {/* Ask AI Popover */}
      {askAIPopover.show && !isReadOnly && (
        <button
          onClick={() => handleAskAI(askAIPopover.text)}
          className="fixed z-50 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 border border-slate-700/50 rounded-lg shadow-xl shadow-black/20 hover:bg-slate-800 transition-all cursor-pointer"
          style={{ left: askAIPopover.x, top: askAIPopover.y, transform: "translate(-50%, -100%)" }}
          onMouseDown={e => e.preventDefault()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><line x1="9" y1="10" x2="9.01" y2="10" /><line x1="15" y1="10" x2="15.01" y2="10" /></svg>
          <span>Ask AI</span>
        </button>
      )}

      {/* Page + Chat layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        {/* Page */}
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

        {/* Q&A Chatbot Panel - Flattened Integrated Styling */}
        {showChat && (
          <div className="w-[340px] bg-[#0f172a] border-l border-[#1e293b] flex flex-col flex-shrink-0 h-full relative z-30">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e293b]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><line x1="9" y1="10" x2="9.01" y2="10" /><line x1="15" y1="10" x2="15.01" y2="10" /></svg>
                </div>
                <div className="text-[13px] font-semibold text-slate-200">AI Assistant</div>
              </div>
              <button
                className="text-slate-400 hover:text-slate-100 hover:bg-slate-800 p-1.5 rounded-md transition-colors cursor-pointer"
                onClick={() => setShowChat(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4 text-slate-400 mt-[-20px]">
                  <div className="w-12 h-12 rounded-full border border-[#334155] bg-[#1e293b] flex items-center justify-center mb-3">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-indigo-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><line x1="9" y1="10" x2="9.01" y2="10" /><line x1="15" y1="10" x2="15.01" y2="10" /></svg>
                  </div>
                  <div className="text-[14px] font-medium text-slate-200 mb-1.5">Ask about this document</div>
                  <div className="text-[12px] leading-relaxed">Select text in the editor to ask specific questions, or type below.</div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[90%] px-3.5 py-2.5 text-[13px] leading-relaxed break-words ${msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-xl rounded-tr-sm"
                    : "bg-[#1e293b] text-slate-200 rounded-xl rounded-tl-sm border border-[#334155]"
                    }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex w-full justify-start">
                  <div className="px-4 py-3 rounded-xl bg-[#1e293b] border border-[#334155] rounded-tl-sm flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-[#1e293b] bg-[#0f172a]">
              <div className="flex items-end gap-2 bg-[#1e293b] rounded-xl border border-[#334155] p-1.5 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all">
                <textarea
                  className="flex-1 bg-transparent px-2.5 py-1.5 text-slate-200 text-[13px] outline-none placeholder:text-slate-500 resize-none min-h-[36px] max-h-[120px]"
                  placeholder="Ask a question..."
                  rows={1}
                  value={chatInput}
                  onChange={e => {
                    setChatInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askQuestion(); } }}
                  disabled={chatLoading}
                />
                <button
                  className="flex items-center justify-center w-[32px] h-[32px] shrink-0 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mb-0.5"
                  onClick={() => askQuestion()}
                  disabled={chatLoading || !chatInput.trim()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 ml-0.5"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                </button>
              </div>
              <div className="text-center mt-2 pb-1 text-[10px] text-slate-500">AI can make mistakes. Verify important info.</div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="de-footer">
        <span>{wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}</span>
        {collaborators.length > 0 && (
          <><div className="de-footer-sep" /><span style={{ color: "#60a5fa" }}>{collaborators.length + 1} online</span></>
        )}
        <div className="de-footer-sep" />
        {isReadOnly
          ? <span style={{ color: "#f59e0b" }}>View only</span>
          : <span style={{ color: saveStatus === "Unsaved changes" ? "#fbbf24" : saveStatus === "saving" ? "#60a5fa" : "#34d399" }}>
            {saveStatus === "Unsaved changes" ? "Unsaved changes" : saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "All changes saved" : "Saved"}
          </span>
        }
      </div>

      {/* Hidden image file input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageFileChange}
      />

      {/* Share panel */}
      {showShare && (
        <SharePanel
          docId={id}
          isOwner={isOwner}
          isPublic={!!doc.is_public}
          onPublicToggle={handlePublicToggle}
          onClose={() => setShowShare(false)}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}