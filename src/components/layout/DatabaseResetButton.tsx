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
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import {
  checkDatabaseDevToolsHealth,
  resetSubscriptionDatabase,
} from '../../api/databaseDevTools'

export function DatabaseResetButton() {
  const [devToolsAvailable, setDevToolsAvailable] = useState(false)
  const [healthMessage, setHealthMessage] = useState('')
  const [containerName, setContainerName] = useState('pps-saas-subscription')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
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
    checkDatabaseDevToolsHealth()
      .then((health) => {
        setDevToolsAvailable(health.available)
        setHealthMessage(health.message)
        if (health.containerName) {
          setContainerName(health.containerName)
        }
      })
      .catch(() => {
        setDevToolsAvailable(false)
        setHealthMessage('Database dev middleware is unavailable.')
      })
  }, [])

  const handleOpenDialog = () => {
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    if (!resetting) {
      setDialogOpen(false)
    }
  }

  const handleConfirmReset = async () => {
    setResetting(true)
    try {
      const result = await resetSubscriptionDatabase()
      setDialogOpen(false)
      setSnackbar({
        open: true,
        message: result.message,
        severity: 'success',
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to reset subscription database. Start the UI with npm run dev.'

      setSnackbar({
        open: true,
        message,
        severity: 'error',
      })
    } finally {
      setResetting(false)
    }
  }

  const tooltip = devToolsAvailable
    ? 'Reset subscription_db in Docker (dev only)'
    : healthMessage ||
      'Available when running npm run dev with Docker and the subscription container up'

  return (
    <>
      <Tooltip title={tooltip}>
        <span>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            onClick={handleOpenDialog}
            disabled={!devToolsAvailable || resetting}
            startIcon={
              resetting ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <RestartAltIcon sx={{ fontSize: '18px !important' }} />
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
            Reset DB
          </Button>
        </span>
      </Tooltip>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reset subscription database</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              This runs{' '}
              <code>docker exec {containerName} npx prisma migrate reset --force</code> against
              the local subscription Docker container. All subscription data in{' '}
              <strong>subscription_db</strong> will be dropped, migrations reapplied, and the
              Prisma seed will run if configured.
            </Typography>
            <Alert severity="error">
              Destructive action. Plans, subscriptions, carts, invoices, and other subscription
              service data will be permanently removed from the database.
            </Alert>
            <Typography variant="caption" color="text.secondary">
              Dev only — requires <code>npm run dev</code>, Docker CLI access, and the{' '}
              <code>{containerName}</code> container running.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} disabled={resetting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleConfirmReset()}
            disabled={resetting}
            startIcon={resetting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {resetting ? 'Resetting...' : 'Reset database'}
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
