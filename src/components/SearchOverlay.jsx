import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { X, Search, SlidersHorizontal, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import PostCard from './PostCard'
import { PostSkeleton } from './Skeletons'

const RED  = '#C0392B'
const BLUE = '#1A5276'

const TYPE_OPTIONS = [
  { key: 'all',          label: 'All',          emoji: '🔍' },
  { key: 'status',       label: 'Status',        emoji: '💬' },
  { key: 'announcement', label: 'Announcement',  emoji: '📢' },
  { key: 'deadline',     label: 'Deadline',      emoji: '📅' },
  { key: 'reminder',     label: 'Reminder',      emoji: '🔔' },
  { key: 'material',     label: 'Material',      emoji: '📁' },
]

const DATE_PRESETS = [
  { key: 'today',   label: 'Today' },
  { key: 'week',    label: 'This week' },
  { key: 'month',   label: 'This month' },
  { key: 'custom',  label: 'Custom range' },
]

function getPresetRange(key) {
  const now = new Date()
  if (key === 'today') {
    const start = new Date(now); start.setHours(0,0,0,0)
    const end   = new Date(now); end.setHours(23,59,59,999)
    return { start, end }
  }
  if (key === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0)
    const end   = new Date(now); end.setHours(23,59,59,999)
    return { start, end }
  }
  if (key === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end   = new Date(now); end.setHours(23,59,59,999)
    return { start, end }
  }
  return null
}

