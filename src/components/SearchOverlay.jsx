import { useState, useEffect, useRef, useCallback } from "react";
import PostCard from "./PostCard";

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

function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "none",
          border: "none",
          padding: "10px 0",
          cursor: "pointer",
          color: "#fff",
          fontSize: "13px",
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          opacity: 0.7,
        }}
      >
        <span>{title}</span>
        <span
          style={{
            fontSize: "18px",
            lineHeight: 1,
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            opacity: 0.6,
          }}
        >
          ›
        </span>
      </button>
      {open && (
        <div style={{ paddingBottom: "12px" }}>{children}</div>
      )}
    </div>
  );
}

export default function SearchOverlay({ onClose, posts = [], subjects = [] }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeType, setActiveType] = useState("all");
  const [activeSubject, setActiveSubject] = useState("all");
  const [activeDatePreset, setActiveDatePreset] = useState(null);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const activeFilterCount = [
    activeType !== "all",
    activeSubject !== "all",
    activeDatePreset !== null,
  ].filter(Boolean).length;

  const filtered = posts.filter((post) => {
    const text = `${post.content || ""} ${post.authorName || ""} ${post.subject || ""}`.toLowerCase();
    const q = debouncedQuery.toLowerCase();
    if (q && !text.includes(q)) return false;
    if (activeType !== "all" && post.type !== activeType) return false;
    if (activeSubject !== "all" && post.subject !== activeSubject) return false;
    if (activeDatePreset) {
      const now = new Date();
      const postDate = new Date(post.createdAt || post.date || Date.now());
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

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      {/* ── TOP BAR ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 14px",
          paddingTop: "calc(12px + env(safe-area-inset-top))",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
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
            padding: "0 12px",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "16px", opacity: 0.6 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts..."
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: "15px",
              padding: "10px 0",
            }}
          />
          {query.length > 0 && (
            <button
              onClick={() => setQuery("")}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.5)",
                fontSize: "18px",
                cursor: "pointer",
                padding: "0",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Filter icon button — icon only, badge if filters active */}
        <button
          onClick={() => setShowFilters((s) => !s)}
          style={{
            position: "relative",
            background: showFilters
              ? "rgba(99,102,241,0.35)"
              : "rgba(255,255,255,0.1)",
            border: showFilters
              ? "1px solid rgba(99,102,241,0.6)"
              : "1px solid rgba(255,255,255,0.15)",
            borderRadius: "10px",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.2s",
          }}
          title="Filters"
        >
          {/* Filter / X icon */}
          {showFilters ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          )}
          {/* Active count badge */}
          {!showFilters && activeFilterCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                background: "#6366f1",
                color: "#fff",
                borderRadius: "50%",
                width: "16px",
                height: "16px",
                fontSize: "10px",
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

        {/* Close overlay */}
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "10px",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            color: "#fff",
            fontSize: "20px",
            lineHeight: 1,
          }}
          title="Close"
        >
          ←
        </button>
      </div>

      {/* ── FILTER PANEL (collapsible dropdowns) ── */}
      {showFilters && (
        <div
          style={{
            padding: "4px 16px 4px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(0,0,0,0.2)",
            flexShrink: 0,
            overflowY: "auto",
            maxHeight: "55vh",
          }}
        >
          {/* By Type */}
          <CollapsibleSection title="By Type">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setActiveType(t.value)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    background:
                      activeType === t.value
                        ? "rgba(99,102,241,0.5)"
                        : "rgba(255,255,255,0.07)",
                    color: "#fff",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: activeType === t.value ? 600 : 400,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </CollapsibleSection>

          {/* By Subject */}
          <CollapsibleSection title="By Subject">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {["all", ...subjects].map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSubject(s)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    background:
                      activeSubject === s
                        ? "rgba(99,102,241,0.5)"
                        : "rgba(255,255,255,0.07)",
                    color: "#fff",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: activeSubject === s ? 600 : 400,
                    textTransform: s === "all" ? "none" : "capitalize",
                  }}
                >
                  {s === "all" ? "All Subjects" : s}
                </button>
              ))}
            </div>
          </CollapsibleSection>

          {/* By Date */}
          <CollapsibleSection title="By Date">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {DATE_PRESETS.map((d) => (
                <button
                  key={d.value}
                  onClick={() =>
                    setActiveDatePreset((p) =>
                      p === d.value ? null : d.value
                    )
                  }
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    background:
                      activeDatePreset === d.value
                        ? "rgba(99,102,241,0.5)"
                        : "rgba(255,255,255,0.07)",
                    color: "#fff",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: activeDatePreset === d.value ? 600 : 400,
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {activeDatePreset === "custom" && (
              <div
                style={{
                  marginTop: "10px",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                    color: "#fff",
                    padding: "6px 8px",
                    fontSize: "12px",
                  }}
                />
                <span style={{ opacity: 0.5, fontSize: "12px" }}>to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                    color: "#fff",
                    padding: "6px 8px",
                    fontSize: "12px",
                  }}
                />
              </div>
            )}
          </CollapsibleSection>

          {/* Reset filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setActiveType("all");
                setActiveSubject("all");
                setActiveDatePreset(null);
                setCustomStart("");
                setCustomEnd("");
              }}
              style={{
                marginTop: "10px",
                marginBottom: "6px",
                background: "none",
                border: "1px solid rgba(255,100,100,0.4)",
                borderRadius: "8px",
                color: "rgba(255,150,150,1)",
                padding: "6px 14px",
                fontSize: "12px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── RESULTS ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 14px",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
        }}
      >
        {debouncedQuery || activeFilterCount > 0 ? (
          <>
            <p
              style={{
                fontSize: "12px",
                opacity: 0.45,
                marginBottom: "10px",
                marginTop: 0,
              }}
            >
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </p>
            {filtered.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  marginTop: "60px",
                  opacity: 0.4,
                  fontSize: "15px",
                }}
              >
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>🔍</div>
                No posts found
              </div>
            ) : (
              filtered.map((post) => (
                <PostCard key={post.id} post={post} />
              ))
            )}
          </>
        ) : (
          <div
            style={{
              textAlign: "center",
              marginTop: "60px",
              opacity: 0.3,
              fontSize: "15px",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "10px" }}>🔍</div>
            Type to search posts
          </div>
        )}
      </div>
    </div>
  );
}
