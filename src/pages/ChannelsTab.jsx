// ── ChannelsTab.jsx ───────────────────────────────────────────
// Drop-in tab for AdminDashboard.jsx
// Features:
//   • Lists all distinct channels derived from profiles.section
//   • Shows member count, subject count per channel
//   • Rename a channel → bulk-updates profiles + allowed_codes + subjects + posts + chat
//   • Delete a channel → reassign users / subjects / codes / posts to another channel or null
//   • Add a new channel name (just registers it in allowed_codes seeds if desired, or informational)

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Radio, Users, BookOpen, Pencil, Trash2,
  Check, X, Plus, Loader2, AlertTriangle,
  ChevronDown, ArrowRight, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

const RED   = '#C0392B'
const TEAL  = '#0D7377'
const GREEN = '#16a34a'

// ── tiny shared button ────────────────────────────────────────
function IconBtn({ icon, color, title, onClick, loading: isLoading, disabled }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 30, height: 30, borderRadius: 8,
        border: `1px solid ${hov && !disabled ? color : '#E4E6EB'}`,
        background: hov && !disabled ? `${color}18` : 'white',
        cursor: isLoading || disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: hov && !disabled ? color : '#BCC0C4',
        transition: 'all 0.12s', flexShrink: 0,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {isLoading
        ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} />
        : icon}
    </button>
  )
}

// ── confirm dialog ────────────────────────────────────────────
function ConfirmDialog({ title, body, confirmLabel, confirmColor = RED, onConfirm, onCancel, loading }) {
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{
        position: 'fixed', left: '50%', top: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 81, width: 'calc(100% - 48px)', maxWidth: 360,
        background: 'white', borderRadius: 16, padding: '20px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
        animation: 'expandIn 0.16s ease',
      }}>
        <p style={{ margin: '0 0 8px', fontFamily: '"Bricolage Grotesque",system-ui', fontWeight: 800, fontSize: 17, color: '#050505' }}>{title}</p>
        <div style={{ margin: '0 0 18px', fontFamily: '"Instrument Sans",system-ui', fontSize: 13.5, color: '#65676B', lineHeight: 1.55 }}>
          {body}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} disabled={loading}
            style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1.5px solid #E4E6EB', background: 'white', cursor: 'pointer', fontFamily: '"Instrument Sans",system-ui', fontWeight: 700, fontSize: 14, color: '#050505' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: confirmColor, color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: '"Instrument Sans",system-ui', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: loading ? 0.7 : 1 }}>
            {loading && <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  )
}

