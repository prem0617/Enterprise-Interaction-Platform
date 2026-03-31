import React, { useState, useEffect, useRef, useCallback } from 'react';
import PptxGenJS from 'pptxgenjs';
import {
  Download, Plus, Trash2, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight,
  MonitorPlay, Palette, List, Image as ImageIcon, GripVertical,
  Play, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Type, Square, Minus, Copy, RotateCcw, RotateCw,
  AlignVerticalJustifyCenter, Layers, Move
} from 'lucide-react';

/* â•â• THEMES â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const THEMES = {
  light:     { name:'Light',     bg:'#ffffff', h1:'#0f172a', h2:'#334155', body:'#475569', accent:'#3b82f6', grad:'linear-gradient(135deg,#f8fafc,#e2e8f0)' },
  dark:      { name:'Dark',      bg:'#0f172a', h1:'#f8fafc', h2:'#cbd5e1', body:'#94a3b8', accent:'#818cf8', grad:'linear-gradient(135deg,#0f172a,#1e293b)' },
  ocean:     { name:'Ocean',     bg:'#0c4a6e', h1:'#e0f2fe', h2:'#bae6fd', body:'#7dd3fc', accent:'#38bdf8', grad:'linear-gradient(135deg,#0c4a6e,#0369a1)' },
  sunset:    { name:'Sunset',    bg:'#431407', h1:'#fff7ed', h2:'#fed7aa', body:'#fdba74', accent:'#fb923c', grad:'linear-gradient(135deg,#431407,#9a3412)' },
  forest:    { name:'Forest',    bg:'#052e16', h1:'#f0fdf4', h2:'#bbf7d0', body:'#86efac', accent:'#4ade80', grad:'linear-gradient(135deg,#052e16,#14532d)' },
  corporate: { name:'Corp',      bg:'#0f172a', h1:'#ffffff', h2:'#e2e8f0', body:'#94a3b8', accent:'#6366f1', grad:'linear-gradient(135deg,#0f172a,#1e293b)' },
  lavender:  { name:'Lavender',  bg:'#3b0764', h1:'#faf5ff', h2:'#e9d5ff', body:'#c4b5fd', accent:'#a78bfa', grad:'linear-gradient(135deg,#3b0764,#6b21a8)' },
  rose:      { name:'Rose',      bg:'#fff1f2', h1:'#4c0519', h2:'#9f1239', body:'#be123c', accent:'#f43f5e', grad:'linear-gradient(135deg,#fff1f2,#ffe4e6)' },
  slate:     { name:'Slate',     bg:'#f8fafc', h1:'#0f172a', h2:'#334155', body:'#64748b', accent:'#0ea5e9', grad:'linear-gradient(135deg,#f8fafc,#f1f5f9)' },
  midnight:  { name:'Midnight',  bg:'#020617', h1:'#e2e8f0', h2:'#64748b', body:'#475569', accent:'#06b6d4', grad:'linear-gradient(135deg,#020617,#0c1a2e)' },
};

const FONTS = ['Outfit','Georgia','Courier New','Impact','Trebuchet MS','Verdana','Arial Black'];
const FSIZES = [10,12,14,16,18,20,24,28,32,36,40,48,56,64,72,96];

/* â•â• ELEMENT FACTORIES â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const uid = () => `el-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const sid = () => `sl-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;

const mkText = (x=80,y=80,w=400,h=80,text='Text',style={}) => ({
  id:uid(), type:'text', x,y,w,h, text,
  style:{ fontSize:24, fontFamily:'Outfit', color:'#ffffff', bold:false, italic:false, underline:false, align:'left', lineHeight:1.4, background:'transparent', borderRadius:0, padding:8, ...style },
});
const mkImage = (src,x=160,y=100,w=380,h=260) => ({
  id:uid(), type:'image', x,y,w,h, src,
  style:{ borderRadius:8, opacity:1, objectFit:'cover' },
});
const mkShape = (shape='rect',x=120,y=120,w=200,h=120) => ({
  id:uid(), type:'shape', shape, x,y,w,h,
  style:{ fill:'#3b82f6', borderRadius:shape==='circle'?9999:8, opacity:1 },
});
const mkDivider = (x=60,y=200,w=840,h=3) => ({
  id:uid(), type:'divider', x,y,w,h,
  style:{ color:'rgba(255,255,255,0.3)' },
});

const TEMPLATE = (theme) => [
  {
    id:sid(), bg:null,
    elements:[
      mkText(60,140,840,120,'Your Presentation Title',{ fontSize:56, bold:true, align:'center', color:theme.h1 }),
      mkText(160,290,640,60,'Click here to add a subtitle',{ fontSize:24, align:'center', color:theme.body }),
    ],
  },
  {
    id:sid(), bg:null,
    elements:[
      mkText(60,50,840,70,'Slide Title',{ fontSize:40, bold:true, color:theme.h1 }),
      mkDivider(60,128,840,2),
      mkText(60,150,840,280,'â€¢ Key point one\nâ€¢ Key point two\nâ€¢ Key point three',{ fontSize:22, color:theme.body, lineHeight:1.7 }),
    ],
  },
];

/* â•â• RESIZE HANDLES â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const HANDLES = ['nw','n','ne','e','se','s','sw','w'];
const HPos = { nw:{top:-5,left:-5},n:{top:-5,left:'50%',ml:-4},ne:{top:-5,right:-5},e:{top:'50%',right:-5,mt:-4},se:{bottom:-5,right:-5},s:{bottom:-5,left:'50%',ml:-4},sw:{bottom:-5,left:-5},w:{top:'50%',left:-5,mt:-4} };
const HCur = { nw:'nw-resize',n:'n-resize',ne:'ne-resize',e:'e-resize',se:'se-resize',s:'s-resize',sw:'sw-resize',w:'w-resize' };

/* â•â• ELEMENT WRAPPER (drag + resize + inline edit) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function ElWrap({ el, selected, onSelect, onChange, onDelete, zoom, readOnly }) {
  const [editing, setEditing] = useState(false);
  const textRef = useRef(null);
  const dragRef = useRef(null);
  const resRef = useRef(null);

  const startDrag = (e) => {
    if (readOnly || editing) return;
    e.stopPropagation();
    onSelect();
    dragRef.current = { sx:e.clientX, sy:e.clientY, ox:el.x, oy:el.y };
    const mv = (ev) => {
      if (!dragRef.current) return;
      onChange({ x: Math.round(dragRef.current.ox + (ev.clientX-dragRef.current.sx)/zoom), y: Math.round(dragRef.current.oy + (ev.clientY-dragRef.current.sy)/zoom) });
    };
    const up = () => { dragRef.current=null; window.removeEventListener('mousemove',mv); window.removeEventListener('mouseup',up); };
    window.addEventListener('mousemove',mv); window.addEventListener('mouseup',up);
  };

  const startResize = (e, h) => {
    if (readOnly) return;
    e.stopPropagation(); e.preventDefault();
    resRef.current = { sx:e.clientX, sy:e.clientY, ox:el.x, oy:el.y, ow:el.w, oh:el.h, h };
    const mv = (ev) => {
      if (!resRef.current) return;
      const dx=(ev.clientX-resRef.current.sx)/zoom, dy=(ev.clientY-resRef.current.sy)/zoom;
      const { ox,oy,ow,oh,h:hnd } = resRef.current;
      let nx=ox,ny=oy,nw=ow,nh=oh;
      if(hnd.includes('e')) nw=Math.max(40,ow+dx);
      if(hnd.includes('s')) nh=Math.max(20,oh+dy);
      if(hnd.includes('w')){ nw=Math.max(40,ow-dx); nx=ox+dx; }
      if(hnd.includes('n')){ nh=Math.max(20,oh-dy); ny=oy+dy; }
      onChange({ x:Math.round(nx), y:Math.round(ny), w:Math.round(nw), h:Math.round(nh) });
    };
    const up = () => { resRef.current=null; window.removeEventListener('mousemove',mv); window.removeEventListener('mouseup',up); };
    window.addEventListener('mousemove',mv); window.addEventListener('mouseup',up);
  };

  const dblClick = (e) => {
    if (readOnly || el.type !== 'text') return;
    e.stopPropagation();
    setEditing(true);
    setTimeout(() => { textRef.current?.focus(); document.execCommand('selectAll',false,null); }, 10);
  };

  const s = el.style || {};

  const content = () => {
    if (el.type==='text') return (
      <div ref={textRef} contentEditable={editing} suppressContentEditableWarning
        onBlur={() => { setEditing(false); if(textRef.current) onChange({ text: textRef.current.innerText }); }}
        onKeyDown={e=>e.stopPropagation()}
        style={{
          width:'100%',height:'100%',padding:s.padding??8,boxSizing:'border-box',outline:'none',
          fontSize:s.fontSize||24,fontFamily:s.fontFamily||'Outfit',color:s.color||'#fff',
          fontWeight:s.bold?700:400,fontStyle:s.italic?'italic':'normal',
          textDecoration:s.underline?'underline':'none',textAlign:s.align||'left',
          lineHeight:s.lineHeight||1.4,background:s.background||'transparent',
          borderRadius:s.borderRadius||0,whiteSpace:'pre-wrap',wordBreak:'break-word',
          userSelect:editing?'text':'none',cursor:editing?'text':'default',overflow:'hidden',
        }}>{el.text}</div>
    );
    if (el.type==='image') return (
      <img src={el.src} alt="" draggable={false} style={{ width:'100%',height:'100%',objectFit:s.objectFit||'cover',borderRadius:s.borderRadius??8,opacity:s.opacity??1,display:'block',pointerEvents:'none' }}/>
    );
    if (el.type==='shape') return (
      <div style={{ width:'100%',height:'100%',background:s.fill||'#3b82f6',borderRadius:s.borderRadius??8,opacity:s.opacity??1 }}/>
    );
    if (el.type==='divider') return (
      <div style={{ width:'100%',height:'100%',background:s.color||'rgba(255,255,255,.3)',borderRadius:2 }}/>
    );
    return null;
  };

  return (
    <div
      onMouseDown={startDrag}
      onDoubleClick={dblClick}
      style={{
        position:'absolute',left:el.x,top:el.y,width:el.w,height:el.h,
        outline: selected&&!readOnly ? '2px solid #6366f1' : editing ? '2px solid #06b6d4' : '2px solid transparent',
        outlineOffset:1, zIndex:selected?20:10, cursor:readOnly?'default':editing?'text':'move', boxSizing:'border-box',
      }}
    >
      {content()}
      {selected&&!readOnly&&!editing&&HANDLES.map(h=>(
        <div key={h} onMouseDown={e=>startResize(e,h)} style={{
          position:'absolute',width:8,height:8,background:'#fff',border:'2px solid #6366f1',
          borderRadius:2,cursor:HCur[h],zIndex:100,...HPos[h],
          ...(HPos[h].ml?{marginLeft:HPos[h].ml}:{}),
          ...(HPos[h].mt?{marginTop:HPos[h].mt}:{}),
        }}/>
      ))}
      {selected&&!readOnly&&!editing&&(
        <>
          <button onMouseDown={e=>{e.stopPropagation();onDelete();}} style={{
            position:'absolute',top:-28,right:0,background:'#ef4444',border:'none',color:'#fff',
            borderRadius:4,width:22,height:22,cursor:'pointer',display:'flex',alignItems:'center',
            justifyContent:'center',zIndex:200,
          }}><X size={11}/></button>
          {el.type==='text'&&<div style={{ position:'absolute',top:-26,left:0,background:'rgba(6,182,212,.9)',color:'#fff',fontSize:9,padding:'2px 7px',borderRadius:4,fontWeight:700,whiteSpace:'nowrap',pointerEvents:'none',fontFamily:'DM Sans,sans-serif' }}>Double-click to edit</div>}
        </>
      )}
    </div>
  );
}

/* â•â• SLIDE SCALED PREVIEW â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function SlideThumb({ slide, theme }) {
  const outerRef = useRef(null);
  const [sc, setSc] = useState(0);
  useEffect(() => {
    if (!outerRef.current) return;
    const ro = new ResizeObserver(e => setSc(e[0].contentRect.width/960));
    ro.observe(outerRef.current); return ()=>ro.disconnect();
  }, []);
  return (
    <div ref={outerRef} style={{ width:'100%',height:'100%',position:'relative',overflow:'hidden',background:slide?.bg||theme.bg }}>
      <div style={{ position:'absolute',inset:0,width:960,height:540,transform:`scale(${sc||.001})`,transformOrigin:'0 0',pointerEvents:'none' }}>
        {(slide?.elements||[]).map(el => <ElWrap key={el.id} el={el} selected={false} onSelect={()=>{}} onChange={()=>{}} onDelete={()=>{}} zoom={1} readOnly/>)}
      </div>
    </div>
  );
}

/* â•â• SLIDESHOW MODAL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function Slideshow({ slides, startIdx, themeKey, onClose }) {
  const theme = THEMES[themeKey]||THEMES.dark;
  const [idx, setIdx] = useState(startIdx);
  const [anim, setAnim] = useState(false);

  const go = useCallback((n) => {
    if (anim||n<0||n>=slides.length) return;
    setAnim(true); setTimeout(()=>{ setIdx(n); setAnim(false); },260);
  }, [anim, slides.length]);

  useEffect(() => {
    const h = e => {
      if(e.key==='ArrowRight'||e.key===' '){ e.preventDefault(); go(idx+1); }
      if(e.key==='ArrowLeft'){ e.preventDefault(); go(idx-1); }
      if(e.key==='Escape') onClose();
    };
    window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h);
  }, [idx,anim]);

  return (
    <div style={{
      position:'fixed',inset:0,zIndex:99999,background:'#000',
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
    }}>
      {/* header */}
      <div style={{ position:'absolute',top:0,left:0,right:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',background:'linear-gradient(rgba(0,0,0,.7),transparent)' }}>
        <div style={{ display:'flex',gap:6 }}>
          {['#ef4444','#fbbf24','#22c55e'].map((c,i)=><div key={i} style={{ width:10,height:10,borderRadius:'50%',background:c }}/>)}
        </div>
        <span style={{ color:'rgba(255,255,255,.4)',fontSize:12,fontFamily:'DM Sans,sans-serif',fontWeight:600 }}>{idx+1} / {slides.length}</span>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.15)',color:'#fff',padding:'5px 14px',borderRadius:20,cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:'DM Sans,sans-serif',display:'flex',alignItems:'center',gap:6 }}><X size={12}/> ESC</button>
      </div>

      {/* CENTERED SLIDE â€” key fix */}
      <div style={{
        width:'min(90vw, calc(90vh * 16 / 9))',
        aspectRatio:'16/9',
        position:'relative',
        background:slides[idx]?.bg||theme.bg,
        boxShadow:'0 40px 120px rgba(0,0,0,.95)',
        borderRadius:6,
        overflow:'hidden',
        opacity:anim?0:1,
        transform:anim?'scale(.96) translateY(10px)':'scale(1) translateY(0)',
        transition:'opacity .26s ease, transform .26s ease',
      }}>
        <SlideThumb slide={slides[idx]} theme={theme}/>
      </div>

      {/* controls */}
      <div style={{ position:'absolute',bottom:28,left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:16 }}>
        <SsBtn disabled={idx===0} onClick={()=>go(idx-1)}><ChevronLeft size={18}/></SsBtn>
        <div style={{ display:'flex',gap:5 }}>
          {slides.map((_,i)=>(
            <button key={i} onClick={()=>go(i)} style={{ width:i===idx?24:7,height:7,borderRadius:4,border:'none',padding:0,background:i===idx?'#6366f1':'rgba(255,255,255,.2)',cursor:'pointer',transition:'all .2s' }}/>
          ))}
        </div>
        <SsBtn disabled={idx===slides.length-1} onClick={()=>go(idx+1)}><ChevronRight size={18}/></SsBtn>
      </div>
    </div>
  );
}
function SsBtn({ children, onClick, disabled }) {
  return <button onClick={onClick} disabled={disabled} style={{ width:40,height:40,borderRadius:10,background:disabled?'rgba(255,255,255,.04)':'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.1)',color:disabled?'rgba(255,255,255,.15)':'#fff',cursor:disabled?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s' }}>{children}</button>;
}

/* â•â• PROPERTIES PANEL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function PropPanel({ el, onChange, theme }) {
  if (!el) return (
    <div style={{ padding:20,textAlign:'center',color:'rgba(255,255,255,.70)',fontSize:12,fontFamily:'DM Sans,sans-serif' }}>
      <Layers size={22} style={{ display:'block',margin:'0 auto 8px',opacity:.2 }}/> Select an element
    </div>
  );
  const s = el.style||{};
  const bgColorRef = useRef(null);
  const upd = p => onChange({ style:{...s,...p} });

  return (
    <div style={{ padding:'12px 10px',display:'flex',flexDirection:'column',gap:12,fontFamily:'DM Sans,sans-serif' }}>
      <PSection label={el.type.toUpperCase()}>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:5 }}>
          {[['X',el.x,'x'],['Y',el.y,'y'],['W',el.w,'w'],['H',el.h,'h']].map(([l,v,k])=>(
            <label key={k} style={{ display:'flex',flexDirection:'column',gap:3 }}>
              <span style={{ fontSize:9,color:'rgba(255,255,255,.70)',fontWeight:700,letterSpacing:'.08em' }}>{l}</span>
              <input type="number" value={Math.round(v||0)} onChange={e=>onChange({[k]:Number(e.target.value)})} style={inp}/>
            </label>
          ))}
        </div>
      </PSection>

      {el.type==='text'&&(
        <>
          <PSection label="FONT">
            <select value={s.fontFamily||'Outfit'} onChange={e=>upd({fontFamily:e.target.value})} style={inp}>
              {FONTS.map(f=><option key={f} value={f}>{f}</option>)}
            </select>
            <select value={s.fontSize||24} onChange={e=>upd({fontSize:Number(e.target.value)})} style={inp}>
              {FSIZES.map(sz=><option key={sz} value={sz}>{sz}px</option>)}
            </select>
            <div style={{ display:'flex',gap:4 }}>
              {[['B','bold',{fontWeight:700}],['I','italic'],['U','underline']].map(([l,p])=>(
                <button key={p} onClick={()=>upd({[p]:!s[p]})} style={{ ...sb,background:s[p]?'#6366f1':'rgba(255,255,255,.06)',color:s[p]?'#fff':'#5a6480',fontWeight:700 }}>{l}</button>
              ))}
              <div style={{ width:1,background:'#161d2c',margin:'0 2px' }}/>
              {[['L','left'],['C','center'],['R','right']].map(([l,v])=>(
                <button key={v} onClick={()=>upd({align:v})} style={{ ...sb,background:s.align===v?'#6366f1':'rgba(255,255,255,.06)',color:s.align===v?'#fff':'#5a6480' }}>{l}</button>
              ))}
            </div>
          </PSection>
          <PSection label="COLOR">
            <label style={{ display:'flex',flexDirection:'column',gap:3 }}>
              <span style={{ fontSize:9,color:'rgba(255,255,255,.70)',fontWeight:700,letterSpacing:'.08em' }}>Text Color</span>
              <input type="color" value={s.color||'#ffffff'} onChange={e=>upd({color:e.target.value})} style={{ ...inp,height:32,padding:2,cursor:'pointer' }}/>
            </label>
            <label style={{ display:'flex',flexDirection:'column',gap:3 }}>
              <span style={{ fontSize:9,color:'rgba(255,255,255,.70)',fontWeight:700,letterSpacing:'.08em' }}>Background</span>
              <div style={{ display:'flex',gap:4 }}>
                {/* Visible square shows transparent by default; actual color picker is hidden */}
                <button
                  type="button"
                  onClick={() => bgColorRef.current?.click()}
                  title="Background color"
                  style={{
                    height: 28,
                    padding: 2,
                    cursor: 'pointer',
                    flex: 1,
                    borderRadius: 5,
                    border: '1px solid #1e2535',
                    background: (!s.background || s.background === 'transparent') ? 'rgba(0,0,0,0)' : s.background,
                    boxSizing: 'border-box',
                  }}
                />
                <input
                  ref={bgColorRef}
                  type="color"
                  value={(!s.background||s.background==='transparent')?'#000000':s.background}
                  onChange={e=>upd({background:e.target.value})}
                  style={{ display:'none' }}
                />
                <button onClick={()=>upd({background:'transparent'})} style={{ ...sb,fontSize:9 }}>None</button>
              </div>
            </label>
          </PSection>
          <PSection label="SPACING">
            <label style={{ display:'flex',flexDirection:'column',gap:3 }}>
              <span style={{ fontSize:9,color:'rgba(255,255,255,.70)',fontWeight:700,letterSpacing:'.08em' }}>Line Height: {s.lineHeight||1.4}</span>
              <input type="range" min="1" max="3" step="0.05" value={s.lineHeight||1.4} onChange={e=>upd({lineHeight:+e.target.value})} style={{ width:'100%',accentColor:'#6366f1' }}/>
            </label>
            <label style={{ display:'flex',flexDirection:'column',gap:3 }}>
              <span style={{ fontSize:9,color:'rgba(255,255,255,.70)',fontWeight:700,letterSpacing:'.08em' }}>Corner Radius: {s.borderRadius||0}</span>
              <input type="range" min="0" max="40" value={s.borderRadius||0} onChange={e=>upd({borderRadius:+e.target.value})} style={{ width:'100%',accentColor:'#6366f1' }}/>
            </label>
          </PSection>
        </>
      )}

      {el.type==='image'&&(
        <PSection label="IMAGE">
          <select value={s.objectFit||'cover'} onChange={e=>upd({objectFit:e.target.value})} style={inp}>
            <option value="cover">Cover</option><option value="contain">Contain</option><option value="fill">Fill</option>
          </select>
          <label style={{ display:'flex',flexDirection:'column',gap:3 }}>
            <span style={{ fontSize:9,color:'rgba(255,255,255,.70)',fontWeight:700,letterSpacing:'.08em' }}>Corner Radius: {s.borderRadius??8}</span>
            <input type="range" min="0" max="200" value={s.borderRadius??8} onChange={e=>upd({borderRadius:+e.target.value})} style={{ width:'100%',accentColor:'#6366f1' }}/>
          </label>
          <label style={{ display:'flex',flexDirection:'column',gap:3 }}>
            <span style={{ fontSize:9,color:'rgba(255,255,255,.70)',fontWeight:700,letterSpacing:'.08em' }}>Opacity: {Math.round((s.opacity??1)*100)}%</span>
            <input type="range" min="0.05" max="1" step="0.05" value={s.opacity??1} onChange={e=>upd({opacity:+e.target.value})} style={{ width:'100%',accentColor:'#6366f1' }}/>
          </label>
        </PSection>
      )}

      {el.type==='shape'&&(
        <PSection label="SHAPE">
          <label style={{ display:'flex',flexDirection:'column',gap:3 }}>
            <span style={{ fontSize:9,color:'rgba(255,255,255,.70)',fontWeight:700,letterSpacing:'.08em' }}>Fill</span>
            <input type="color" value={s.fill||'#3b82f6'} onChange={e=>upd({fill:e.target.value})} style={{ ...inp,height:32,padding:2,cursor:'pointer' }}/>
          </label>
          <label style={{ display:'flex',flexDirection:'column',gap:3 }}>
            <span style={{ fontSize:9,color:'rgba(255,255,255,.70)',fontWeight:700,letterSpacing:'.08em' }}>Corner Radius: {s.borderRadius??8}</span>
            <input type="range" min="0" max="200" value={s.borderRadius??8} onChange={e=>upd({borderRadius:+e.target.value})} style={{ width:'100%',accentColor:'#6366f1' }}/>
          </label>
          <label style={{ display:'flex',flexDirection:'column',gap:3 }}>
            <span style={{ fontSize:9,color:'rgba(255,255,255,.70)',fontWeight:700,letterSpacing:'.08em' }}>Opacity: {Math.round((s.opacity??1)*100)}%</span>
            <input type="range" min="0.05" max="1" step="0.05" value={s.opacity??1} onChange={e=>upd({opacity:+e.target.value})} style={{ width:'100%',accentColor:'#6366f1' }}/>
          </label>
        </PSection>
      )}

      {el.type==='divider'&&(
        <PSection label="DIVIDER">
          <label style={{ display:'flex',flexDirection:'column',gap:3 }}>
            <span style={{ fontSize:9,color:'rgba(255,255,255,.70)',fontWeight:700,letterSpacing:'.08em' }}>Color</span>
            <input type="color" value={(s.color&&s.color.startsWith('#'))?s.color:'#ffffff'} onChange={e=>upd({color:e.target.value})} style={{ ...inp,height:32,padding:2,cursor:'pointer' }}/>
          </label>
        </PSection>
      )}
    </div>
  );
}
const inp = { background:'#0d1117',border:'1px solid #1e2535',color:'#9ba6c0',fontSize:11,padding:'4px 7px',borderRadius:5,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'DM Sans,sans-serif' };
const sb = { background:'rgba(255,255,255,.06)',border:'1px solid #1e2535',color:'rgba(255,255,255,.72)',fontSize:11,padding:'3px 7px',borderRadius:4,cursor:'pointer',fontFamily:'DM Sans,sans-serif' };
function PSection({ label, children }) {
  return <div style={{ display:'flex',flexDirection:'column',gap:6 }}><div style={{ fontSize:9,fontWeight:700,letterSpacing:.8,color:'rgba(255,255,255,.70)' }}>{label}</div>{children}</div>;
}

