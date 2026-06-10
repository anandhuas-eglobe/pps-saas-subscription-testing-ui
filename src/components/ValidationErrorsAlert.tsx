import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ApiErrorItem } from '../types/subscription'
import { formatApiErrorLine } from '../utils/apiErrors'

interface ValidationErrorsAlertProps {
  title: string
  errors: ApiErrorItem[]
  errorCode?: string
  subtitle?: string
}

export function ValidationErrorsAlert({
  title,
  errors,
  errorCode,
  subtitle,
}: ValidationErrorsAlertProps) {
  if (errors.length === 0) {
    return (
      <Alert severity="error">
        <AlertTitle>{title}</AlertTitle>
        {subtitle && <Typography variant="body2">{subtitle}</Typography>}
      </Alert>
    )
  }

  return (
    <Alert severity="error" sx={{ alignItems: 'flex-start' }}>
      <AlertTitle sx={{ mb: 0.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{title}</span>
          {errorCode && <Chip label={errorCode} size="small" color="error" variant="outlined" />}
          <Chip label={`${errors.length} issue${errors.length === 1 ? '' : 's'}`} size="small" />
        </Stack>
      </AlertTitle>

      {subtitle && (
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {subtitle}
        </Typography>
      )}

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Fix the following before submitting again:
      </Typography>

      <List dense disablePadding sx={{ width: '100%' }}>
        {errors.map((error, index) => (
          <ListItem
            key={`${error.field ?? 'error'}-${error.code ?? index}`}
            disableGutters
            sx={{ alignItems: 'flex-start', py: 0.75 }}
          >
            <ListItemText
              primary={
                <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {error.field && (
                    <Chip
                      label={error.field}
                      size="small"
                      variant="outlined"
                      sx={{ fontFamily: 'monospace', fontSize: '0.72rem' }}
                    />
                  )}
                  {error.code && error.code !== 'VALIDATION_ERROR' && (
                    <Chip label={error.code} size="small" sx={{ fontSize: '0.72rem' }} />
                  )}
                  <Typography variant="body2" component="span" sx={{ flex: 1, minWidth: 200 }}>
                    {error.message}
                  </Typography>
                </Stack>
              }
              secondary={
                error.constraints && error.constraints.length > 1 ? (
                  <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.5 }}>
                    {error.constraints.map((constraint) => (
                      <Typography key={constraint} component="li" variant="caption" color="text.secondary">
                        {constraint}
                      </Typography>
                    ))}
                  </Box>
                ) : error.value !== undefined ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Received value: {JSON.stringify(error.value)}
                  </Typography>
                ) : null
              }
            />
          </ListItem>
        ))}
      </List>

      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'error.light', opacity: 0.9 }}>
        <Typography variant="caption" color="text.secondary">
          Summary: {errors.map(formatApiErrorLine).join(' · ')}
        </Typography>
      </Box>
    </Alert>
  )
}
