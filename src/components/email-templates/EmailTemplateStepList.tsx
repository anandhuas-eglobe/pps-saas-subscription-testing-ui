import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import CircularProgress from '@mui/material/CircularProgress'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import type { EmailTemplateTestStepState } from '../../utils/emailTemplateTestFlows'

function stepIcon(status: EmailTemplateTestStepState['status']) {
  if (status === 'running') {
    return <CircularProgress size={16} />
  }
  if (status === 'done' || status === 'skipped') {
    return <CheckCircleIcon color="success" sx={{ fontSize: 18 }} />
  }
  if (status === 'error') {
    return <CancelIcon color="error" sx={{ fontSize: 18 }} />
  }
  return <RadioButtonUncheckedIcon color="disabled" sx={{ fontSize: 18 }} />
}

interface EmailTemplateStepListProps {
  steps: EmailTemplateTestStepState[]
  compact?: boolean
}

export function EmailTemplateStepList({ steps, compact = false }: EmailTemplateStepListProps) {
  return (
    <Stack spacing={compact ? 0.75 : 1}>
      {steps.map((step, index) => (
        <Stack
          key={step.id}
          direction="row"
          spacing={1.25}
          sx={{
            alignItems: 'flex-start',
            p: compact ? 1 : 1.25,
            borderRadius: 1.5,
            bgcolor:
              step.status === 'running'
                ? 'action.hover'
                : step.status === 'error'
                  ? 'rgba(211, 47, 47, 0.08)'
                  : 'transparent',
          }}
        >
          <Box sx={{ pt: 0.15, flexShrink: 0 }}>{stepIcon(step.status)}</Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: compact ? '0.8125rem' : undefined }}>
              {index + 1}. {step.label}
            </Typography>
            {step.detail && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', wordBreak: 'break-word' }}
              >
                {step.detail}
              </Typography>
            )}
          </Box>
        </Stack>
      ))}
    </Stack>
  )
}
