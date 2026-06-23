import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import type { ApiErrorItem, ApiErrorMeta } from '../types/subscription'
import { formatApiErrorLine } from '../utils/apiErrors'

interface ValidationErrorsAlertProps {
  title: string
  errors: ApiErrorItem[]
  errorCode?: string
  subtitle?: string
  meta?: ApiErrorMeta | null
  action?: ReactNode
}

function MetaBlock({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontFamily: typeof value === 'string' ? 'monospace' : undefined, fontSize: '0.8rem' }}>
        {value}
      </Typography>
    </Box>
  )
}

function JsonMetaBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1,
          borderRadius: 1,
          bgcolor: 'action.hover',
          fontSize: '0.72rem',
          overflow: 'auto',
          maxHeight: 160,
        }}
      >
        {JSON.stringify(value, null, 2)}
      </Box>
    </Box>
  )
}

function ErrorItemDetails({ error }: { error: ApiErrorItem }) {
  const hasConstraints = Boolean(error.constraints?.length)
  const hasValue = error.value !== undefined
  const hasMetadata =
    error.metadata != null && typeof error.metadata === 'object' && Object.keys(error.metadata).length > 0

  if (!hasConstraints && !hasValue && !hasMetadata) {
    return null
  }

  return (
    <Stack spacing={0.75} sx={{ mt: 0.75, pl: 0.5 }}>
      {hasConstraints && (
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          {error.constraints!.map((constraint) => (
            <Typography key={constraint} component="li" variant="caption" color="text.secondary">
              {constraint}
            </Typography>
          ))}
        </Box>
      )}
      {hasValue && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Received value: {JSON.stringify(error.value)}
        </Typography>
      )}
      {hasMetadata && <JsonMetaBlock label="Metadata" value={error.metadata} />}
    </Stack>
  )
}

export function ValidationErrorsAlert({
  title,
  errors,
  errorCode,
  subtitle,
  meta,
  action,
}: ValidationErrorsAlertProps) {
  if (errors.length === 0) {
    return (
      <Alert severity="error" action={action}>
        <AlertTitle>{title}</AlertTitle>
        {subtitle && <Typography variant="body2">{subtitle}</Typography>}
        {meta && (
          <Box sx={{ mt: 1.5 }}>
            <ApiErrorMetaSection meta={meta} />
          </Box>
        )}
      </Alert>
    )
  }

  return (
    <Alert severity="error" sx={{ alignItems: 'flex-start' }} action={action}>
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

      {meta && (
        <Box sx={{ mb: 1.5 }}>
          <ApiErrorMetaSection meta={meta} />
        </Box>
      )}

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Fix the following before submitting again:
      </Typography>

      <List dense disablePadding sx={{ width: '100%' }}>
        {errors.map((error, index) => (
          <ListItem
            key={`${error.field ?? 'error'}-${error.code ?? index}-${error.message}`}
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
                  {error.code && (
                    <Chip
                      label={error.code}
                      size="small"
                      color="error"
                      variant="outlined"
                      sx={{ fontSize: '0.72rem' }}
                    />
                  )}
                  <Typography variant="body2" component="span" sx={{ flex: 1, minWidth: 200 }}>
                    {error.message}
                  </Typography>
                </Stack>
              }
              secondary={<ErrorItemDetails error={error} />}
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

function ApiErrorMetaSection({ meta }: { meta: ApiErrorMeta }) {
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        {meta.statusCode != null && (
          <Chip label={`HTTP ${meta.statusCode}`} size="small" variant="outlined" />
        )}
        {meta.errorCount != null && (
          <Chip label={`${meta.errorCount} error${meta.errorCount === 1 ? '' : 's'}`} size="small" variant="outlined" />
        )}
        {meta.method && <Chip label={meta.method} size="small" variant="outlined" />}
      </Stack>

      <Grid container spacing={1.5}>
        {meta.path && (
          <Grid size={{ xs: 12 }}>
            <MetaBlock label="Path" value={meta.path} />
          </Grid>
        )}
        {meta.correlationId && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <MetaBlock label="Correlation ID" value={meta.correlationId} />
          </Grid>
        )}
      </Grid>

      {meta.context && Object.keys(meta.context).length > 0 && (
        <JsonMetaBlock label="Context" value={meta.context} />
      )}
    </Stack>
  )
}
