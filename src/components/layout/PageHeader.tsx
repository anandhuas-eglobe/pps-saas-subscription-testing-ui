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
    <Stack spacing={2}>
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
          alignItems: { xs: 'flex-start', md: 'center' },
        }}
      >
        <Box>
          {eyebrow && (
            <Chip label={eyebrow} size="small" color="primary" sx={{ mb: 1 }} />
          )}
          <Typography variant="h4" gutterBottom>
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
              sx={{ mt: 1.5, fontFamily: 'monospace' }}
            />
          )}
        </Box>
        {actions && <Stack direction="row" spacing={1}>{actions}</Stack>}
      </Stack>
    </Stack>
  )
}
