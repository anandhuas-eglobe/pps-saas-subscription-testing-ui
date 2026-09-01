import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ScheduleIcon from '@mui/icons-material/Schedule'
import {
  checkCronDevToolsHealth,
  DEV_CRON_JOBS,
  enqueueCronJob,
} from '../../api/cronDevTools'

export function CronJobsMenu() {
  const [devToolsAvailable, setDevToolsAvailable] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [runningJobId, setRunningJobId] = useState<string | null>(null)
  const closeTimerRef = useRef<number | null>(null)
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
    checkCronDevToolsHealth()
      .then((health) => setDevToolsAvailable(health.available))
      .catch(() => setDevToolsAvailable(false))
  }, [])

  const clearCloseTimer = () => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const openMenu = () => {
    clearCloseTimer()
    setMenuOpen(true)
  }

  const scheduleCloseMenu = () => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      setMenuOpen(false)
    }, 180)
  }

  const handleRunCron = async (jobId: string, queue: string) => {
    setRunningJobId(jobId)
    try {
      const result = await enqueueCronJob(queue)
      setSnackbar({
        open: true,
        message: result.message,
        severity: 'success',
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to enqueue cron job. Start the UI with npm run dev.'
      setSnackbar({
        open: true,
        message,
        severity: 'error',
      })
    } finally {
      setRunningJobId(null)
    }
  }

  const tooltipAvailable = devToolsAvailable
    ? 'Hover to run BullMQ cron jobs (dev only)'
    : 'Available when running npm run dev with the cron dev middleware'

  return (
    <>
      <Box
        sx={{ position: 'relative', flexShrink: 0 }}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleCloseMenu}
      >
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          disabled={!devToolsAvailable}
          startIcon={<ScheduleIcon sx={{ fontSize: '18px !important' }} />}
          sx={{
            color: 'white',
            borderColor: 'rgba(255,255,255,0.45)',
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
          Crons
        </Button>

        {menuOpen && devToolsAvailable && (
          <Paper
            elevation={8}
            onMouseEnter={openMenu}
            onMouseLeave={scheduleCloseMenu}
            sx={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              zIndex: (theme) => theme.zIndex.modal + 1,
              width: 360,
              maxWidth: '90vw',
              overflow: 'hidden',
              borderRadius: 2,
            }}
          >
            <Box sx={{ px: 2, py: 1.5, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2">Run cron job</Typography>
              <Typography variant="caption" color="text.secondary">
                {tooltipAvailable}
              </Typography>
            </Box>
            <Divider />
            <Stack divider={<Divider flexItem />} sx={{ py: 0.5 }}>
              {DEV_CRON_JOBS.map((job) => {
                const running = runningJobId === job.id

                return (
                  <Stack
                    key={job.id}
                    direction="row"
                    spacing={1.5}
                    sx={{
                      px: 2,
                      py: 1.25,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {job.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          fontFamily: 'monospace',
                          wordBreak: 'break-all',
                        }}
                      >
                        {job.queue}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {job.description}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={running || runningJobId != null}
                      startIcon={
                        running ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : (
                          <PlayArrowIcon />
                        )
                      }
                      onClick={() => void handleRunCron(job.id, job.queue)}
                      sx={{ flexShrink: 0, mt: 0.25 }}
                    >
                      {running ? 'Running…' : 'Run'}
                    </Button>
                  </Stack>
                )
              })}
            </Stack>
          </Paper>
        )}
      </Box>

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
