import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Link as RouterLink } from 'react-router-dom'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description: string
  apiEndpoint?: string
  actions?: React.ReactNode
  showBack?: boolean
  backTo?: string
  backLabel?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  apiEndpoint,
  actions,
  showBack = true,
  backTo = '/',
  backLabel = 'Back to home',
}: PageHeaderProps) {
  return (
    <Stack spacing={2} sx={{ minWidth: 0, maxWidth: '100%' }}>
      {showBack && (
        <Button
          component={RouterLink}
          to={backTo}
          startIcon={<ArrowBackIcon />}
          sx={{ alignSelf: 'flex-start' }}
        >
          {backLabel}
        </Button>
      )}

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'flex-start' },
          minWidth: 0,
          maxWidth: '100%',
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {eyebrow && (
            <Chip label={eyebrow} size="small" color="primary" sx={{ mb: 1 }} />
          )}
          <Typography variant="h4" gutterBottom sx={{ wordBreak: 'break-word' }}>
            {title}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {description}
          </Typography>
          {apiEndpoint && (
            <Chip
              label={apiEndpoint}
              size="small"
              variant="outlined"
              sx={{
                mt: 1.5,
                fontFamily: 'monospace',
                maxWidth: '100%',
                height: 'auto',
                alignItems: 'flex-start',
                '& .MuiChip-label': {
                  display: 'block',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  py: 0.75,
                },
              }}
            />
          )}
        </Box>
        {actions && (
          <Stack
            direction="row"
            spacing={1}
            sx={{ flexShrink: 0, flexWrap: 'wrap', maxWidth: '100%' }}
          >
            {actions}
          </Stack>
        )}
      </Stack>
    </Stack>
  )
}
