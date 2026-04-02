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
      document.body.setAttribute('data-theme', 'dark')
      document.body.style.background = '#111214'
      document.body.style.color = '#F0F1F3'
    } else {
      root.removeAttribute('data-theme')
      document.body.removeAttribute('data-theme')
      document.body.style.background = '#ECEEF1'
      document.body.style.color = '#050505'
    }
  }, [dark])

  const colors = dark ? {
    pageBg:     '#111214',
    cardBg:     '#1C1D20',
    cardHover:  '#222428',
    border:     'rgba(255,255,255,0.07)',
    borderStrong:'rgba(255,255,255,0.11)',
    textPri:    '#F0F1F3',
    textSec:    '#A3A7B0',
    textMut:    '#6B6F78',
    textDis:    '#484C55',
    surface:    '#232529',
    surfaceHov: '#2A2C30',
    surfaceAct: '#313438',
    divider:    '#2E2F30',
    inputBg:    '#15161A',
    headerBg:   'rgba(17,18,20,0.97)',
    navBg:      'rgba(22,23,25,0.96)',
    sidebarBg:  '#161719',
    chatBg:     '#0F1012',
    bubbleSelf: '#C0392B',
    bubbleOther:'#232529',
    bubbleOtherBorder: 'rgba(255,255,255,0.08)',
    badgeBg:    '#2A2C30',
    online:     '#4ADE80',
  } : {
    pageBg:     '#ECEEF1',
    cardBg:     '#FFFFFF',
    cardHover:  '#FAFAFA',
    border:     '#E4E6EB',
    borderStrong:'#DADDE1',
    textPri:    '#050505',
    textSec:    '#65676B',
    textMut:    '#BCC0C4',
    textDis:    '#BCC0C4',
    surface:    '#F0F2F5',
    surfaceHov: '#E8EAEE',
    surfaceAct: '#DDE0E6',
    divider:    '#D8DADF',
    inputBg:    '#F7F8FA',
    headerBg:   'rgba(255,255,255,0.97)',
    navBg:      'rgba(255,255,255,0.97)',
    sidebarBg:  '#F4F5F7',
    chatBg:     '#E9EBEE',
    bubbleSelf: '#C0392B',
    bubbleOther:'#FFFFFF',
    bubbleOtherBorder: '#E4E6EB',
    badgeBg:    '#F0F2F5',
    online:     '#22C55E',
  }

  return (
    <DarkModeContext.Provider value={{ dark, setDark, toggle: () => setDark(d => !d), colors }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export const useDarkMode = () => {
  const ctx = useContext(DarkModeContext)
  if (!ctx) throw new Error('useDarkMode must be used within DarkModeProvider')
  return ctx
}
