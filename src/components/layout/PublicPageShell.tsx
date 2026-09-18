import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import { useTheme } from '@mui/material/styles'
import { SettingsIconButton } from './SettingsIconButton'

export function PublicPageShell({ children }: { children: ReactNode }) {
  const theme = useTheme()

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: theme.custom.pageShellBackground,
        py: { xs: 2, sm: 4 },
        position: 'relative',
      }}
    >
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: (theme) => theme.zIndex.appBar,
        }}
      >
        <SettingsIconButton tone="dark" />
      </Box>
      <Container maxWidth="lg">{children}</Container>
    </Box>
  )
}
