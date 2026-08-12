import { useCallback, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ScheduleIcon from '@mui/icons-material/Schedule'
import type { EmailTemplateDefinition } from '../../config/emailTemplateCatalog'
import { getEmailTemplateCategoryMeta } from '../../config/emailTemplateCatalog'
import {
  EMAIL_TEMPLATE_TEST_FLOWS,
  type EmailTemplateTestFlowResult,
  type EmailTemplateTestStepState,
} from '../../utils/emailTemplateTestFlows'
import { ApiErrorAlert } from '../ApiErrorAlert'
import { EmailTemplateStepList } from './EmailTemplateStepList'

interface EmailTemplateTestCardProps {
  template: EmailTemplateDefinition
}

export function EmailTemplateTestCard({ template }: EmailTemplateTestCardProps) {
  const category = getEmailTemplateCategoryMeta(template.category)
  const flow = EMAIL_TEMPLATE_TEST_FLOWS[template.id]

  const [expanded, setExpanded] = useState(false)
  const [steps, setSteps] = useState<EmailTemplateTestStepState[]>(() =>
    flow ? flow.steps.map((step) => ({ ...step })) : [],
  )
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [result, setResult] = useState<EmailTemplateTestFlowResult | null>(null)

  const completedCount = useMemo(
    () => steps.filter((step) => step.status === 'done' || step.status === 'skipped').length,
    [steps],
  )

  const resetSteps = useCallback(() => {
    if (!flow) return
    setSteps(flow.steps.map((step) => ({ ...step })))
  }, [flow])

  const updateStep = useCallback((stepId: string, update: Partial<EmailTemplateTestStepState>) => {
    setSteps((current) =>
      current.map((step) => (step.id === stepId ? { ...step, ...update } : step)),
    )
  }, [])

  const handleRun = async () => {
    if (!flow) return

    setExpanded(true)
    setRunning(true)
    setError(null)
    setResult(null)
    resetSteps()

    try {
      const flowResult = await flow.run((stepId, update) => {
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

  const showSteps = expanded && flow && (running || completedCount > 0 || error != null)

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderTop: `3px solid ${category.accent}`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
        },
      }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, p: 2.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: `${category.accent}18`,
              color: category.accent,
              flexShrink: 0,
            }}
          >
            <EmailOutlinedIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              {template.title}
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.75 }}>
              <Chip label={category.label} size="small" variant="outlined" />
              {template.automated ? (
                <Chip
                  icon={<AutoAwesomeIcon sx={{ fontSize: '14px !important' }} />}
                  label="Automated"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              ) : (
                <Chip
                  icon={<ScheduleIcon sx={{ fontSize: '14px !important' }} />}
                  label="Coming soon"
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          {template.description}
        </Typography>

        <Stack spacing={0.75}>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {template.templateId}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
          >
            {template.eventType}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {template.automated && flow ? (
            <>
              <Button
                size="small"
                variant="contained"
                startIcon={
                  running ? <CircularProgress size={14} color="inherit" /> : <PlayArrowIcon />
                }
                disabled={running}
                onClick={() => void handleRun()}
              >
                {running ? `Running (${completedCount}/${steps.length})…` : 'Run test'}
              </Button>
              {!running && completedCount > 0 && (
                <Button size="small" variant="text" onClick={resetSteps}>
                  Reset
                </Button>
              )}
            </>
          ) : (
            <Button size="small" variant="outlined" disabled startIcon={<ScheduleIcon />}>
              Flow pending
            </Button>
          )}
          {showSteps && (
            <Button size="small" variant="text" onClick={() => setExpanded((current) => !current)}>
              {expanded ? 'Hide steps' : 'Show steps'}
            </Button>
          )}
        </Stack>

        <Collapse in={showSteps && expanded} unmountOnExit>
          <Box
            sx={{
              mt: 0.5,
              pt: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <EmailTemplateStepList steps={steps} compact />
          </Box>
        </Collapse>

        {error != null && <ApiErrorAlert error={error} />}

        {result && (
          <Alert severity="success" sx={{ mt: 'auto' }}>
            {result.summary}
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
