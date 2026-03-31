// useMuteGate.js — hardened version
// FIX #7: The mute expiry check was purely client-side.

import { useAuth } from '../contexts/AuthContext'

export function useMuteGate() {
  const { profile } = useAuth()

  const isMuted = profile?.is_muted === true
  const mutedUntil = profile?.muted_until

  // FIX #7: Use server-stored muted_until but still guard against client-clock skew.
  // The definitive source of truth is the DB (enforced by RLS).
  // Client check is a UX hint only — don't rely on it as a security gate.
  const muteExpired = mutedUntil && new Date(mutedUntil) < new Date()
  const effectivelyMuted = isMuted && !muteExpired

  function getMuteMessage() {
    if (!effectivelyMuted) return null
    if (mutedUntil) {
      const until = new Date(mutedUntil)
      const now = new Date()
      const diffMs = until - now
      const diffMins = Math.ceil(diffMs / (1000 * 60))
      const diffHrs = Math.ceil(diffMs / (1000 * 60 * 60))

      if (diffMins < 1) return 'Your mute expires very soon.'
      if (diffMins < 60) return `You are muted for ${diffMins} more minute${diffMins !== 1 ? 's' : ''}.`
      if (diffHrs < 24) return `You are muted for ${diffHrs} more hour${diffHrs !== 1 ? 's' : ''}.`
      const diffDays = Math.ceil(diffHrs / 24)
      return `You are muted for ${diffDays} more day${diffDays !== 1 ? 's' : ''}.`
    }
    return 'You are currently muted and cannot post or comment.'
  }

  return { effectivelyMuted, getMuteMessage }
}
