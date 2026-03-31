import { createContext, useContext, useState, useCallback } from 'react'

const SavedPostsContext = createContext(null)

export function SavedPostsProvider({ children }) {
  const [savedIds, setSavedIds] = useState(() => {
    // FIX #8: validate parsed value is actually an array before wrapping in Set.
    // Previously: new Set(JSON.parse(...)) — if storage was corrupted (object/null)
    // this would silently create a broken Set.
    try {
      const raw = JSON.parse(localStorage.getItem('csb_saved_posts') || '[]')
      return new Set(Array.isArray(raw) ? raw : [])
    } catch {
      return new Set()
    }
  })

  const toggleSaved = useCallback((postId) => {
    setSavedIds(prev => {
      const next = new Set(prev)
      next.has(postId) ? next.delete(postId) : next.add(postId)
      try { localStorage.setItem('csb_saved_posts', JSON.stringify([...next])) } catch {}
      return next
    })
  }, [])

  const isSaved = useCallback((postId) => savedIds.has(postId), [savedIds])

  return (
    <SavedPostsContext.Provider value={{ savedIds, toggleSaved, isSaved }}>
      {children}
    </SavedPostsContext.Provider>
  )
}

export const useSavedPosts = () => {
  const ctx = useContext(SavedPostsContext)
  if (!ctx) throw new Error('useSavedPosts must be used within SavedPostsProvider')
  return ctx
}
