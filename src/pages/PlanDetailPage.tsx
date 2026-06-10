import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { getPlanById, updatePlanStatus } from '../api/plans'
import { ApiRequestError } from '../api/client'
import { PageHeader } from '../components/layout/PageHeader'
import { PlanDetailView } from '../components/plans/PlanDetailView'
import type { PlanDetail } from '../types/subscription'
import { PlanStatus } from '../types/subscription'

export function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>()
  const navigate = useNavigate()

  const [plan, setPlan] = useState<PlanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activating, setActivating] = useState(false)

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const loadPlan = useCallback(async () => {
    if (!planId) {
      setError('Plan ID is missing from the URL.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const detail = await getPlanById(planId)
      setPlan(detail)
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load plan details'
      setError(message)
      setPlan(null)
    } finally {
      setLoading(false)
    }
  }, [planId])

  useEffect(() => {
    void loadPlan()
  }, [loadPlan])

  const handleActivate = async () => {
    if (!planId) {
      return
    }

    setActivating(true)
    try {
      await updatePlanStatus(planId, { status: PlanStatus.ACTIVE })
      setSnackbar({ open: true, message: 'Plan activated successfully', severity: 'success' })
      await loadPlan()
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to activate plan'
      setSnackbar({ open: true, message, severity: 'error' })
    } finally {
      setActivating(false)
    }
  }

  if (!planId) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">Invalid plan URL.</Alert>
        <Button component={RouterLink} to="/plans">
          Back to plans
        </Button>
      </Stack>
    )
  }

  return (
    <>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Plan details"
          title={plan?.planName ?? 'Loading plan...'}
          description="Full subscription plan configuration including pricing, trial settings, and attached features."
          apiEndpoint={`GET /api/v1/admin/plans/${planId}`}
          backTo="/plans"
          backLabel="Back to plans"
          actions={
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => void loadPlan()}
                disabled={loading}
              >
                Refresh
              </Button>
              {plan?.status === PlanStatus.DRAFT && (
                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => void handleActivate()}
                  disabled={activating || loading}
                >
                  Activate plan
                </Button>
              )}
            </Stack>
          }
        />

        {loading && (
          <Stack sx={{ py: 10, alignItems: 'center' }}>
            <CircularProgress />
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Loading plan details...
            </Typography>
          </Stack>
        )}

        {!loading && error && (
          <Stack spacing={2}>
            <Alert severity="error">{error}</Alert>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => void loadPlan()}>
                Retry
              </Button>
              <Button variant="text" onClick={() => navigate('/plans')}>
                Back to plans
              </Button>
            </Stack>
          </Stack>
        )}

        {!loading && !error && plan && <PlanDetailView plan={plan} />}
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}