// ── main component ────────────────────────────────────────────
export default function ChannelsTab() {
  const [channels, setChannels]     = useState([])   // [{ name, memberCount, subjectCount, codeCount }]
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // rename state
  const [renamingChannel, setRenamingChannel] = useState(null)  // channel name string
  const [renameValue, setRenameValue]         = useState('')
  const [renameLoading, setRenameLoading]     = useState(false)

  // delete state
  const [deletingChannel, setDeletingChannel] = useState(null)  // channel name string
  const [deleteTarget, setDeleteTarget]       = useState('')     // '' = null (unassign)
  const [deleteLoading, setDeleteLoading]     = useState(false)

  // add channel
  const [showAdd, setShowAdd]       = useState(false)
  const [newChannel, setNewChannel] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const fetchChannels = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    // Get all profiles with sections
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, section')
      .not('section', 'is', null)
      .neq('section', '')

    // Get subjects per channel
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, channel')
      .not('channel', 'is', null)
      .neq('channel', '')

    // Get allowed_codes per channel
    const { data: codes } = await supabase
      .from('allowed_codes')
      .select('id, section')
      .not('section', 'is', null)
      .neq('section', '')

    // Aggregate
    const channelMap = {}

    for (const p of profiles || []) {
      if (!channelMap[p.section]) channelMap[p.section] = { memberCount: 0, subjectCount: 0, codeCount: 0 }
      channelMap[p.section].memberCount++
    }
    for (const s of subjects || []) {
      if (!channelMap[s.channel]) channelMap[s.channel] = { memberCount: 0, subjectCount: 0, codeCount: 0 }
      channelMap[s.channel].subjectCount++
    }
    for (const c of codes || []) {
      if (!channelMap[c.section]) channelMap[c.section] = { memberCount: 0, subjectCount: 0, codeCount: 0 }
      channelMap[c.section].codeCount++
    }

    const result = Object.entries(channelMap)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => a.name.localeCompare(b.name))

    setChannels(result)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { fetchChannels() }, [fetchChannels])

  // ── Rename ──────────────────────────────────────────────────
  async function handleRename() {
    const trimmed = renameValue.trim()
    if (!trimmed) { toast.error('Enter a channel name'); return }
    if (trimmed === renamingChannel) { setRenamingChannel(null); return }
    if (channels.some(c => c.name === trimmed)) {
      toast.error(`Channel "${trimmed}" already exists`); return
    }

    setRenameLoading(true)
    try {
      const old = renamingChannel

      // Update profiles.section
      const { error: e1 } = await supabase
        .from('profiles')
        .update({ section: trimmed })
        .eq('section', old)
      if (e1) throw e1

      // Update allowed_codes.section
      const { error: e2 } = await supabase
        .from('allowed_codes')
        .update({ section: trimmed })
        .eq('section', old)
      if (e2) throw e2

      // Update subjects.channel
      const { error: e3 } = await supabase
        .from('subjects')
        .update({ channel: trimmed })
        .eq('channel', old)
      if (e3) throw e3

      // Update posts.channel
      const { error: e4 } = await supabase
        .from('posts')
        .update({ channel: trimmed })
        .eq('channel', old)
      if (e4) throw e4

      // Update chat.channel
      const { error: e5 } = await supabase
        .from('chat')
        .update({ channel: trimmed })
        .eq('channel', old)
      if (e5) throw e5

      // Update direct_messages.channel
      const { error: e6 } = await supabase
        .from('direct_messages')
        .update({ channel: trimmed })
        .eq('channel', old)
      if (e6) throw e6

      toast.success(`Renamed "${old}" → "${trimmed}"`)
      setRenamingChannel(null)
      setRenameValue('')
      fetchChannels(true)
    } catch (err) {
      toast.error(err.message || 'Rename failed')
    } finally {
      setRenameLoading(false)
    }
  }

  // ── Delete ──────────────────────────────────────────────────
  async function handleDelete() {
    const old = deletingChannel
    const target = deleteTarget || null  // null = unassign

    setDeleteLoading(true)
    try {
      // profiles
      const { error: e1 } = await supabase
        .from('profiles')
        .update({ section: target })
        .eq('section', old)
      if (e1) throw e1

      // allowed_codes
      const { error: e2 } = await supabase
        .from('allowed_codes')
        .update({ section: target })
        .eq('section', old)
      if (e2) throw e2

      // subjects
      const { error: e3 } = await supabase
        .from('subjects')
        .update({ channel: target })
        .eq('channel', old)
      if (e3) throw e3

      // posts
      const { error: e4 } = await supabase
        .from('posts')
        .update({ channel: target })
        .eq('channel', old)
      if (e4) throw e4

      // chat
      const { error: e5 } = await supabase
        .from('chat')
        .update({ channel: target })
        .eq('channel', old)
      if (e5) throw e5

      // direct_messages
      const { error: e6 } = await supabase
        .from('direct_messages')
        .update({ channel: target })
        .eq('channel', old)
      if (e6) throw e6

      toast.success(
        target
          ? `"${old}" deleted — members moved to "${target}"`
          : `"${old}" deleted — members unassigned`
      )
      setDeletingChannel(null)
      setDeleteTarget('')
      fetchChannels(true)
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── Add new channel (informational — just adds to allowed_codes seed) ──
  async function handleAdd() {
    const trimmed = newChannel.trim()
    if (!trimmed) { toast.error('Enter a channel name'); return }
    if (channels.some(c => c.name === trimmed)) {
      toast.error(`Channel "${trimmed}" already exists`); return
    }

    setAddLoading(true)
    try {
      // We don't have a dedicated channels table, so "adding" a channel
      // means we insert a placeholder allowed_code with this section so
      // it appears in all channel dropdowns immediately.
      // Alternatively, you can skip this and just rename subjects/add codes manually.
      // Here we just register it as a known channel via a sentinel allowed_code.
      const { error } = await supabase
        .from('allowed_codes')
        .insert({
          code: `__channel_seed_${trimmed.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
          section: trimmed,
          is_used: true,   // mark as used so it can't be claimed
          identifier: null,
          user_id: null,
        })
      if (error) throw error
      toast.success(`Channel "${trimmed}" created`)
      setNewChannel('')
      setShowAdd(false)
      fetchChannels(true)
    } catch (err) {
      toast.error(err.message || 'Failed to create channel')
    } finally {
      setAddLoading(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <Loader2 size={24} color={RED} style={{ animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  const otherChannels = (ch) => channels.filter(c => c.name !== ch).map(c => c.name)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Info banner */}
      <div style={{ background: '#EBF5FB', border: '1px solid #AED6F1', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8 }}>
        <Radio size={15} color='#1A5276' style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontFamily: '"Instrument Sans",system-ui', fontSize: 12, color: '#1A5276', lineHeight: 1.5 }}>
          Channels separate your class into isolated groups. Each channel has its own feed, chat, and subjects.
          Renaming updates <strong>all</strong> profiles, subjects, posts, codes, and messages automatically.
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: '"Instrument Sans",system-ui', fontSize: 12, color: '#8A8D91', flex: 1 }}>
          {channels.length} channel{channels.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => fetchChannels(true)}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, border: '1px solid #E4E6EB', background: 'white', cursor: refreshing ? 'not-allowed' : 'pointer', fontFamily: '"Instrument Sans",system-ui', fontWeight: 600, fontSize: 12, color: '#65676B', transition: 'all 0.12s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#F0F2F5'}
          onMouseLeave={e => e.currentTarget.style.background = 'white'}
        >
          <RefreshCw size={13} color={refreshing ? RED : '#65676B'} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          Refresh
        </button>
        <button
          onClick={() => setShowAdd(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', background: showAdd ? '#F0F2F5' : TEAL, color: showAdd ? '#65676B' : 'white', cursor: 'pointer', fontFamily: '"Instrument Sans",system-ui', fontWeight: 700, fontSize: 13, transition: 'background 0.12s' }}>
          {showAdd ? <X size={14} /> : <Plus size={14} />}
          {showAdd ? 'Cancel' : 'Add Channel'}
        </button>
      </div>

      {/* Add channel form */}
      {showAdd && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #DADDE1', padding: '14px 16px', animation: 'fadeIn 0.18s ease' }}>
          <p style={{ margin: '0 0 10px', fontFamily: '"Instrument Sans",system-ui', fontSize: 12, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: 0.5 }}>New Channel</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newChannel}
              onChange={e => setNewChannel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              placeholder='e.g. CS-3A, IT-2B…'
              maxLength={40}
              autoFocus
              style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1px solid #E4E6EB', fontFamily: '"Instrument Sans",system-ui', fontSize: 13, color: '#050505', outline: 'none', background: '#F7F8FA' }}
            />
            <button
              onClick={handleAdd}
              disabled={addLoading || !newChannel.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: newChannel.trim() ? TEAL : '#E4E6EB', color: newChannel.trim() ? 'white' : '#BCC0C4', cursor: newChannel.trim() ? 'pointer' : 'default', fontFamily: '"Instrument Sans",system-ui', fontWeight: 700, fontSize: 13, flexShrink: 0, transition: 'background 0.12s' }}>
              {addLoading ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Plus size={14} />}
              Add
            </button>
          </div>
          <p style={{ margin: '7px 0 0', fontFamily: '"Instrument Sans",system-ui', fontSize: 11, color: '#8A8D91' }}>
            New channels can then be assigned to subjects and used in allowed codes.
          </p>
        </div>
      )}

      {/* Channel cards */}
      {channels.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #DADDE1', padding: '48px 24px', textAlign: 'center' }}>
          <Radio size={40} color='#BCC0C4' style={{ marginBottom: 12 }} />
          <p style={{ margin: '0 0 6px', fontFamily: '"Bricolage Grotesque",system-ui', fontWeight: 800, fontSize: 17, color: '#050505' }}>No channels yet</p>
          <p style={{ margin: 0, fontFamily: '"Instrument Sans",system-ui', fontSize: 13.5, color: '#65676B' }}>
            Channels are created automatically when you assign a section to users via allowed codes.
          </p>
        </div>
      ) : (
        channels.map(ch => (
          <ChannelCard
            key={ch.name}
            channel={ch}
            isRenaming={renamingChannel === ch.name}
            renameValue={renameValue}
            renameLoading={renameLoading}
            onStartRename={() => { setRenamingChannel(ch.name); setRenameValue(ch.name) }}
            onRenameChange={setRenameValue}
            onRenameConfirm={handleRename}
            onRenameCancel={() => { setRenamingChannel(null); setRenameValue('') }}
            onDelete={() => { setDeletingChannel(ch.name); setDeleteTarget('') }}
          />
        ))
      )}

      {/* Delete confirmation modal */}
      {deletingChannel && (
        <DeleteModal
          channelName={deletingChannel}
          otherChannels={otherChannels(deletingChannel)}
          targetChannel={deleteTarget}
          onTargetChange={setDeleteTarget}
          onConfirm={handleDelete}
          onCancel={() => { setDeletingChannel(null); setDeleteTarget('') }}
          loading={deleteLoading}
          channelStats={channels.find(c => c.name === deletingChannel)}
        />
      )}

      <style>{`
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes expandIn{ from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  )
}

// ── Channel card ──────────────────────────────────────────────
function ChannelCard({
  channel,
  isRenaming, renameValue, renameLoading,
  onStartRename, onRenameChange, onRenameConfirm, onRenameCancel,
  onDelete,
}) {
  return (
    <div style={{
      background: 'white', borderRadius: 12,
      border: `1.5px solid ${isRenaming ? TEAL : '#DADDE1'}`,
      padding: '14px 16px',
      transition: 'border-color 0.15s',
      animation: 'fadeIn 0.15s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Icon */}
        <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: 'rgba(13,115,119,0.10)', border: '1px solid rgba(13,115,119,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Radio size={20} color={TEAL} />
        </div>

        {/* Name / edit field */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={e => onRenameChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onRenameConfirm()
                if (e.key === 'Escape') onRenameCancel()
              }}
              maxLength={40}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 9, border: `2px solid ${TEAL}`, fontFamily: '"Instrument Sans",system-ui', fontWeight: 700, fontSize: 15, color: '#050505', outline: 'none', background: 'white', boxSizing: 'border-box' }}
            />
          ) : (
            <>
              <p style={{ margin: 0, fontFamily: '"Instrument Sans",system-ui', fontWeight: 700, fontSize: 15, color: '#050505' }}>
                {channel.name}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                <StatChip icon={<Users size={10} />} value={channel.memberCount} label="members" color='#65676B' />
                <StatChip icon={<BookOpen size={10} />} value={channel.subjectCount} label="subjects" color='#1A5276' />
                <StatChip icon={<span style={{ fontSize: 10 }}>🔑</span>} value={channel.codeCount} label="codes" color='#65676B' />
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {isRenaming ? (
            <>
              <IconBtn icon={<Check size={13} />} color={GREEN} title="Save rename" onClick={onRenameConfirm} loading={renameLoading} />
              <IconBtn icon={<X size={13} />} color='#65676B' title="Cancel" onClick={onRenameCancel} />
            </>
          ) : (
            <>
              <IconBtn icon={<Pencil size={13} />} color='#65676B' title="Rename channel" onClick={onStartRename} />
              <IconBtn icon={<Trash2 size={13} />} color={RED} title="Delete channel" onClick={onDelete} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Stat chip ─────────────────────────────────────────────────
function StatChip({ icon, value, label, color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: '"Instrument Sans",system-ui', fontSize: 11, fontWeight: 600, color }}>
      {icon}
      <strong style={{ fontWeight: 800 }}>{value}</strong> {label}
    </span>
  )
}

// ── Delete modal ──────────────────────────────────────────────
function DeleteModal({ channelName, otherChannels, targetChannel, onTargetChange, onConfirm, onCancel, loading, channelStats }) {
  const hasMembers = channelStats?.memberCount > 0
  const hasSubjects = channelStats?.subjectCount > 0
  const hasCodes = channelStats?.codeCount > 0

  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{
        position: 'fixed', left: '50%', top: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 81, width: 'calc(100% - 32px)', maxWidth: 400,
        background: 'white', borderRadius: 18, overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
        animation: 'expandIn 0.18s ease',
      }}>
        {/* Red header */}
        <div style={{ background: `linear-gradient(135deg, #922B21, ${RED})`, padding: '20px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Trash2 size={17} color='white' />
            </div>
            <span style={{ fontFamily: '"Bricolage Grotesque",system-ui', fontWeight: 800, fontSize: 18, color: 'white' }}>
              Delete "{channelName}"
            </span>
          </div>
          <p style={{ margin: 0, fontFamily: '"Instrument Sans",system-ui', fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
            This cannot be undone. Choose what happens to the data inside.
          </p>
        </div>

        <div style={{ padding: '16px 20px 20px' }}>

          {/* Stats warning */}
          {(hasMembers || hasSubjects || hasCodes) && (
            <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderLeft: '4px solid #F59E0B', borderRadius: '0 10px 10px 0', padding: '10px 14px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <AlertTriangle size={13} color='#C2410C' />
                <span style={{ fontFamily: '"Instrument Sans",system-ui', fontWeight: 700, fontSize: 12, color: '#92400E' }}>This channel contains:</span>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {hasMembers && <StatChip icon={<Users size={10} />} value={channelStats.memberCount} label="members" color='#92400E' />}
                {hasSubjects && <StatChip icon={<BookOpen size={10} />} value={channelStats.subjectCount} label="subjects" color='#92400E' />}
                {hasCodes && <StatChip icon={<span style={{ fontSize: 10 }}>🔑</span>} value={channelStats.codeCount} label="codes" color='#92400E' />}
              </div>
            </div>
          )}

          {/* Reassign target */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontFamily: '"Instrument Sans",system-ui', fontSize: 11, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Move members & data to
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={targetChannel}
                onChange={e => onTargetChange(e.target.value)}
                style={{ width: '100%', padding: '10px 32px 10px 12px', borderRadius: 10, border: '1.5px solid #E4E6EB', background: '#F7F8FA', fontFamily: '"Instrument Sans",system-ui', fontSize: 14, color: targetChannel ? '#050505' : '#8A8D91', outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                <option value=''>— Remove channel (unassign) —</option>
                {otherChannels.map(ch => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
              <ChevronDown size={14} color='#65676B' style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
            {targetChannel ? (
              <p style={{ margin: '6px 0 0', fontFamily: '"Instrument Sans",system-ui', fontSize: 11, color: TEAL, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <ArrowRight size={11} /> Members will be moved to "{targetChannel}"
              </p>
            ) : (
              <p style={{ margin: '6px 0 0', fontFamily: '"Instrument Sans",system-ui', fontSize: 11, color: '#8A8D91' }}>
                Members will have no channel — they'll see the global feed.
              </p>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCancel} disabled={loading}
              style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1.5px solid #E4E6EB', background: 'white', cursor: 'pointer', fontFamily: '"Instrument Sans",system-ui', fontWeight: 700, fontSize: 14, color: '#050505' }}>
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading}
              style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: RED, color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: '"Instrument Sans",system-ui', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: loading ? 0.7 : 1 }}>
              {loading && <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />}
              Delete Channel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
