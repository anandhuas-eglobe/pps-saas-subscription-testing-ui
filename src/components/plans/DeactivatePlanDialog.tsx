import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { listPlans } from '../../api/plans'
import type { PlanDetail, PlanListItem } from '../../types/subscription'
import { PlanStatus } from '../../types/subscription'

interface DeactivatePlanDialogProps {
  open: boolean
  plan: PlanDetail
  submitting: boolean
  onClose: () => void
  onConfirm: (payload: {
    migrationPlanId?: string
    isTrialPeriodEnabled?: boolean
    trialPeriod?: number
  }) => void
}

export function DeactivatePlanDialog({
  open,
  plan,
  submitting,
  onClose,
  onConfirm,
}: DeactivatePlanDialogProps) {
  const [migrationPlans, setMigrationPlans] = useState<PlanListItem[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [migrationPlanId, setMigrationPlanId] = useState('')
  const [applyMigrationTrial, setApplyMigrationTrial] = useState(false)
  const [migrationTrialPeriod, setMigrationTrialPeriod] = useState(plan.trial.days ?? 14)
  const [validationError, setValidationError] = useState<string | null>(null)

  const planHasTrial = plan.trial.enabled

  useEffect(() => {
    if (!open) {
      return
    }

    setMigrationPlanId('')
    setApplyMigrationTrial(false)
    setMigrationTrialPeriod(plan.trial.days ?? 14)
    setValidationError(null)

    let cancelled = false
    const loadActivePlans = async () => {
      setLoadingPlans(true)
      setLoadError(null)
      try {
        const result = await listPlans({
          status: PlanStatus.ACTIVE,
          limit: 100,
          sortBy: 'planName',
          sortOrder: 'asc',
        })
        if (!cancelled) {
          setMigrationPlans(result.plans.filter((item) => item.id !== plan.id))
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load active plans')
        }
      } finally {
        if (!cancelled) {
          setLoadingPlans(false)
        }
      }
    }

    void loadActivePlans()
    return () => {
      cancelled = true
    }
  }, [open, plan.id, plan.trial.days])

  const handleConfirm = () => {
    if (planHasTrial && applyMigrationTrial && !migrationPlanId) {
      setValidationError('Select a migration plan when configuring trial on the target plan.')
      return
    }

    if (applyMigrationTrial && migrationTrialPeriod <= 0) {
      setValidationError('Trial period must be a positive number.')
      return
    }

    setValidationError(null)

    const payload: {
      migrationPlanId?: string
      isTrialPeriodEnabled?: boolean
      trialPeriod?: number
    } = {}

    if (migrationPlanId) {
      payload.migrationPlanId = migrationPlanId
    }

    if (planHasTrial && applyMigrationTrial) {
      payload.isTrialPeriodEnabled = true
      payload.trialPeriod = migrationTrialPeriod
    }

    onConfirm(payload)
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Deactivate plan</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            This will change <strong>{plan.planName}</strong> from Active to Inactive. Inactive
            plans are no longer available for new subscriptions.
          </Typography>

          <Alert severity="info">
            Optionally choose an active migration plan for existing subscribers. If this plan has
            trial enabled, you can also apply trial settings to the migration plan.
          </Alert>

          {loadError && <Alert severity="error">{loadError}</Alert>}
          {validationError && <Alert severity="error">{validationError}</Alert>}

          <FormControl fullWidth size="small" disabled={loadingPlans || submitting}>
            <InputLabel id="migration-plan-label" shrink>
              Migration plan (optional)
            </InputLabel>
            <Select
              labelId="migration-plan-label"
              label="Migration plan (optional)"
              value={migrationPlanId}
              displayEmpty
              onChange={(event) => setMigrationPlanId(event.target.value)}
              notched
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {migrationPlans.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.planName} ({item.planType})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {loadingPlans && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <CircularProgress size={18} />
              <Typography variant="caption" color="text.secondary">
                Loading active plans...
              </Typography>
            </Stack>
          )}

          {planHasTrial && (
            <Stack spacing={1.5}>
              <FormControlLabel
                control={
                  <Switch
                    checked={applyMigrationTrial}
                    onChange={(event) => setApplyMigrationTrial(event.target.checked)}
                    disabled={submitting}
                  />
                }
                label="Apply trial settings to migration plan"
              />

              {applyMigrationTrial && (
                <TextField
                  fullWidth
                  size="small"
                  label="Migration plan trial period (days)"
                  type="number"
                  value={migrationTrialPeriod}
                  onChange={(event) => setMigrationTrialPeriod(Number(event.target.value))}
                  disabled={submitting}
                  helperText="Requires a migration plan to be selected."
                />
              )}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={handleConfirm}
          disabled={submitting}
        >
          {submitting ? 'Deactivating...' : 'Deactivate plan'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
