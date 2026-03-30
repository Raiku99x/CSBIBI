// useMuteGate.js
// Returns helpers to check if current user is muted
// and a component to show the mute warning

import { useAuth } from '../contexts/AuthContext'

export function useMuteGate() {
  const { profile } = useAuth()

  const isMuted = profile?.is_muted === true
  const mutedUntil = profile?.muted_until

  // Check if mute has actually expired (in case DB not updated yet)
  const muteExpired = mutedUntil && new Date(mutedUntil) < new Date()
  const effectivelyMuted = isMuted && !muteExpired

  function getMuteMessage() {
    if (!effectivelyMuted) return null
    if (mutedUntil) {
      const until = new Date(mutedUntil)
      const now = new Date()
      const diffMs = until - now
      const diffHrs = Math.ceil(diffMs / (1000 * 60 * 60))
      const diffMins = Math.ceil(diffMs / (1000 * 60))

      if (diffMins < 60) return `You are muted for ${diffMins} more minute${diffMins !== 1 ? 's' : ''}.`
      if (diffHrs < 24) return `You are muted for ${diffHrs} more hour${diffHrs !== 1 ? 's' : ''}.`
      const diffDays = Math.ceil(diffHrs / 24)
      return `You are muted for ${diffDays} more day${diffDays !== 1 ? 's' : ''}.`
    }
    return 'You are currently muted and cannot post or comment.'
  }

  return { effectivelyMuted, getMuteMessage }
}
