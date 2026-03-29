import { useAuth } from '../contexts/AuthContext'

/**
 * useRole
 * Returns role helpers derived from the current user's profile.
 */
export function useRole() {
  const { profile } = useAuth()

  const role = profile?.role || 'user'
  const isModerator  = role === 'moderator' || role === 'superadmin'
  const isSuperadmin = role === 'superadmin'
  const isBanned     = profile?.is_banned === true
  const isMuted      = profile?.is_muted === true

  return { role, isModerator, isSuperadmin, isBanned, isMuted }
}
