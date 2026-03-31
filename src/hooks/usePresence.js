import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function usePresence(userId, userMeta, appearOffline = false) {
  const [onlineUsers, setOnlineUsers] = useState([])
  const channelRef = useRef(null)

  // Main effect: create/destroy channel when userId or appearOffline changes
  useEffect(() => {
    if (!userId) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase.channel('csb-presence', {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = Object.values(state)
          .flat()
          .filter(u => u.user_id !== userId)
          .map(u => ({
            id: u.user_id,
            display_name: u.display_name,
            avatar_url: u.avatar_url,
            online_at: u.online_at,
          }))
        setOnlineUsers(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && !appearOffline) {
          await channel.track({
            user_id: userId,
            display_name: userMeta?.display_name || 'User',
            avatar_url: userMeta?.avatar_url || '',
            online_at: new Date().toISOString(),
          })
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, appearOffline])

  // FIX #13: Re-track when the user updates their display name or avatar
  // so other users' presence sidebar shows fresh info without requiring a reload.
  useEffect(() => {
    if (!channelRef.current || appearOffline || !userId) return
    // Only re-track if channel is in SUBSCRIBED state
    const ch = channelRef.current
    if (ch.state !== 'joined') return

    ch.track({
      user_id: userId,
      display_name: userMeta?.display_name || 'User',
      avatar_url: userMeta?.avatar_url || '',
      online_at: new Date().toISOString(),
    })
  }, [userMeta?.display_name, userMeta?.avatar_url, userId, appearOffline])

  return { onlineUsers }
}
