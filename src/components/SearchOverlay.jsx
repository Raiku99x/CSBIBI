import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import PostCard from "./PostCard";
import UserProfilePage from "../pages/UserProfilePage";
import { useAuth } from "../contexts/AuthContext";
import { useBackButton } from "../hooks/useBackButton";
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { useDarkMode } from "../contexts/DarkModeContext";

const RED = '#C0392B';

const TYPES = [
  { label: "All", value: "all" },
  { label: "💬 Status", value: "status" },
  { label: "📢 Announcement", value: "announcement" },
  { label: "📅 Deadline", value: "deadline" },
  { label: "🔔 Reminder", value: "reminder" },
  { label: "📁 Material", value: "material" },
];

const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Custom", value: "custom" },
];

function CollapsibleSection({ title, children, activeCount = 0 }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #F0F2F5" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", background:"none", border:"none", padding:"11px 0", cursor:"pointer", color:"#65676B", fontSize:"12px", fontWeight:700, letterSpacing:"0.05em", textTransform:"uppercase", fontFamily:'"Instrument Sans", system-ui' }}
      >
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span>{title}</span>
          {activeCount > 0 && (
            <span style={{ background:RED, color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>
              {activeCount}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={14} color="#BCC0C4" /> : <ChevronDown size={14} color="#BCC0C4" />}
      </button>
      {open && <div style={{ paddingBottom:"12px" }}>{children}</div>}
    </div>
  );
}

const PillBtn = ({ label, active, onClick }) => (
  <button onClick={onClick}
    style={{ padding:"5px 12px", borderRadius:"20px", border:`1.5px solid ${active ? RED : '#E4E6EB'}`, background:active?'#FADBD8':'white', color:active?RED:'#65676B', fontSize:"13px", cursor:"pointer", fontWeight:active?700:500, fontFamily:'"Instrument Sans", system-ui', transition:"all 0.15s" }}>
    {label}
  </button>
);

export default function SearchOverlay({ onClose, subjects = [] }) {
  const { user } = useAuth();
  const { dark, colors } = useDarkMode();
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeType, setActiveType] = useState("all");
  const [activeSubjectId, setActiveSubjectId] = useState("all");
  const [activeDatePreset, setActiveDatePreset] = useState(null);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [viewingUserId, setViewingUserId] = useState(null);
  const inputRef = useRef(null);

  // Back button closes the overlay
  useBackButton(onClose);

  useEffect(() => {
    supabase.from("posts").select("*, profiles!posts_author_id_fkey(*), subjects!posts_subject_id_fkey(*)")
      .order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { if (data) setPosts(data); setPostsLoading(false); });
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 280);
    return () => clearTimeout(t);
  }, [query]);

  const activeFilterCount = [
    activeType !== "all",
    activeSubjectId !== "all",
    activeDatePreset !== null,
  ].filter(Boolean).length;

  const filtered = posts.filter((post) => {
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      const haystack = [post.caption || "", post.profiles?.display_name || "", post.subjects?.name || "", post.announcement_type || ""].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (activeType !== "all") {
      const match = post.sub_type === activeType || (activeType === "announcement" && post.post_type === "announcement" && !post.sub_type);
      if (!match) return false;
    }
    if (activeSubjectId !== "all" && post.subject_id !== activeSubjectId) return false;
    if (activeDatePreset) {
      const now = new Date();
      const postDate = new Date(post.created_at);
      if (activeDatePreset === "today") { if (postDate.toDateString() !== now.toDateString()) return false; }
      else if (activeDatePreset === "week") { const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7); if (postDate < weekAgo) return false; }
      else if (activeDatePreset === "month") { const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1); if (postDate < monthAgo) return false; }
      else if (activeDatePreset === "custom" && customStart && customEnd) { const start = new Date(customStart); const end = new Date(customEnd); end.setHours(23, 59, 59); if (postDate < start || postDate > end) return false; }
    }
    return true;
  });

  const showResults = debouncedQuery || activeFilterCount > 0;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", flexDirection:"column", background:colors.pageBg }}>

      {/* TOP BAR */}
      <div style={{ background:colors.cardBg, borderBottom:`1px solid ${colors.border}`, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"10px 12px", paddingTop:"calc(10px + env(safe-area-inset-top))", maxWidth:680, margin:'0 auto', width:'100%' }}>

          <button onClick={onClose}
            style={{ background:"#F4F6F8", border:"1.5px solid #E4E6EB", borderRadius:"9px", width:"36px", height:"36px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#EAECEF'}
            onMouseLeave={e => e.currentTarget.style.background = '#F4F6F8'}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#65676B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>

          <div style={{ flex:1, display:"flex", alignItems:"center", background:colors.surface, borderRadius:"20px", padding:"0 12px", gap:"8px", height:38, minWidth:0 }}>
            <Search size={15} color="#8A8D91" style={{ flexShrink:0 }}/>
            <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search posts…"
              style={{ flex:1, background:"none", border:"none", outline:"none", color:colors.textPri, fontSize:"14px", fontFamily:'"Instrument Sans", system-ui', minWidth:0 }}/>
            {query.length > 0 && (
              <button onClick={() => setQuery("")}
                style={{ background:"#CED0D4", border:"none", color:"#65676B", width:18, height:18, borderRadius:'50%', cursor:"pointer", padding:0, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <X size={11}/>
              </button>
            )}
          </div>

          <button onClick={() => setShowFilters((s) => !s)}
            style={{ position:"relative", background:showFilters?'#FADBD8':"#F4F6F8", border:`1.5px solid ${showFilters?'#F5B7B1':"#E4E6EB"}`, borderRadius:"9px", width:"36px", height:"36px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, transition:"all 0.15s" }}>
            <SlidersHorizontal size={16} color={showFilters ? RED : "#65676B"}/>
            {!showFilters && activeFilterCount > 0 && (
              <span style={{ position:"absolute", top:"-4px", right:"-4px", background:RED, color:"#fff", borderRadius:"50%", width:"15px", height:"15px", fontSize:"9px", fontWeight:700, fontFamily:'"Instrument Sans", system-ui', display:"flex", alignItems:"center", justifyContent:"center", border:'2px solid white' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* FILTER PANEL */}
        {showFilters && (
          <div style={{ borderTop:"1px solid #F0F2F5", background:"white", flexShrink:0 }}>
            <div style={{ padding:"0 16px", maxWidth:680, margin:'0 auto', width:'100%', maxHeight:'40vh', overflowY:'auto' }}>
              <CollapsibleSection title="By Type" activeCount={activeType !== "all" ? 1 : 0}>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                  {TYPES.map((t) => <PillBtn key={t.value} label={t.label} active={activeType === t.value} onClick={() => setActiveType(t.value)}/>)}
                </div>
              </CollapsibleSection>
              <CollapsibleSection title="By Subject" activeCount={activeSubjectId !== "all" ? 1 : 0}>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                  <PillBtn label="All Subjects" active={activeSubjectId === "all"} onClick={() => setActiveSubjectId("all")}/>
                  {subjects.map((s) => <PillBtn key={s.id} label={s.name} active={activeSubjectId === s.id} onClick={() => setActiveSubjectId(s.id)}/>)}
                </div>
              </CollapsibleSection>
              <CollapsibleSection title="By Date" activeCount={activeDatePreset ? 1 : 0}>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                  {DATE_PRESETS.map((d) => <PillBtn key={d.value} label={d.label} active={activeDatePreset === d.value} onClick={() => setActiveDatePreset((p) => p === d.value ? null : d.value)}/>)}
                </div>
                {activeDatePreset === "custom" && (
                  <div style={{ marginTop:"10px", display:"flex", gap:"8px", alignItems:"center" }}>
                    <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={{ flex:1, background:"#F7F8FA", border:"1.5px solid #E4E6EB", borderRadius:"8px", color:"#050505", padding:"7px 10px", fontSize:"13px", outline:"none", fontFamily:'"Instrument Sans", system-ui' }}/>
                    <span style={{ color:'#BCC0C4', fontSize:"12px" }}>–</span>
                    <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={{ flex:1, background:"#F7F8FA", border:"1.5px solid #E4E6EB", borderRadius:"8px", color:"#050505", padding:"7px 10px", fontSize:"13px", outline:"none", fontFamily:'"Instrument Sans", system-ui' }}/>
                  </div>
                )}
              </CollapsibleSection>
              {activeFilterCount > 0 && (
                <div style={{ padding:'10px 0' }}>
                  <button onClick={() => { setActiveType("all"); setActiveSubjectId("all"); setActiveDatePreset(null); setCustomStart(""); setCustomEnd(""); }}
                    style={{ background:'#FADBD8', border:'1.5px solid #F5B7B1', borderRadius:"8px", color:RED, padding:"7px 16px", fontSize:"13px", cursor:"pointer", width:"100%", fontWeight:700, fontFamily:'"Instrument Sans", system-ui', transition:'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F5B7B1'}
                    onMouseLeave={e => e.currentTarget.style.background = '#FADBD8'}>
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RESULTS */}
      <div style={{ flex:1, overflowY:"auto", paddingBottom:"calc(64px + env(safe-area-inset-bottom))" }}>
        {!showResults ? (
          <div style={{ textAlign:"center", marginTop:"80px", padding:'0 24px' }}>
            <div style={{ width:68, height:68, borderRadius:18, background:'white', border:'1px solid #E4E6EB', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
              <Search size={28} color="#BCC0C4"/>
            </div>
            <p style={{ fontFamily:'"Bricolage Grotesque", system-ui', fontWeight:800, fontSize:17, color:'#050505', margin:'0 0 6px' }}>Search posts</p>
            <p style={{ fontFamily:'"Instrument Sans", system-ui', fontSize:13.5, color:'#65676B', margin:0 }}>Type to find announcements, deadlines, materials, and more</p>
          </div>
        ) : postsLoading ? (
          <div style={{ textAlign:"center", marginTop:"60px" }}>
            <div style={{ width:28, height:28, borderRadius:'50%', border:`3px solid #F0F2F5`, borderTopColor:RED, animation:'spin 0.7s linear infinite', margin:'0 auto' }}/>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            <div style={{ padding:'8px 16px', maxWidth:680, margin:'0 auto', width:'100%' }}>
              <span style={{ fontFamily:'"Instrument Sans", system-ui', fontSize:12, fontWeight:600, color:'#8A8D91' }}>
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}{debouncedQuery ? ` for "${debouncedQuery}"` : ''}
              </span>
            </div>
            {filtered.length === 0 ? (
              <div style={{ textAlign:"center", padding:'48px 24px' }}>
                <div style={{ fontSize:"36px", marginBottom:"8px" }}>🫙</div>
                <p style={{ fontFamily:'"Bricolage Grotesque", system-ui', fontWeight:800, fontSize:16, color:'#050505', margin:'0 0 6px' }}>No posts found</p>
                <p style={{ fontFamily:'"Instrument Sans", system-ui', fontSize:13.5, color:'#65676B', margin:0 }}>Try different keywords or filters</p>
              </div>
            ) : (
              <div style={{ maxWidth:680, margin:'0 auto', width:'100%' }}>
                {filtered.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={user?.id}
                    onUserClick={(p) => setViewingUserId(p?.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {viewingUserId && (
        <UserProfilePage
          userId={viewingUserId}
          onClose={() => setViewingUserId(null)}
        />
      )}
    </div>
  );
}
