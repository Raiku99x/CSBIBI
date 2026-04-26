import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function useTabPageBack() {
  const navigate = useNavigate()

  useEffect(() => {
    window.history.pushState({ tabPage: true }, '')

    function handlePopState() {
      navigate('/', { replace: true })
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
