/**
 * useBackButton
 *
 * Pushes a history entry when a modal/overlay opens so the browser/Android
 * back button (or back gesture) dismisses it instead of navigating away.
 *
 * Usage:
 *   useBackButton(onClose)          // always active
 *   useBackButton(onClose, isOpen)  // conditional — only active when isOpen=true
 *
 * How it works:
 *   1. On mount (or when isOpen becomes true), push a new history state with a
 *      unique key so we can identify our own entries.
 *   2. Listen for the browser `popstate` event. When it fires, call onClose().
 *   3. On cleanup (unmount / isOpen→false) pop the entry we pushed — but only if
 *      the user didn't already pop it themselves (i.e. the current state still has
 *      our key). This avoids double-navigating.
 */
import { useEffect, useRef } from 'react'

let _counter = 0

export function useBackButton(onClose, isOpen = true) {
  const keyRef    = useRef(null)
  const closedRef = useRef(false)  // true once the popstate handler fires

  useEffect(() => {
    if (!isOpen) return

    closedRef.current = false
    const key = `modal-${++_counter}`
    keyRef.current = key

    // Push a new history entry tagged with our key
    window.history.pushState({ modalKey: key }, '')

    function handlePopState(e) {
      // Only handle if the state we popped FROM was ours
      // (state after pop is the previous entry — our key is gone)
      if (closedRef.current) return
      closedRef.current = true
      onClose()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)

      // If the user closed the modal via UI (not back button), we need to
      // pop the history entry we pushed so the stack stays clean.
      if (!closedRef.current) {
        // Check if the current state is still ours before going back
        if (window.history.state?.modalKey === key) {
          closedRef.current = true  // prevent re-triggering onClose
          window.history.back()
        }
      }
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps
}
