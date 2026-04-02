import { createContext, useContext, useEffect, useState } from 'react'

const DarkModeContext = createContext(null)

export function DarkModeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('csb_dark_mode') === 'true' } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem('csb_dark_mode', dark) } catch {}
    const root = document.documentElement
    if (dark) {
      root.setAttribute('data-theme', 'dark')
      // Also set on body for maximum specificity coverage
      document.body.setAttribute('data-theme', 'dark')
    } else {
      root.removeAttribute('data-theme')
      document.body.removeAttribute('data-theme')
    }
  }, [dark])

  return (
    <DarkModeContext.Provider value={{ dark, setDark, toggle: () => setDark(d => !d) }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export const useDarkMode = () => {
  const ctx = useContext(DarkModeContext)
  if (!ctx) throw new Error('useDarkMode must be used within DarkModeProvider')
  return ctx
}