/* â•â• TOOLBAR BUTTON â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function TB({ children, onClick, disabled, title, danger, active, label }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        display:'flex',alignItems:'center',gap:4,padding:'4px 7px',
        background: active ? 'rgba(99,102,241,.15)' : danger ? 'rgba(239,68,68,.07)' : hov&&!disabled ? 'rgba(255,255,255,.05)' : 'transparent',
        border:'1px solid '+(active?'rgba(99,102,241,.25)':danger?'rgba(239,68,68,.15)':'transparent'),
        borderRadius:5,color:disabled?'rgba(255,255,255,.25)':active?'#c7d2fe':danger?'#fca5a5':hov?'rgba(255,255,255,.85)':'rgba(255,255,255,.70)',
        fontSize:12,fontWeight:500,cursor:disabled?'not-allowed':'pointer',
        fontFamily:'DM Sans,sans-serif',whiteSpace:'nowrap',transition:'all .1s',
      }}>
      {children}{label&&<span style={{ fontSize:11 }}>{label}</span>}
    </button>
  );
}
function Div() { return <div style={{ width:1,height:16,background:'#161d2c',margin:'0 2px',flexShrink:0 }}/>; }

/* â•â• MAIN COMPONENT â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export default function PresentationEditor({ content, onContentChange, isReadOnly, slideTheme, onThemeChange, remotePatch, onSlideUpdate }) {
  const [slides, setSlides] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [selId, setSelId] = useState(null);
  const [showSS, setShowSS] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [dragSl, setDragSl] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [histArr, setHistArr] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const hRef = useRef([]); const hIdxRef = useRef(-1);
  const lastLocalContentRef = useRef(null);

  const themeKey = (slideTheme && THEMES[slideTheme]) ? slideTheme : 'dark';
  const theme = THEMES[themeKey];

  /* â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    // Ignore content echoes from our own local edits (prevents re-init loops)
    if (content && content === lastLocalContentRef.current) return;

    try {
      if (content) {
        const p = JSON.parse(content);
        if (p?.slides?.length) {
          setSlides(p.slides);
          setActiveIdx(0);
          setSelId(null);
          // reset undo history for externally loaded state (e.g. version switch)
          hRef.current = [];
          hIdxRef.current = -1;
          setHistArr([]);
          setHistIdx(-1);
          return;
        }
      }
    } catch {}

    // Only seed a template when there's no content AND we have nothing yet.
    setSlides((prev) => (prev?.length ? prev : TEMPLATE(theme)));
  }, [content]);

  /* ── Remote Patch Listener ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!remotePatch) return;
    const { type, slideId, id, patch, element, slide, sourceSlides } = remotePatch;
    setSlides(prev => {
      if (type === 'UPDATE_ELEMENT') {
        return prev.map(sl => sl.id !== slideId ? sl : {
          ...sl,
          elements: sl.elements.map(e => e.id !== id ? e : { ...e, ...patch, style: patch.style ? {...e.style,...patch.style} : e.style })
        });
      } else if (type === 'DELETE_ELEMENT') {
        return prev.map(sl => sl.id !== slideId ? sl : {
          ...sl,
          elements: sl.elements.filter(e => e.id !== id)
        });
      } else if (type === 'ADD_ELEMENT') {
        return prev.map(sl => sl.id !== slideId ? sl : {
          ...sl,
          elements: [...sl.elements, element]
        });
      } else if (type === 'UPDATE_SLIDE') {
        return prev.map(sl => sl.id !== slideId ? sl : slide);
      } else if (type === 'SYNC_ALL') {
        return sourceSlides;
      }
      return prev;
    });
  }, [remotePatch]);

  /* â”€â”€ History â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const pushH = useCallback((s) => {
    const snap = JSON.stringify(s);
    const arr = hRef.current.slice(0, hIdxRef.current+1);
    arr.push(snap);
    if(arr.length>60) arr.shift();
    hRef.current=arr; hIdxRef.current=arr.length-1;
    setHistArr([...arr]); setHistIdx(arr.length-1);
  }, []);

  const sync = useCallback((s, patch = null) => {
    setSlides(s);
    if(onContentChange) {
      const next = JSON.stringify({ slides:s });
      lastLocalContentRef.current = next;
      onContentChange(next);
    }
    pushH(s);
    if(onSlideUpdate) {
      if(patch) onSlideUpdate(patch);
      else onSlideUpdate({ type: 'SYNC_ALL', sourceSlides: s });
    }
  }, [onContentChange, pushH, onSlideUpdate]);

  const undo = () => { 
    if(hIdxRef.current<=0) return; hIdxRef.current--; setHistIdx(hIdxRef.current); 
    const ns = JSON.parse(hRef.current[hIdxRef.current]); setSlides(ns); 
    if(onContentChange) {
      const next = JSON.stringify({ slides:ns });
      lastLocalContentRef.current = next;
      onContentChange(next);
    }
    if(onSlideUpdate) onSlideUpdate({ type: 'SYNC_ALL', sourceSlides: ns }); 
  };
  const redo = () => { 
    if(hIdxRef.current>=hRef.current.length-1) return; hIdxRef.current++; setHistIdx(hIdxRef.current); 
    const ns = JSON.parse(hRef.current[hIdxRef.current]); setSlides(ns); 
    if(onContentChange) {
      const next = JSON.stringify({ slides:ns });
      lastLocalContentRef.current = next;
      onContentChange(next);
    }
    if(onSlideUpdate) onSlideUpdate({ type: 'SYNC_ALL', sourceSlides: ns }); 
  };

  /* â”€â”€ Slide ops â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const activeSlide = slides[activeIdx];

  const updEl = useCallback((id, patch) => {
    const ns = slides.map((sl,i) => i!==activeIdx ? sl : {
      ...sl,
      elements: sl.elements.map(e => e.id!==id ? e : { ...e, ...patch, style: patch.style ? {...e.style,...patch.style} : e.style })
    });
    sync(ns, { type: 'UPDATE_ELEMENT', slideId: slides[activeIdx].id, id, patch });
  }, [slides, activeIdx, sync]);

  const delEl = useCallback((id) => {
    sync(slides.map((sl,i) => i!==activeIdx ? sl : { ...sl, elements: sl.elements.filter(e=>e.id!==id) }), { type: 'DELETE_ELEMENT', slideId: slides[activeIdx].id, id });
    setSelId(null);
  }, [slides, activeIdx, sync]);

  const addEl = useCallback((el) => {
    sync(slides.map((sl,i) => i!==activeIdx ? sl : { ...sl, elements:[...sl.elements, el] }), { type: 'ADD_ELEMENT', slideId: slides[activeIdx].id, element: el });
    setSelId(el.id);
  }, [slides, activeIdx, sync]);

  const dupEl = () => {
    const el = activeSlide?.elements.find(e=>e.id===selId);
    if(!el) return;
    addEl({...el, id:uid(), x:el.x+20, y:el.y+20});
  };

  const fwd = () => {
    const ns = slides.map((sl,i)=>{
      if(i!==activeIdx) return sl;
      const els=[...sl.elements], idx=els.findIndex(e=>e.id===selId);
      if(idx<els.length-1){ [els[idx],els[idx+1]]=[els[idx+1],els[idx]]; }
      return {...sl,elements:els};
    }); 
    sync(ns, { type: 'UPDATE_SLIDE', slideId: slides[activeIdx].id, slide: ns[activeIdx] });
  };
  const bwd = () => {
    const ns = slides.map((sl,i)=>{
      if(i!==activeIdx) return sl;
      const els=[...sl.elements], idx=els.findIndex(e=>e.id===selId);
      if(idx>0){ [els[idx],els[idx-1]]=[els[idx-1],els[idx]]; }
      return {...sl,elements:els};
    }); 
    sync(ns, { type: 'UPDATE_SLIDE', slideId: slides[activeIdx].id, slide: ns[activeIdx] });
  };

  const addSlide = (tmpl='blank') => {
    let elements = [];
    if(tmpl==='title') elements=[
      mkText(60,140,840,120,'Slide Title',{fontSize:52,bold:true,align:'center',color:theme.h1}),
      mkText(180,285,600,60,'Your subtitle',{fontSize:24,align:'center',color:theme.body}),
    ];
    else if(tmpl==='content') elements=[
      mkText(60,50,840,70,'Title',{fontSize:40,bold:true,color:theme.h1}),
      mkDivider(60,128,840,2),
      mkText(60,155,840,300,'â€¢ Point one\nâ€¢ Point two\nâ€¢ Point three',{fontSize:22,color:theme.body,lineHeight:1.7}),
    ];
    else if(tmpl==='twocol') elements=[
      mkText(60,50,840,70,'Two Column',{fontSize:36,bold:true,color:theme.h1}),
      mkText(60,140,420,320,'Left column\n\nâ€¢ Item 1\nâ€¢ Item 2\nâ€¢ Item 3',{fontSize:20,color:theme.body,lineHeight:1.6}),
      mkText(500,140,400,320,'Right column\n\nâ€¢ Item A\nâ€¢ Item B\nâ€¢ Item C',{fontSize:20,color:theme.body,lineHeight:1.6}),
    ];
    else if(tmpl==='quote') elements=[
      mkShape('rect',60,60,840,420),
      mkText(100,160,760,200,'"The best way to predict the future is to invent it."',{fontSize:36,align:'center',color:'#fff',italic:true,lineHeight:1.5}),
      mkText(400,340,240,50,'â€” Alan Kay',{fontSize:18,align:'center',color:'rgba(255,255,255,.6)'}),
    ];
    const ns = {id:sid(),elements,bg:null};
    const arr=[...slides,ns]; sync(arr); setActiveIdx(arr.length-1); setSelId(null);
  };

  const dupSlide = (i) => {
    const ns={...slides[i],id:sid(),elements:slides[i].elements.map(e=>({...e,id:uid()}))};
    const arr=[...slides]; arr.splice(i+1,0,ns); sync(arr); setActiveIdx(i+1);
  };
  const rmSlide = (i) => {
    if(slides.length<=1) return;
    const arr=slides.filter((_,j)=>j!==i); sync(arr);
    setActiveIdx(Math.min(activeIdx,arr.length-1));
  };
  const setSlideBg = (color) => {
    const ns = slides.map((sl,i)=>i!==activeIdx?sl:{...sl,bg:color});
    sync(ns, { type: 'UPDATE_SLIDE', slideId: slides[activeIdx].id, slide: ns[activeIdx] });
  };

  /* â”€â”€ Drag-reorder slides â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const slDragStart = (e,i) => {
    setDragSl(i);
    const g=document.createElement('div'); g.style.opacity='0';
    document.body.appendChild(g); e.dataTransfer.setDragImage(g,0,0);
    setTimeout(()=>document.body.removeChild(g),0);
  };
  const slDrop = (e,i) => {
    e.preventDefault();
    if(dragSl===null||dragSl===i){setDragSl(null);setDragOver(null);return;}
    const arr=[...slides]; const[m]=arr.splice(dragSl,1); arr.splice(i,0,m);
    sync(arr);
    if(activeIdx===dragSl) setActiveIdx(i);
    setDragSl(null); setDragOver(null);
  };

  /* â”€â”€ Image upload â€” FIXED â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleImg = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      // center the image on the slide
      addEl(mkImage(ev.target.result, 160, 100, 400, 280));
    };
    reader.onerror = () => console.error('Failed to read image');
    reader.readAsDataURL(file);
    // reset so same file can be re-uploaded
    e.target.value = '';
  };

  /* â”€â”€ Keyboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    const h = (e) => {
      const tag = document.activeElement?.tagName;
      const ce = document.activeElement?.isContentEditable;
      if (tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||ce) return;
      if((e.metaKey||e.ctrlKey)&&e.key==='z'){e.preventDefault();undo();}
      if((e.metaKey||e.ctrlKey)&&e.key==='y'){e.preventDefault();redo();}
      if((e.metaKey||e.ctrlKey)&&e.key==='d'){e.preventDefault();dupEl();}
      if((e.key==='Delete'||e.key==='Backspace')&&selId){e.preventDefault();delEl(selId);}
      if(e.key==='Escape') setSelId(null);
      if(e.key==='F5'){e.preventDefault();setShowSS(true);}
    };
    window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h);
  }, [selId, histIdx, slides, activeIdx]);

  /* â”€â”€ PPTX export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const exportPptx = async () => {
    const pptx = new PptxGenJS(); pptx.layout='LAYOUT_16x9';
    const strip = c => (c||'').replace('#','');
    slides.forEach(slide => {
      const s = pptx.addSlide();
      s.background = { fill: strip(slide.bg||theme.bg) };
      (slide.elements||[]).forEach(el => {
        const px=v=>(v/960*10), py=v=>(v/540*7.5), st=el.style||{};
        if(el.type==='text'){
          s.addText(el.text||'',{ x:px(el.x),y:py(el.y),w:px(el.w),h:py(el.h),fontSize:st.fontSize||24,bold:st.bold||false,italic:st.italic||false,underline:st.underline||false,color:strip(st.color||'ffffff'),align:st.align||'left',fontFace:st.fontFamily||'Outfit' });
        } else if(el.type==='image'&&el.src?.startsWith('data:')){
          try { s.addImage({ data:el.src,x:px(el.x),y:py(el.y),w:px(el.w),h:py(el.h) }); } catch{}
        } else if(el.type==='shape'){
          s.addShape('rect',{ x:px(el.x),y:py(el.y),w:px(el.w),h:py(el.h),fill:{color:strip(st.fill||'3b82f6')} });
        }
      });
    });
    try { await pptx.writeFile({ fileName:'Presentation.pptx' }); } catch(e){ console.error(e); }
  };

  /* â”€â”€ Computed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const W=Math.round(960*zoom), H=Math.round(540*zoom);
  const selEl = activeSlide?.elements.find(e=>e.id===selId)||null;

  return (
    <div style={{ display:'flex',flexDirection:'column',width:'100%',height:'100%',background:'#07090f',fontFamily:'DM Sans,sans-serif',color:'#e2e8f0',overflow:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#1e2535;border-radius:2px;}
        input[type=number]::-webkit-inner-spin-button{opacity:.4;}
        .sl-card:hover .sl-acts{opacity:1!important;}
      `}</style>

      {/* hidden file input */}
      <input ref={imgRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" style={{ display:'none' }} onChange={handleImg}/>

      {showSS && <Slideshow slides={slides} startIdx={activeIdx} themeKey={themeKey} onClose={()=>setShowSS(false)}/>}

      {/* â•”â• TOP BAR â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•— */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 14px',background:'#0d1117',borderBottom:'1px solid #131c28',gap:8,flexShrink:0,height:44 }}>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <div style={{ display:'flex',alignItems:'center',gap:5,padding:'3px 10px',background:'rgba(251,191,36,.07)',border:'1px solid rgba(251,191,36,.12)',borderRadius:6 }}>
            <MonitorPlay size={12} style={{ color:'#d97706' }}/><span style={{ fontSize:11,fontWeight:700,color:'#d97706' }}>Slides</span>
          </div>
          <span style={{ fontSize:11,color:'rgba(165,180,252,.95)',fontWeight:700 }}>{slides.length} slides</span>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
          {/* Theme picker */}
          <div style={{ position:'relative' }}>
            <button onClick={()=>setShowTheme(p=>!p)} style={{ display:'flex',alignItems:'center',gap:6,padding:'4px 10px',background:'rgba(255,255,255,.03)',border:'1px solid #1a2035',borderRadius:7,color:'#5a6480',fontSize:11,fontWeight:600,cursor:'pointer' }}>
              <div style={{ width:12,height:12,borderRadius:3,background:theme.bg,border:'1px solid rgba(255,255,255,.12)',flexShrink:0 }}/>
              <Palette size={11}/> {theme.name}
            </button>
            {showTheme&&(
              <>
                <div style={{ position:'fixed',inset:0,zIndex:300 }} onClick={()=>setShowTheme(false)}/>
                <div style={{ position:'absolute',top:'calc(100% + 6px)',right:0,zIndex:400,background:'#0d1117',border:'1px solid #1e2535',borderRadius:12,padding:14,boxShadow:'0 20px 60px rgba(0,0,0,.9)',width:316 }}>
                  <div style={{ fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#2a3350',marginBottom:10 }}>Presentation Theme</div>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8 }}>
                    {Object.entries(THEMES).map(([k,t])=>(
                      <div key={k} onClick={()=>{onThemeChange?.(k);setShowTheme(false);}} title={t.name}
                        style={{ height:40,borderRadius:8,cursor:'pointer',background:t.grad,border:themeKey===k?'2px solid #6366f1':'2px solid transparent',display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 0 4px',transition:'all .15s',boxShadow:themeKey===k?'0 0 0 3px rgba(99,102,241,.2)':'none' }}>
                        <span style={{ fontSize:8,fontWeight:700,color:'rgba(255,255,255,.85)',textShadow:'0 1px 4px rgba(0,0,0,.9)' }}>{t.name}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:12,paddingTop:12,borderTop:'1px solid #1e2535' }}>
                    <div style={{ fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#2a3350',marginBottom:8 }}>Slide BG Override</div>
                    <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                      <input type="color" value={activeSlide?.bg||theme.bg} onChange={e=>setSlideBg(e.target.value)} style={{ width:32,height:28,padding:2,border:'1px solid #1e2535',borderRadius:5,cursor:'pointer',background:'#0d1117' }}/>
                      <button onClick={()=>setSlideBg(null)} style={{ ...sb,fontSize:10 }}>Use Theme Default</button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <button onClick={()=>setShowSS(true)} style={{ display:'flex',alignItems:'center',gap:5,padding:'5px 14px',background:'rgba(251,191,36,.09)',color:'#fbbf24',border:'1px solid rgba(251,191,36,.18)',borderRadius:999,fontSize:11,fontWeight:700,cursor:'pointer' }}><Play size={12}/> Present</button>
          <button onClick={exportPptx} style={{ display:'flex',alignItems:'center',gap:5,padding:'5px 14px',background:'rgba(99,102,241,.1)',color:'#a78bfa',border:'1px solid rgba(99,102,241,.2)',borderRadius:999,fontSize:11,fontWeight:700,cursor:'pointer' }}><Download size={12}/> Export PPTX</button>
        </div>
      </div>

      {/* â•”â• INSERT TOOLBAR â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•— */}
      {!isReadOnly&&(
        <div style={{ display:'flex',alignItems:'center',gap:3,padding:'4px 12px',background:'#0a0e18',borderBottom:'1px solid #131c28',flexShrink:0,flexWrap:'wrap' }}>
          <TB onClick={undo} disabled={histIdx<=0} title="Undo Ctrl+Z"><RotateCcw size={13}/></TB>
          <TB onClick={redo} disabled={histIdx>=histArr.length-1} title="Redo Ctrl+Y"><RotateCw size={13}/></TB>
          <Div/>
          {/* Text inserts */}
          <TB onClick={()=>addEl(mkText(80,80,600,90,'Heading',{fontSize:52,bold:true,color:theme.h1}))} title="Add Heading"><span style={{ fontFamily:'Outfit',fontWeight:800,fontSize:13 }}>H1</span></TB>
          <TB onClick={()=>addEl(mkText(80,180,600,70,'Subheading',{fontSize:32,color:theme.h2}))} title="Add Subheading"><span style={{ fontFamily:'Outfit',fontWeight:700,fontSize:11 }}>H2</span></TB>
          <TB onClick={()=>addEl(mkText(80,260,700,120,'Body text â€” double-click to edit',{fontSize:20,color:theme.body}))} title="Add Body Text"><Type size={13}/></TB>
          <TB onClick={()=>addEl(mkText(80,380,300,44,'Label',{fontSize:13,bold:true,color:theme.body,background:'rgba(255,255,255,.1)',borderRadius:6,padding:10}))} title="Add Label badge" label=""><span style={{ fontSize:9,border:'1px solid currentColor',padding:'1px 5px',borderRadius:3 }}>Label</span></TB>
          <Div/>
          {/* Shapes */}
          <TB onClick={()=>addEl(mkShape('rect',160,160,240,120))} title="Rectangle"><Square size={13}/></TB>
          <TB onClick={()=>addEl(mkDivider(60,260,840,3))} title="Divider line"><Minus size={13}/></TB>
          <Div/>
          {/* Image â€” trigger file dialog */}
          <TB onClick={()=>imgRef.current?.click()} title="Upload image from device"><ImageIcon size={13}/> <span style={{ fontSize:11 }}>Image</span></TB>
          <Div/>
          {/* Selection actions */}
          {selId&&(
            <>
              <TB onClick={dupEl} title="Duplicate Ctrl+D"><Copy size={13}/><span style={{ fontSize:11 }}>Dupe</span></TB>
              <TB onClick={()=>delEl(selId)} danger title="Delete (Del)"><Trash2 size={13}/></TB>
            </>
          )}
          {/* Zoom */}
          <div style={{ display:'flex',alignItems:'center',gap:4,marginLeft:'auto',background:'rgba(255,255,255,.03)',border:'1px solid #131c28',borderRadius:6,padding:'2px 6px' }}>
            <button onClick={()=>setZoom(z=>Math.max(.3,+(z-.1).toFixed(1)))} style={{ background:'none',border:'none',color:'rgba(255,255,255,.75)',cursor:'pointer',padding:0,display:'flex' }}><ZoomOut size={12}/></button>
            <button onClick={()=>setZoom(1)} style={{ background:'none',border:'none',color:'rgba(255,255,255,.75)',cursor:'pointer',fontSize:10,fontWeight:700,padding:'0 4px',fontFamily:'DM Sans,sans-serif',width:36,textAlign:'center' }}>{Math.round(zoom*100)}%</button>
            <button onClick={()=>setZoom(z=>Math.min(2,+(z+.1).toFixed(1)))} style={{ background:'none',border:'none',color:'rgba(255,255,255,.75)',cursor:'pointer',padding:0,display:'flex' }}><ZoomIn size={12}/></button>
          </div>
        </div>
      )}

      {/* â•”â• WORKSPACE â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•— */}
      <div style={{ display:'flex',flex:1,overflow:'hidden' }}>

        {/* â”€â”€ Left: Slide list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{ width:190,background:'#09111c',borderRight:'1px solid #131c28',display:'flex',flexDirection:'column',flexShrink:0 }}>
          <div style={{ padding:'7px 10px',borderBottom:'1px solid #131c28',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:4 }}>
            <span style={{ fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:1.2,color:'rgba(255,255,255,.70)' }}>Slides</span>
            {!isReadOnly&&(
              <div style={{ display:'flex',gap:3,flexWrap:'wrap' }}>
                {[['blank','Blank'],['title','Title'],['content','Content'],['twocol','2-Col'],['quote','Quote']].map(([t,l])=>(
                  <button key={t} onClick={()=>addSlide(t)} title={`Add ${l} slide`}
                    style={{ background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.12)',color:'#6366f1',fontSize:8,padding:'2px 5px',borderRadius:4,cursor:'pointer',fontWeight:700,fontFamily:'DM Sans,sans-serif' }}>
                    {t==='blank'?<Plus size={8}/>:l}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ flex:1,overflowY:'auto',padding:'8px 8px 16px',display:'flex',flexDirection:'column',gap:6 }}>
            {slides.map((sl,i)=>(
              <div key={sl.id} style={{ display:'flex',alignItems:'flex-start',gap:4 }}>
                <span style={{ fontSize:9,fontWeight:700,color:'#1a2335',width:12,textAlign:'right',paddingTop:4,flexShrink:0 }}>{i+1}</span>
                {!isReadOnly&&(
                  <div draggable onDragStart={e=>slDragStart(e,i)} onDragEnd={()=>{setDragSl(null);setDragOver(null);}}
                    style={{ color:'#162030',cursor:'grab',paddingTop:4,flexShrink:0 }}>
                    <GripVertical size={11}/>
                  </div>
                )}
                <div className="sl-card"
                  onClick={()=>{setActiveIdx(i);setSelId(null);}}
                  onDragOver={e=>{e.preventDefault();setDragOver(i);}}
                  onDrop={e=>slDrop(e,i)}
                  style={{
                    flex:1,aspectRatio:'16/9',borderRadius:5,overflow:'hidden',cursor:'pointer',position:'relative',
                    border:activeIdx===i?'2px solid #6366f1':dragOver===i?'2px dashed #4ade80':'1.5px solid #131c28',
                    background:sl.bg||theme.bg,
                    boxShadow:activeIdx===i?'0 0 0 2px rgba(99,102,241,.15)':'none',
                    opacity:dragSl===i?.3:1, transition:'border .12s,box-shadow .12s',
                  }}
                >
                  <SlideThumb slide={sl} theme={theme}/>
                  {!isReadOnly&&(
                    <div className="sl-acts" style={{ position:'absolute',top:2,right:2,display:'flex',gap:2,opacity:0,transition:'opacity .12s' }}>
                      <button onClick={e=>{e.stopPropagation();dupSlide(i);}} style={{ background:'rgba(0,0,0,.75)',border:'none',color:'#e2e8f0',width:16,height:16,borderRadius:3,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><Copy size={9}/></button>
                      {slides.length>1&&<button onClick={e=>{e.stopPropagation();rmSlide(i);}} style={{ background:'rgba(0,0,0,.75)',border:'none',color:'#f87171',width:16,height:16,borderRadius:3,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><Trash2 size={9}/></button>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* â”€â”€ Center: Canvas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'radial-gradient(ellipse at 50% 40%,#0c1428 0%,#050810 70%)',overflow:'auto',padding:32,position:'relative' }}>
          {/* dot grid */}
          <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(circle,#1e2a42 1px,transparent 1px)',backgroundSize:'24px 24px',opacity:.28,pointerEvents:'none' }}/>

          <div ref={canvasRef} onClick={e=>{ if(e.target===canvasRef.current||e.currentTarget===e.target) setSelId(null); }}
            style={{ width:W,height:H,position:'relative',background:activeSlide?.bg||theme.bg,boxShadow:'0 10px 50px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.04)',borderRadius:4,flexShrink:0,overflow:'hidden',transition:'background .3s' }}>
            {/* inner 960Ã—540 scaled */}
            <div style={{ position:'absolute',inset:0,transform:`scale(${zoom})`,transformOrigin:'0 0',width:960,height:540 }}>
              {(activeSlide?.elements||[]).map(el=>(
                <ElWrap key={el.id} el={el} selected={selId===el.id}
                  onSelect={()=>setSelId(el.id)}
                  onChange={p=>updEl(el.id,p)}
                  onDelete={()=>delEl(el.id)}
                  zoom={zoom} readOnly={isReadOnly}/>
              ))}
            </div>
            {/* slide num */}
            <div style={{ position:'absolute',bottom:10,right:14,fontSize:11,fontWeight:700,color:'rgba(128,128,128,.2)',pointerEvents:'none',fontFamily:'DM Sans,sans-serif' }}>{activeIdx+1}/{slides.length}</div>
            {/* empty state */}
            {!isReadOnly&&(activeSlide?.elements||[]).length===0&&(
              <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,pointerEvents:'none' }}>
                <div style={{ width:48,height:48,borderRadius:12,border:'2px dashed rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center' }}><Plus size={20} style={{ color:'rgba(255,255,255,.12)' }}/></div>
                <p style={{ fontSize:13,color:'rgba(255,255,255,.12)',margin:0 }}>Use the toolbar to add elements</p>
              </div>
            )}
          </div>
        </div>

        {/* â”€â”€ Right: Properties â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {!isReadOnly&&(
          <div style={{ width:198,background:'#09111c',borderLeft:'1px solid #131c28',display:'flex',flexDirection:'column',flexShrink:0,overflowY:'auto' }}>
            <div style={{ padding:'8px 10px',borderBottom:'1px solid #131c28',fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:1.2,color:'rgba(255,255,255,.70)' }}>Properties</div>
            <PropPanel el={selEl} onChange={p=>updEl(selId,p)} theme={theme}/>
          </div>
        )}
      </div>

      {/* â•”â• STATUS BAR â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•— */}
      <div style={{ display:'flex',alignItems:'center',gap:12,padding:'3px 14px',background:'#070910',borderTop:'1px solid #0d1117',fontSize:10,color:'rgba(165,180,252,.85)',flexShrink:0,fontFamily:'DM Sans,sans-serif' }}>
        <span>{slides.length} slides</span><span style={{ color:'rgba(165,180,252,.45)' }}>Â·</span>
        <span>{theme.name} theme</span><span>Â·</span>
        <span>{Math.round(zoom*100)}%</span>
        {selEl&&<><span>Â·</span><span style={{ color:'#4a5880' }}>{selEl.type} selected{selEl.type==='text'?' Â· double-click to edit':''}</span></>}
        <span style={{ marginLeft:'auto' }}>F5 present Â· Ctrl+Z undo Â· Del delete</span>
      </div>
    </div>
  );
}
