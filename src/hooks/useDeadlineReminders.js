import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { isPast, isToday, isTomorrow, differenceInDays } from 'date-fns'

function getDeadlineDate(due_date, due_time) {
  const [y, m, d] = due_date.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (due_time) {
    const [h, min] = due_time.split(':').map(Number)
    date.setHours(h, min, 0, 0)
  } else {
    date.setHours(23, 59, 0, 0)
  }
  return date
}

export function useDeadlineReminders() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    const key = `csb_reminders_${new Date().toISOString().split('T')[0]}_${user.id}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')

    async function checkAndNotify() {
      // 1. Get user's enrolled subjects
      const { data: enrolled } = await supabase
        .from('user_subjects')
        .select('subject_id')
        .eq('user_id', user.id)
      const subjectIds = enrolled?.map(e => e.subject_id) || []

      // 2. Fetch upcoming/past deadlines
const userChannel = enrolled?.length
        ? (await supabase.from('profiles').select('section').eq('id', user.id).single()).data?.section || null
        : null

      let query = supabase
        .from('posts')
        .select('id, caption, due_date, due_time, subject_id, channel, subjects(name)')
        .eq('post_type', 'announcement')
        .not('due_date', 'is', null)
      if (subjectIds.length > 0) {
        query = query.or(`subject_id.in.(${subjectIds.join(',')}),subject_id.is.null`)
      } else {
        query = query.is('subject_id', null)
      }
      const { data: rawDeadlines } = await query

      // Only keep deadlines that belong to the user's channel or are global (no channel)
      const deadlines = (rawDeadlines || []).filter(d =>
        !d.channel || !userChannel || d.channel === userChannel
      )
      if (!deadlines?.length) return

      // 3. Get which ones user already marked done
      const { data: completions } = await supabase
        .from('deadline_completions')
        .select('post_id')
        .eq('user_id', user.id)
      const doneIds = new Set(completions?.map(c => c.post_id) || [])

      // 4. Get what we already notified today
      const today = new Date().toISOString().split('T')[0]
      const { data: alreadySent } = await supabase
        .from('deadline_reminder_log')
        .select('post_id, reminder_type')
        .eq('user_id', user.id)
        .eq('sent_date', today)
      const sentSet = new Set(
        (alreadySent || []).map(r => `${r.post_id}::${r.reminder_type}`)
      )

      const notifications = []
      const logInserts = []

      for (const deadline of deadlines) {
        if (doneIds.has(deadline.id)) continue

        const dt = getDeadlineDate(deadline.due_date, deadline.due_time)
        const subjectName = deadline.subjects?.name || 'General'
        const shortCaption = deadline.caption?.slice(0, 50) || 'No title'
        const days = differenceInDays(dt, new Date())

        const isPastDue = isPast(dt)
        const isDueSoon =
          !isPastDue &&
          (isToday(new Date(deadline.due_date + 'T00:00:00')) ||
            isTomorrow(new Date(deadline.due_date + 'T00:00:00')) ||
            days <= 3)

        if (!isPastDue && !isDueSoon) continue
        if (isPastDue && sentSet.has(`${deadline.id}::past_due`)) continue
        if (isDueSoon && sentSet.has(`${deadline.id}::due_soon`)) continue

        const { count: doneCount } = await supabase
          .from('deadline_completions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('post_id', deadline.id)
        if (doneCount > 0) continue

        if (isPastDue) {
          notifications.push({
            user_id: user.id,
            post_id: deadline.id,
            type: 'deadline',
            message: `Past due — "${shortCaption}" (${subjectName}) was due and is not yet marked done.`,
            is_read: false,
          })
          logInserts.push({
            user_id: user.id,
            post_id: deadline.id,
            reminder_type: 'past_due',
            sent_date: today,
          })
        } else if (isDueSoon) {
          const label =
            days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
          notifications.push({
            user_id: user.id,
            post_id: deadline.id,
            type: 'deadline',
            message: `Due ${label} — "${shortCaption}" (${subjectName}). Mark it done when finished!`,
            is_read: false,
          })
          logInserts.push({
            user_id: user.id,
            post_id: deadline.id,
            reminder_type: 'due_soon',
            sent_date: today,
          })
        }
      }

      // 5. Insert notifications + log in batch
      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications)
      }
      if (logInserts.length > 0) {
        await supabase
          .from('deadline_reminder_log')
          .upsert(logInserts, { onConflict: 'user_id,post_id,reminder_type,sent_date' })
      }
    }

    checkAndNotify()
  }, [user])
}
