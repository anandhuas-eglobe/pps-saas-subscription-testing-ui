import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import {
  API_SERVER_CHANGED_EVENT,
  getSelectedVisualThemeId,
} from '../config/apiServersStorage'
import { getThemeById } from './theme'
import type { AppVisualThemeId } from './visualThemes'

export function ServerThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<AppVisualThemeId>(() => getSelectedVisualThemeId())

  useEffect(() => {
    const syncTheme = () => {
      setThemeId(getSelectedVisualThemeId())
    }

    syncTheme()
    window.addEventListener(API_SERVER_CHANGED_EVENT, syncTheme)
    window.addEventListener('storage', syncTheme)
    return () => {
      window.removeEventListener(API_SERVER_CHANGED_EVENT, syncTheme)
      window.removeEventListener('storage', syncTheme)
    }
  }, [])

  const theme = useMemo(() => getThemeById(themeId), [themeId])

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}
