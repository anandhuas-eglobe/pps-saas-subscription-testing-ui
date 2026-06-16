import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { getPlanById, updatePlanStatus } from '../api/plans'
import { ApiRequestError } from '../api/client'
import { PageHeader } from '../components/layout/PageHeader'
import { DeactivatePlanDialog } from '../components/plans/DeactivatePlanDialog'
import { PlanDetailView } from '../components/plans/PlanDetailView'
import type { PlanDetail } from '../types/subscription'
import { PlanStatus } from '../types/subscription'
import { isDraftPlan } from '../utils/planDisplay'

export function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>()
  const navigate = useNavigate()

  const [plan, setPlan] = useState<PlanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)

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

    setStatusUpdating(true)
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
      setStatusUpdating(false)
    }
  }

  const handleDeactivate = async (options: {
    migrationPlanId?: string
    isTrialPeriodEnabled?: boolean
    trialPeriod?: number
  }) => {
    if (!planId) {
      return
    }

    setStatusUpdating(true)
    try {
      await updatePlanStatus(planId, {
        status: PlanStatus.INACTIVE,
        ...options,
      })
      setDeactivateDialogOpen(false)
      setSnackbar({ open: true, message: 'Plan deactivated successfully', severity: 'success' })
      await loadPlan()
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to deactivate plan'
      setSnackbar({ open: true, message, severity: 'error' })
    } finally {
      setStatusUpdating(false)
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
          description="Full subscription plan configuration including pricing, trial settings, and attached features. Draft plans can be edited; activate or deactivate from the actions above."
          apiEndpoint={`GET /api/v1/admin/plans/${planId} · PUT /api/v1/admin/plans/${planId} · PATCH /api/v1/admin/plans/${planId}`}
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
              {plan && isDraftPlan(plan.status) && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<EditOutlinedIcon />}
                    disabled={loading}
                    onClick={() => navigate(`/plans/${planId}/edit`)}
                  >
                    Edit plan
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => void handleActivate()}
                    disabled={statusUpdating || loading}
                  >
                    Activate plan
                  </Button>
                </>
              )}
              {plan?.status === PlanStatus.ACTIVE && (
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<PauseCircleOutlinedIcon />}
                  onClick={() => setDeactivateDialogOpen(true)}
                  disabled={statusUpdating || loading}
                >
                  Deactivate plan
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

      {plan && (
        <DeactivatePlanDialog
          open={deactivateDialogOpen}
          plan={plan}
          submitting={statusUpdating}
          onClose={() => setDeactivateDialogOpen(false)}
          onConfirm={(payload) => void handleDeactivate(payload)}
        />
      )}

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
