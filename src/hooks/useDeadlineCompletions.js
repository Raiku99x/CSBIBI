import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useDeadlineCompletions() {
  const { user } = useAuth()
  const [doneIds, setDoneIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('deadline_completions')
      .select('post_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setDoneIds(new Set(data.map(r => r.post_id)))
        setLoading(false)
      })
  }, [user])

  const toggleDone = useCallback(async (postId) => {
    if (!user) return
    const isDone = doneIds.has(postId)

    // Optimistic update
    setDoneIds(prev => {
      const next = new Set(prev)
      isDone ? next.delete(postId) : next.add(postId)
      return next
    })

    if (isDone) {
      await supabase
        .from('deadline_completions')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId)
    } else {
      await supabase
        .from('deadline_completions')
        .insert({ user_id: user.id, post_id: postId })
    }
  }, [user, doneIds])

  const isDone = useCallback((postId) => doneIds.has(postId), [doneIds])

  return { doneIds, isDone, toggleDone, loading }
}
