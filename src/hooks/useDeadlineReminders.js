// src/hooks/useDeadlineReminders.js - REPLACE EXISTING FILE
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { isPast, isToday, isTomorrow, differenceInDays } from 'date-fns'

// Days past due when we send escalating push notifications
const PAST_DUE_PUSH_DAYS = [1, 2, 3, 4, 5, 6, 7, 9, 12]

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

async function sendPushToUsers(userIds, payload) {
  if (!userIds.length) return
  try {
    await supabase.functions.invoke('send-push', {
      body: { user_ids: userIds, payload },
    })
  } catch (err) {
    console.error('Push invoke error:', err)
  }
}

export function useDeadlineReminders() {
  const { user, profile } = useAuth()

  useEffect(() => {
    if (!user) return
    const key = `csb_reminders_v2_${new Date().toISOString().split('T')[0]}_${user.id}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')

    async function checkAndNotify() {
      const userChannel = profile?.section || null

      // Get enrolled subjects
      const { data: enrolled } = await supabase
        .from('user_subjects').select('subject_id').eq('user_id', user.id)
      const subjectIds = enrolled?.map(e => e.subject_id) || []

      // Fetch deadlines
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

      // Filter by channel
      const deadlines = (rawDeadlines || []).filter(d =>
        !d.channel || !userChannel || d.channel === userChannel
      )
      if (!deadlines.length) return

      // Get completions
      const { data: completions } = await supabase
        .from('deadline_completions').select('post_id').eq('user_id', user.id)
      const doneIds = new Set(completions?.map(c => c.post_id) || [])

      // Get today's sent reminders
      const today = new Date().toISOString().split('T')[0]
      const { data: alreadySent } = await supabase
        .from('deadline_reminder_log')
        .select('post_id, reminder_type')
        .eq('user_id', user.id)
        .eq('sent_date', today)
      const sentSet = new Set((alreadySent || []).map(r => `${r.post_id}::${r.reminder_type}`))

      const inAppNotifications = []
      const logInserts = []
      const pushPayloads = [] // { payload, userIds }

      for (const deadline of deadlines) {
        if (doneIds.has(deadline.id)) continue

        const dt = getDeadlineDate(deadline.due_date, deadline.due_time)
        const subjectName = deadline.subjects?.name || 'General'
        const shortCaption = deadline.caption?.slice(0, 60) || 'No title'
        const now = new Date()
        const daysPast = differenceInDays(now, dt) // positive = past due
        const isPastDue = isPast(dt)
        const isDueSoon = !isPastDue && (
          isToday(new Date(deadline.due_date + 'T00:00:00')) ||
          isTomorrow(new Date(deadline.due_date + 'T00:00:00')) ||
          differenceInDays(dt, now) <= 3
        )

        if (!isPastDue && !isDueSoon) continue

        if (isDueSoon) {
          const key = `${deadline.id}::due_soon`
          if (!sentSet.has(key)) {
            const daysLeft = differenceInDays(dt, now)
            const label = isToday(new Date(deadline.due_date + 'T00:00:00'))
              ? 'today' : isTomorrow(new Date(deadline.due_date + 'T00:00:00'))
              ? 'tomorrow' : `in ${daysLeft} days`

            // In-app notification
            inAppNotifications.push({
              user_id: user.id,
              post_id: deadline.id,
              type: 'deadline',
              message: `📅 Due ${label} — "${shortCaption}" (${subjectName})`,
              is_read: false,
            })

            // Push notification
            pushPayloads.push({
              payload: {
                title: `📅 Due ${label} — ${subjectName}`,
                body: shortCaption,
                tag: `due-soon-${deadline.id}`,
                url: `/?post=${deadline.id}`,
                postId: deadline.id,
              },
              userIds: [user.id],
            })

            logInserts.push({
              user_id: user.id,
              post_id: deadline.id,
              reminder_type: 'due_soon',
              sent_date: today,
            })
          }
        }

        if (isPastDue) {
          // Check which escalation days apply today
          for (const day of PAST_DUE_PUSH_DAYS) {
            if (daysPast !== day) continue
            const key = `${deadline.id}::past_due_${day}`
            if (sentSet.has(key)) continue

            // In-app
            inAppNotifications.push({
              user_id: user.id,
              post_id: deadline.id,
              type: 'deadline',
              message: `🚨 ${day} day${day > 1 ? 's' : ''} past due — "${shortCaption}" (${subjectName}). Please complete this!`,
              is_read: false,
            })

            // Push
            pushPayloads.push({
              payload: {
                title: `🚨 ${day}d Past Due — ${subjectName}`,
                body: `"${shortCaption}" — mark done when finished!`,
                tag: `past-due-${deadline.id}-${day}`,
                url: `/announcements`,
                postId: deadline.id,
                requireInteraction: day >= 5,
              },
              userIds: [user.id],
            })

            logInserts.push({
              user_id: user.id,
              post_id: deadline.id,
              reminder_type: `past_due_${day}`,
              sent_date: today,
            })
            break // only one escalation per deadline per day
          }

          // Also send daily in-app for any past-due (existing behavior)
          const generalKey = `${deadline.id}::past_due`
          if (!sentSet.has(generalKey) && !PAST_DUE_PUSH_DAYS.includes(daysPast)) {
            inAppNotifications.push({
              user_id: user.id,
              post_id: deadline.id,
              type: 'deadline',
              message: `⚠️ Past due — "${shortCaption}" (${subjectName}) is not yet marked done.`,
              is_read: false,
            })
            logInserts.push({
              user_id: user.id,
              post_id: deadline.id,
              reminder_type: 'past_due',
              sent_date: today,
            })
          }
        }
      }

      // Save in-app notifications
      if (inAppNotifications.length > 0) {
        await supabase.from('notifications').insert(inAppNotifications)
      }

      // Save log
      if (logInserts.length > 0) {
        await supabase.from('deadline_reminder_log').upsert(logInserts, {
          onConflict: 'user_id,post_id,reminder_type,sent_date',
        })
      }

      // Send push notifications
      for (const { payload, userIds } of pushPayloads) {
        await sendPushToUsers(userIds, payload)
      }
    }

    checkAndNotify()
  }, [user, profile])
}
