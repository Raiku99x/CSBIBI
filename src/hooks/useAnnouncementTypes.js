import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Fallback used before DB responds or if fetch fails
const FALLBACK_TYPES = [
  'Quiz', 'Activity', 'Output', 'Exam', 'Fees',
  'Info', 'Learning Task', 'Project', 'Reporting',
]

// FIX #20: Single hook used by both CreatePostModal and EditPostModal.
// Previously each modal fetched announcement_types independently on every open,
// firing two separate DB reads. This hook deduplicates that.
//
// Simple module-level cache so the second modal to mount in the same session
// gets the result instantly without another network call.
let _cache = null

export function useAnnouncementTypes() {
  const [types, setTypes] = useState(_cache || FALLBACK_TYPES)

  useEffect(() => {
    // If we already have a cached result from this session, skip the fetch
    if (_cache) {
      setTypes(_cache)
      return
    }

    supabase
      .from('announcement_types')
      .select('label')
      .eq('is_visible', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const labels = data.map(t => t.label)
          _cache = labels
          setTypes(labels)
        }
      })
  }, [])

  return types
}
