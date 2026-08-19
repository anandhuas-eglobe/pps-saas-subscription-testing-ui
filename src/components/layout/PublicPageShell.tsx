import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'

export function PublicPageShell({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'grey.50',
        py: { xs: 2, sm: 4 },
      }}
    >
      <Container maxWidth="lg">{children}</Container>
    </Box>
  )
}
