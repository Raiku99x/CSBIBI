import { useState, useEffect } from 'react'
import { useRole } from './useRole'

const STORAGE_KEY = 'csb_mod_mode'

/**
 * useModMode
 * Tracks whether mod mode is active.
 * - Superadmin: ON by default, can toggle off to browse incognito
 * - Moderator:  OFF by default, can toggle ON
 * - Regular user: always false
 */
export function useModMode() {
  const { isModerator, isSuperadmin } = useRole()

  const [modMode, setModMode] = useState(() => {
    if (!isModerator && !isSuperadmin) return false
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      // Superadmin defaults to ON if nothing stored
      if (stored === null) return isSuperadmin ? true : false
      return stored === 'true'
    } catch {
      return isSuperadmin ? true : false
    }
  })

  // Re-evaluate if role changes (e.g. promoted mid-session)
  useEffect(() => {
    if (!isModerator && !isSuperadmin) {
      setModMode(false)
      return
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === null) setModMode(isSuperadmin ? true : false)
      else setModMode(stored === 'true')
    } catch {
      setModMode(isSuperadmin ? true : false)
    }
  }, [isModerator, isSuperadmin])

  function toggleModMode() {
    if (!isModerator && !isSuperadmin) return
    setModMode(prev => {
      const next = !prev
      try { localStorage.setItem(STORAGE_KEY, next) } catch {}
      return next
    })
  }

  return { modMode, toggleModMode }
}
