import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import SubscriptionsIcon from '@mui/icons-material/Subscriptions'
import { useTheme } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { SettingsIconButton } from '../layout/SettingsIconButton'

interface AuthFormLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  maxWidth?: number
}

export function AuthFormLayout({
  title,
  subtitle,
  children,
  maxWidth = 440,
}: AuthFormLayoutProps) {
  const theme = useTheme()

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        position: 'relative',
        background: theme.custom.loginBackground,
      }}
    >
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: (muiTheme) => muiTheme.zIndex.appBar,
        }}
      >
        <SettingsIconButton tone="dark" />
      </Box>
      <Paper
        sx={{
          width: '100%',
          maxWidth,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
        }}
      >
        <Stack spacing={3}>
          <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                background: theme.custom.brandMarkGradient,
                color: 'white',
              }}
            >
              <SubscriptionsIcon />
            </Box>
            <Typography variant="h5">{title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Stack>
          {children}
        </Stack>
      </Paper>
    </Box>
  )
}