export default function SearchOverlay({ onClose, subjects = [], currentUserId }) {
  const [query, setQuery]               = useState('')
  const [typeFilter, setTypeFilter]     = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [datePreset, setDatePreset]     = useState('')
  const [customStart, setCustomStart]   = useState('')
  const [customEnd, setCustomEnd]       = useState('')
  const [showFilters, setShowFilters]   = useState(false)
  const [results, setResults]           = useState([])
  const [loading, setLoading]           = useState(false)
  const [searched, setSearched]         = useState(false)
  const inputRef = useRef()

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()
    return () => { document.body.style.overflow = '' }
  }, [])

  const doSearch = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    try {
      let q = supabase
        .from('posts')
        .select('*, profiles(*), subjects(*)')
        .order('created_at', { ascending: false })
        .limit(60)

      // Text search
      if (query.trim()) {
        q = q.ilike('caption', `%${query.trim()}%`)
      }

      // Type filter
      if (typeFilter !== 'all') {
        if (['announcement','deadline','reminder','material'].includes(typeFilter)) {
          if (typeFilter === 'announcement') {
            q = q.eq('post_type', 'announcement')
          } else {
            q = q.eq('sub_type', typeFilter)
          }
        } else if (typeFilter === 'status') {
          q = q.eq('sub_type', 'status')
        }
      }

      // Subject filter
      if (subjectFilter) {
        q = q.eq('subject_id', subjectFilter)
      }

      // Date filter
      let dateRange = null
      if (datePreset && datePreset !== 'custom') {
        dateRange = getPresetRange(datePreset)
      } else if (datePreset === 'custom' && customStart) {
        dateRange = {
          start: new Date(customStart + 'T00:00:00'),
          end:   customEnd ? new Date(customEnd + 'T23:59:59') : new Date(),
        }
      }
      if (dateRange) {
        q = q
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString())
      }

      const { data } = await q
      setResults(data || [])
    } finally {
      setLoading(false)
    }
  }, [query, typeFilter, subjectFilter, datePreset, customStart, customEnd])

  // Auto-search when filters change (if already searched)
  useEffect(() => {
    if (!searched) return
    const t = setTimeout(doSearch, 300)
    return () => clearTimeout(t)
  }, [typeFilter, subjectFilter, datePreset, customStart, customEnd, doSearch, searched])

  // Auto-search on query change with debounce
  useEffect(() => {
    if (!query.trim() && !searched) return
    const t = setTimeout(doSearch, 350)
    return () => clearTimeout(t)
  }, [query]) // eslint-disable-line

  function clearFilters() {
    setTypeFilter('all')
    setSubjectFilter('')
    setDatePreset('')
    setCustomStart('')
    setCustomEnd('')
  }

  const hasActiveFilters = typeFilter !== 'all' || subjectFilter || datePreset

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 55,
      background: 'white',
      display: 'flex', flexDirection: 'column',
      animation: 'fullscreenIn 0.2s cubic-bezier(0.16,1,0.3,1)',
    }}>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px',
        borderBottom: '1px solid #E4E6EB',
        flexShrink: 0,
        background: 'white',
      }}>
        {/* Search input */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 9,
          background: '#F0F2F5', borderRadius: 22,
          padding: '0 14px', height: 40,
          border: '1.5px solid #E4E6EB',
        }}>
          <Search size={16} color="#8A8D91" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search posts…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontFamily: '"Instrument Sans", system-ui', fontSize: 15, color: '#050505',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
              <X size={14} color="#8A8D91" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '0 12px', height: 40, borderRadius: 22,
            border: `1.5px solid ${hasActiveFilters ? RED : '#E4E6EB'}`,
            background: hasActiveFilters ? '#FADBD8' : '#F4F6F8',
            cursor: 'pointer', flexShrink: 0,
            fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13,
            color: hasActiveFilters ? RED : '#65676B',
            transition: 'all 0.15s',
            position: 'relative',
          }}
        >
          <SlidersHorizontal size={15} />
          Filter
          {hasActiveFilters && (
            <span style={{
              position: 'absolute', top: -5, right: -5,
              width: 16, height: 16, borderRadius: '50%',
              background: RED, color: 'white',
              fontSize: 9, fontWeight: 700, fontFamily: '"Instrument Sans", system-ui',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid white',
            }}>
              {[typeFilter !== 'all', !!subjectFilter, !!datePreset].filter(Boolean).length}
            </span>
          )}
          {showFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#E4E6EB', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#CED0D4'}
          onMouseLeave={e => e.currentTarget.style.background = '#E4E6EB'}
        >
          <X size={17} color="#050505" />
        </button>
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div style={{
          background: 'white',
          borderBottom: '1px solid #E4E6EB',
          padding: '14px 14px 16px',
          flexShrink: 0,
          animation: 'slideDown 0.18s ease',
        }}>

          {/* By type */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ margin: '0 0 8px', fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              By Type
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TYPE_OPTIONS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTypeFilter(t.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13,
                    background: typeFilter === t.key ? RED : '#F0F2F5',
                    color: typeFilter === t.key ? 'white' : '#65676B',
                    transition: 'all 0.12s',
                    boxShadow: typeFilter === t.key ? '0 2px 8px rgba(192,57,43,0.25)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 13 }}>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* By subject */}
          {subjects.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 8px', fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                By Subject
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button
                  onClick={() => setSubjectFilter('')}
                  style={{
                    padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13,
                    background: !subjectFilter ? BLUE : '#F0F2F5',
                    color: !subjectFilter ? 'white' : '#65676B',
                    transition: 'all 0.12s',
                    boxShadow: !subjectFilter ? '0 2px 8px rgba(26,82,118,0.25)' : 'none',
                  }}
                >
                  All Subjects
                </button>
                {subjects.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSubjectFilter(s.id)}
                    style={{
                      padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                      fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13,
                      background: subjectFilter === s.id ? BLUE : '#F0F2F5',
                      color: subjectFilter === s.id ? 'white' : '#65676B',
                      transition: 'all 0.12s',
                      boxShadow: subjectFilter === s.id ? '0 2px 8px rgba(26,82,118,0.25)' : 'none',
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* By date */}
          <div>
            <p style={{ margin: '0 0 8px', fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              By Date
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: datePreset === 'custom' ? 10 : 0 }}>
              {DATE_PRESETS.map(p => (
                <button
                  key={p.key}
                  onClick={() => { setDatePreset(datePreset === p.key ? '' : p.key); setCustomStart(''); setCustomEnd('') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13,
                    background: datePreset === p.key ? '#0D7377' : '#F0F2F5',
                    color: datePreset === p.key ? 'white' : '#65676B',
                    transition: 'all 0.12s',
                    boxShadow: datePreset === p.key ? '0 2px 8px rgba(13,115,119,0.25)' : 'none',
                  }}
                >
                  {p.key === 'custom' && <Calendar size={12} />}
                  {p.label}
                </button>
              ))}
            </div>
            {/* Custom range inputs */}
            {datePreset === 'custom' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: 10,
                    border: `1px solid ${customStart ? '#0D7377' : '#E4E6EB'}`,
                    fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#050505',
                    background: '#F7F8FA', outline: 'none',
                  }}
                />
                <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#8A8D91', flexShrink: 0 }}>to</span>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  onChange={e => setCustomEnd(e.target.value)}
                  disabled={!customStart}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: 10,
                    border: `1px solid ${customEnd ? '#0D7377' : '#E4E6EB'}`,
                    fontFamily: '"Instrument Sans", system-ui', fontSize: 13,
                    color: customStart ? '#050505' : '#BCC0C4',
                    background: customStart ? '#F7F8FA' : '#F0F2F5',
                    outline: 'none', opacity: customStart ? 1 : 0.5,
                    cursor: customStart ? 'text' : 'not-allowed',
                  }}
                />
              </div>
            )}
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                marginTop: 12, padding: '7px 16px', borderRadius: 20,
                border: `1px solid ${RED}`, background: 'transparent',
                fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 12.5,
                color: RED, cursor: 'pointer', transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FFF5F5'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ✕ Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Results ── */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#E9EBEE' }}>
        {!searched && !loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, padding: 32 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={28} color="#BCC0C4" />
            </div>
            <p style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 18, color: '#050505', margin: 0 }}>Search posts</p>
            <p style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: '#65676B', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
              Type something to search, or use filters to browse by type, subject, or date.
            </p>
          </div>
        ) : loading ? (
          <div style={{ padding: '8px 0' }}>
            {[0,1,2].map(i => <PostSkeleton key={i} />)}
          </div>
        ) : results.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 10, padding: 32 }}>
            <div style={{ fontSize: 44 }}>🔍</div>
            <p style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 18, color: '#050505', margin: 0 }}>No results found</p>
            <p style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: '#65676B', margin: 0, textAlign: 'center' }}>
              Try different keywords or adjust your filters.
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} style={{ marginTop: 4, padding: '8px 18px', borderRadius: 20, border: `1px solid ${RED}`, background: 'transparent', fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13, color: RED, cursor: 'pointer' }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Result count */}
            <div style={{ padding: '10px 14px 4px' }}>
              <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 12.5, color: '#65676B', fontWeight: 600 }}>
                {results.length} result{results.length !== 1 ? 's' : ''}
                {query.trim() ? ` for "${query.trim()}"` : ''}
              </span>
            </div>
            {results.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                subjects={subjects}
              />
            ))}
            <div style={{ padding: '12px 0 8px', textAlign: 'center' }}>
              <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#BCC0C4' }}>· End of results ·</span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fullscreenIn { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}
