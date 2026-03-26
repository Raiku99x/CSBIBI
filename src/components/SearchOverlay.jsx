import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import PostCard from "./PostCard";
import { useAuth } from "../contexts/AuthContext";

const TYPES = [
  { label: "All", value: "all" },
  { label: "Status", value: "status" },
  { label: "Announcement", value: "announcement" },
  { label: "Deadline", value: "deadline" },
  { label: "Reminder", value: "reminder" },
  { label: "Material", value: "material" },
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
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "none",
          border: "none",
          padding: "9px 0",
          cursor: "pointer",
          color: "#fff",
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          opacity: 0.65,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>{title}</span>
          {activeCount > 0 && (
            <span style={{
              background: "#6366f1",
              color: "#fff",
              borderRadius: "50%",
              width: 14,
              height: 14,
              fontSize: 9,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {activeCount}
            </span>
          )}
        </div>
        <span style={{
          fontSize: "16px",
          lineHeight: 1,
          transition: "transform 0.2s",
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          opacity: 0.5,
        }}>
          ›
        </span>
      </button>
      {open && <div style={{ paddingBottom: "10px" }}>{children}</div>}
    </div>
  );
}

const PillBtn = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "4px 11px",
      borderRadius: "20px",
      border: "1px solid rgba(255,255,255,0.18)",
      background: active ? "rgba(99,102,241,0.55)" : "rgba(255,255,255,0.07)",
      color: "#fff",
      fontSize: "12px",
      cursor: "pointer",
      fontWeight: active ? 700 : 400,
      transition: "background 0.15s",
    }}
  >
    {label}
  </button>
);

export default function SearchOverlay({ onClose, subjects = [] }) {
  const { user } = useAuth();
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
  const inputRef = useRef(null);

  // Fetch all posts once on mount
  useEffect(() => {
    supabase
      .from("posts")
      .select("*, profiles(*), subjects(*)")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (data) setPosts(data);
        setPostsLoading(false);
      });
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      const haystack = [
        post.caption || "",
        post.profiles?.display_name || "",
        post.subjects?.name || "",
        post.announcement_type || "",
      ].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (activeType !== "all") {
      const match =
        post.sub_type === activeType ||
        (activeType === "announcement" &&
          post.post_type === "announcement" &&
          !post.sub_type);
      if (!match) return false;
    }

    if (activeSubjectId !== "all" && post.subject_id !== activeSubjectId) return false;

    if (activeDatePreset) {
      const now = new Date();
      const postDate = new Date(post.created_at);
      if (activeDatePreset === "today") {
        if (postDate.toDateString() !== now.toDateString()) return false;
      } else if (activeDatePreset === "week") {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        if (postDate < weekAgo) return false;
      } else if (activeDatePreset === "month") {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        if (postDate < monthAgo) return false;
      } else if (activeDatePreset === "custom" && customStart && customEnd) {
        const start = new Date(customStart);
        const end = new Date(customEnd);
        end.setHours(23, 59, 59);
        if (postDate < start || postDate > end) return false;
      }
    }
    return true;
  });

  const showResults = debouncedQuery || activeFilterCount > 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      {/* TOP BAR */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 12px",
          paddingTop: "calc(10px + env(safe-area-inset-top))",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        {/* Search input */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            background: "rgba(255,255,255,0.1)",
            borderRadius: "10px",
            padding: "0 10px",
            gap: "7px",
            minWidth: 0,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts…"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: "15px",
              padding: "9px 0",
              minWidth: 0,
            }}
          />
          {query.length > 0 && (
            <button
              onClick={() => setQuery("")}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.4)",
                fontSize: "18px",
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Filter button — icon only, no text */}
        <button
          onClick={() => setShowFilters((s) => !s)}
          style={{
            position: "relative",
            background: showFilters
              ? "rgba(99,102,241,0.4)"
              : "rgba(255,255,255,0.1)",
            border: `1px solid ${showFilters ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.15)"}`,
            borderRadius: "10px",
            width: "38px",
            height: "38px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.18s",
          }}
          title="Filters"
        >
          {showFilters ? (
            /* X to close filter panel */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            /* Funnel */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          )}
          {!showFilters && activeFilterCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                background: "#6366f1",
                color: "#fff",
                borderRadius: "50%",
                width: "15px",
                height: "15px",
                fontSize: "9px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Back / close */}
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "10px",
            width: "38px",
            height: "38px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
          title="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>

      {/* FILTER PANEL */}
      {showFilters && (
        <div
          style={{
            padding: "2px 14px 4px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.25)",
            flexShrink: 0,
            overflowY: "auto",
            maxHeight: "48vh",
          }}
        >
          <CollapsibleSection title="By Type" activeCount={activeType !== "all" ? 1 : 0}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {TYPES.map((t) => (
                <PillBtn key={t.value} label={t.label} active={activeType === t.value} onClick={() => setActiveType(t.value)} />
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="By Subject" activeCount={activeSubjectId !== "all" ? 1 : 0}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              <PillBtn label="All" active={activeSubjectId === "all"} onClick={() => setActiveSubjectId("all")} />
              {subjects.map((s) => (
                <PillBtn key={s.id} label={s.name} active={activeSubjectId === s.id} onClick={() => setActiveSubjectId(s.id)} />
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="By Date" activeCount={activeDatePreset ? 1 : 0}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {DATE_PRESETS.map((d) => (
                <PillBtn
                  key={d.value}
                  label={d.label}
                  active={activeDatePreset === d.value}
                  onClick={() => setActiveDatePreset((p) => p === d.value ? null : d.value)}
                />
              ))}
            </div>
            {activeDatePreset === "custom" && (
              <div style={{ marginTop: "8px", display: "flex", gap: "6px", alignItems: "center" }}>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                  style={{ flex: 1, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#fff", padding: "5px 7px", fontSize: "12px", outline: "none" }} />
                <span style={{ opacity: 0.4, fontSize: "11px" }}>–</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                  style={{ flex: 1, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#fff", padding: "5px 7px", fontSize: "12px", outline: "none" }} />
              </div>
            )}
          </CollapsibleSection>

          {activeFilterCount > 0 && (
            <button
              onClick={() => { setActiveType("all"); setActiveSubjectId("all"); setActiveDatePreset(null); setCustomStart(""); setCustomEnd(""); }}
              style={{ marginTop: "8px", marginBottom: "4px", background: "none", border: "1px solid rgba(255,100,100,0.35)", borderRadius: "8px", color: "rgba(255,160,160,1)", padding: "5px 12px", fontSize: "11px", cursor: "pointer", width: "100%", fontWeight: 600 }}
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* RESULTS */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 0",
          paddingBottom: "calc(14px + env(safe-area-inset-bottom))",
        }}
      >
        {!showResults ? (
          <div style={{ textAlign: "center", marginTop: "70px", opacity: 0.3, fontSize: "15px" }}>
            <div style={{ fontSize: "38px", marginBottom: "8px" }}>🔍</div>
            Type to search posts
          </div>
        ) : postsLoading ? (
          <div style={{ textAlign: "center", marginTop: "60px", opacity: 0.4, fontSize: "14px" }}>Loading…</div>
        ) : (
          <>
            <p style={{ fontSize: "11px", opacity: 0.4, margin: "0 14px 6px" }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </p>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", marginTop: "50px", opacity: 0.35, fontSize: "14px" }}>
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>🫙</div>
                No posts found
              </div>
            ) : (
              filtered.map((post) => (
                <PostCard key={post.id} post={post} currentUserId={user?.id} />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
