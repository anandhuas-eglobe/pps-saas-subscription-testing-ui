import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import CleaningServicesIcon from '@mui/icons-material/CleaningServices'
import { checkRedisDevToolsHealth, flushRedisCache } from '../../api/redisDevTools'

export function RedisCacheFlushButton() {
  const [devToolsAvailable, setDevToolsAvailable] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [flushing, setFlushing] = useState(false)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info'
  }>({
    open: false,
    message: '',
    severity: 'info',
  })

  useEffect(() => {
    checkRedisDevToolsHealth()
      .then((health) => setDevToolsAvailable(health.available))
      .catch(() => setDevToolsAvailable(false))
  }, [])

  const handleConfirmFlush = async () => {
    setFlushing(true)
    try {
      const result = await flushRedisCache()
      setDialogOpen(false)
      setSnackbar({
        open: true,
        message: result.message,
        severity: result.keysDeleted > 0 ? 'success' : 'info',
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to flush Redis cache. Start the UI with npm run dev.'

      setSnackbar({
        open: true,
        message,
        severity: 'error',
      })
    } finally {
      setFlushing(false)
    }
  }

  const tooltip = devToolsAvailable
    ? 'Flush subscription Redis cache (dev only)'
    : 'Available when running npm run dev with the Redis dev middleware'

  return (
    <>
      <Tooltip title={tooltip}>
        <span>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            onClick={() => setDialogOpen(true)}
            disabled={!devToolsAvailable || flushing}
            startIcon={
              flushing ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <CleaningServicesIcon sx={{ fontSize: '18px !important' }} />
              )
            }
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.45)',
              flexShrink: 0,
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.8)',
                bgcolor: 'rgba(255,255,255,0.08)',
              },
              '&.Mui-disabled': {
                color: 'rgba(255,255,255,0.45)',
                borderColor: 'rgba(255,255,255,0.2)',
              },
            }}
          >
            Flush cache
          </Button>
        </span>
      </Tooltip>

      <Dialog
        open={dialogOpen}
        onClose={flushing ? undefined : () => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Flush Redis cache</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              This will delete Redis keys matching <strong>subscription:*</strong> on the local
              dev Redis instance (default <code>localhost:6790</code>).
            </Typography>
            <Alert severity="warning">
              Cached plan, cart, subscription, and invoice responses in the subscription service
              will be cleared. Payment streams and other non-cache keys are not removed.
            </Alert>
            <Typography variant="caption" color="text.secondary">
              Dev only — requires <code>npm run dev</code> with the Redis dev middleware active.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={flushing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => void handleConfirmFlush()}
            disabled={flushing}
            startIcon={flushing ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {flushing ? 'Flushing...' : 'Flush cache'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.severity === 'error' ? 8000 : 5000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
          variant="filled"
          sx={{ width: '100%', maxWidth: 420 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}
