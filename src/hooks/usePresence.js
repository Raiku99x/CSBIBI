import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * usePresence
 * Tracks online users using Supabase Realtime Presence.
 * No extra DB tables needed — free tier safe.
 *
 * @param {string} userId      - current user's ID
 * @param {object} userMeta    - { display_name, avatar_url } to broadcast
 * @param {boolean} appearOffline - if true, we don't broadcast presence
 */
export function usePresence(userId, userMeta, appearOffline = false) {
  const [onlineUsers, setOnlineUsers] = useState([])
  const channelRef = useRef(null)

  useEffect(() => {
    if (!userId) return

    // Clean up previous channel
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
        // state is { [userId]: [{ user_id, display_name, avatar_url, online_at }] }
        const users = Object.values(state)
          .flat()
          .filter(u => u.user_id !== userId) // exclude self from others' list
          .map(u => ({
            id: u.user_id,
            display_name: u.display_name,
            avatar_url: u.avatar_url,
            online_at: u.online_at,
          }))
        setOnlineUsers(users)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        // handled by sync
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // handled by sync
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

  return { onlineUsers }
}
