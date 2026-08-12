import { useCallback, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import EmailIcon from '@mui/icons-material/Email'
import CancelIcon from '@mui/icons-material/Cancel'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { ApiErrorAlert } from '../ApiErrorAlert'
import {
  runTrialAllocatedEmailTestFlow,
  TRIAL_ALLOCATED_EMAIL_TEST_STEPS,
  type EmailTemplateTestStepState,
  type TrialAllocatedEmailTestResult,
  type TrialAllocatedEmailTestStepId,
} from '../../utils/emailTemplateTestFlows'

function stepIcon(status: EmailTemplateTestStepState['status']) {
  if (status === 'running') {
    return <CircularProgress size={18} />
  }
  if (status === 'done' || status === 'skipped') {
    return <CheckCircleIcon color="success" fontSize="small" />
  }
  if (status === 'error') {
    return <CancelIcon color="error" fontSize="small" />
  }
  return <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
}

export function TrialAllocatedEmailTestCard() {
  const [steps, setSteps] = useState<EmailTemplateTestStepState[]>(() =>
    TRIAL_ALLOCATED_EMAIL_TEST_STEPS.map((step) => ({ ...step })),
  )
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [result, setResult] = useState<TrialAllocatedEmailTestResult | null>(null)

  const updateStep = useCallback(
    (stepId: TrialAllocatedEmailTestStepId, update: Partial<EmailTemplateTestStepState>) => {
      setSteps((current) =>
        current.map((step) => (step.id === stepId ? { ...step, ...update } : step)),
      )
    },
    [],
  )

  const resetSteps = useCallback(() => {
    setSteps(TRIAL_ALLOCATED_EMAIL_TEST_STEPS.map((step) => ({ ...step })))
  }, [])

  const completedCount = useMemo(
    () => steps.filter((step) => step.status === 'done' || step.status === 'skipped').length,
    [steps],
  )

  const handleRun = async () => {
    setRunning(true)
    setError(null)
    setResult(null)
    resetSteps()

    try {
      const flowResult = await runTrialAllocatedEmailTestFlow((stepId, update) => {
        updateStep(stepId, update)
      })
      setResult(flowResult)
    } catch (err) {
      setError(err)
      setSteps((current) => {
        const runningStep = current.find((step) => step.status === 'running')
        if (!runningStep) {
          return current
        }
        return current.map((step) =>
          step.id === runningStep.id
            ? {
                ...step,
                status: 'error',
                detail: err instanceof Error ? err.message : 'Step failed',
              }
            : step,
        )
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { sm: 'flex-start' }, justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  flexShrink: 0,
                }}
              >
                <EmailIcon />
              </Box>
              <Box>
                <Typography variant="h6">Trial allocation email</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Runs a full trial checkout to trigger{' '}
                  <code>subscription/trial-allocated</code>. Flushes cache, creates an active
                  trial plan, adds it to the merchant cart, and completes checkout.
                </Typography>
              </Box>
            </Stack>
            <Chip
              label="subscription.trial.allocated.email"
              size="small"
              variant="outlined"
              sx={{ fontFamily: 'monospace', flexShrink: 0 }}
            />
          </Stack>

          <Stack spacing={1}>
            {steps.map((step, index) => (
              <Stack
                key={step.id}
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: 'flex-start',
                  p: 1.25,
                  borderRadius: 1.5,
                  bgcolor:
                    step.status === 'running'
                      ? 'action.hover'
                      : step.status === 'error'
                        ? 'rgba(211, 47, 47, 0.08)'
                        : 'transparent',
                }}
              >
                <Box sx={{ pt: 0.25, flexShrink: 0 }}>{stepIcon(step.status)}</Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {index + 1}. {step.label}
                  </Typography>
                  {step.detail && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {step.detail}
                    </Typography>
                  )}
                </Box>
              </Stack>
            ))}
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'center' }}>
            <Button
              variant="contained"
              startIcon={
                running ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />
              }
              disabled={running}
              onClick={() => void handleRun()}
            >
              {running ? `Running (${completedCount}/${steps.length})…` : 'Run trial email test'}
            </Button>
            {!running && completedCount > 0 && (
              <Button variant="text" onClick={resetSteps}>
                Reset steps
              </Button>
            )}
          </Stack>

          {error != null && <ApiErrorAlert error={error} />}

          {result && (
            <Alert severity="success">
              Trial checkout completed for <strong>{result.planName}</strong> ({result.planId}).
              {result.trialCheckout
                ? ' The subscription trial allocated notification should be sent to the signed-in merchant email.'
                : ' Checkout finished, but the cart was not marked as trial.'}
              {result.paymentConfirmed && ' Payment was confirmed via Redis.'}
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
