import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CodeIcon from '@mui/icons-material/Code'
import type { ApiResponse } from '../types/subscription'
import { ValidationErrorsAlert } from './ValidationErrorsAlert'
import { extractApiErrors, getApiErrorTitle } from '../utils/apiErrors'

interface ApiLogPanelProps {
  title: string
  payload?: unknown
  response?: ApiResponse<unknown> | null
  error?: unknown
}

function formatError(error: unknown): string {
  if (!error) return ''
  if (error instanceof Error) {
    return JSON.stringify(
      {
        name: error.name,
        message: error.message,
        ...('body' in error ? { body: (error as { body?: unknown }).body } : {}),
      },
      null,
      2,
    )
  }
  return JSON.stringify(error, null, 2)
}

const codeBlockSx = {
  m: 0,
  p: 2,
  borderRadius: 2,
  bgcolor: '#0f172a',
  color: '#e2e8f0',
  fontSize: '0.8rem',
  lineHeight: 1.5,
  overflow: 'auto',
  maxHeight: 360,
}

export function ApiLogPanel({ title, payload, response, error }: ApiLogPanelProps) {
  const validationErrors = [
    ...extractApiErrors(error),
    ...(response?.success === false ? extractApiErrors(response) : []),
  ]
  const uniqueErrors = validationErrors.filter(
    (item, index, list) =>
      list.findIndex(
        (other) =>
          other.field === item.field &&
          other.message === item.message &&
          other.code === item.code,
      ) === index,
  )
  const responseFailed = response?.success === false
  const errorCode =
    (error && typeof error === 'object' && 'body' in error
      ? (error as { body?: ApiResponse<unknown> }).body?.errorCode
      : undefined) ?? response?.errorCode

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
          <CodeIcon color="primary" />
          <Typography variant="h6">{title}</Typography>
        </Stack>

        {uniqueErrors.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <ValidationErrorsAlert
              title={getApiErrorTitle(error ?? response)}
              errors={uniqueErrors}
              errorCode={errorCode}
            />
          </Box>
        )}

        {payload !== undefined && (
          <Accordion defaultExpanded disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 600 }}>Request payload</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box component="pre" sx={codeBlockSx}>
                {JSON.stringify(payload, null, 2)}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {response && (
          <Accordion
            defaultExpanded={responseFailed || uniqueErrors.length > 0}
            disableGutters
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 600 }}>Response</Typography>
                <Chip
                  label={responseFailed ? 'Failed' : 'Success'}
                  color={responseFailed ? 'error' : 'success'}
                  size="small"
                />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Box component="pre" sx={codeBlockSx}>
                {JSON.stringify(response, null, 2)}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {error != null && uniqueErrors.length === 0 && (
          <Alert severity="error" sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Error details
            </Typography>
            <Box component="pre" sx={{ ...codeBlockSx, bgcolor: '#450a0a', maxHeight: 240 }}>
              {formatError(error)}
            </Box>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
