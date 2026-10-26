import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CodeIcon from '@mui/icons-material/Code'
import type { GatewayResponseSnapshot } from '../api/gatewaySnapshot'
import { gatewaySnapshotFromError } from '../api/errors'
import type { ApiResponse } from '../types/subscription'
import { CopyJsonButton } from './CopyJsonButton'
import { ValidationErrorsAlert } from './ValidationErrorsAlert'
import {
  extractApiErrorMeta,
  extractApiErrors,
  getApiErrorCode,
  getApiErrorTitle,
} from '../utils/apiErrors'

interface ApiLogPanelProps {
  title: string
  payload?: unknown
  response?: ApiResponse<unknown> | null
  gatewaySnapshot?: GatewayResponseSnapshot | null
  error?: unknown
}

function formatGatewaySnapshotForDisplay(snapshot: GatewayResponseSnapshot): string {
  const displayBody = snapshot.rawBody.trim()
    ? tryParseJson(snapshot.rawBody)
    : snapshot.body

  return JSON.stringify(
    {
      request: {
        method: snapshot.method,
        url: snapshot.url,
      },
      status: snapshot.status,
      statusText: snapshot.statusText,
      headers: snapshot.headers,
      body: displayBody,
      ...(snapshot.networkError ? { networkError: true } : {}),
      ...(snapshot.causeName ? { causeName: snapshot.causeName } : {}),
      ...(snapshot.diagnosticHint ? { diagnosticHint: snapshot.diagnosticHint } : {}),
    },
    null,
    2,
  )
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return raw
  }
}

function formatError(error: unknown, gatewaySnapshot?: GatewayResponseSnapshot | null): string {
  const snapshot = gatewaySnapshot ?? gatewaySnapshotFromError(error)
  if (snapshot) {
    return formatGatewaySnapshotForDisplay(snapshot)
  }

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

export function ApiLogPanel({
  title,
  payload,
  response,
  gatewaySnapshot = null,
  error,
}: ApiLogPanelProps) {
  const resolvedSnapshot = gatewaySnapshot ?? gatewaySnapshotFromError(error)
  const validationErrors = [
    ...extractApiErrors(error),
    ...(response?.success === false ? extractApiErrors(response) : []),
    ...(resolvedSnapshot?.body.success === false ? extractApiErrors(resolvedSnapshot.body) : []),
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
  const responseFailed =
    response?.success === false ||
    resolvedSnapshot?.networkError === true ||
    (resolvedSnapshot != null && resolvedSnapshot.status >= 400)
  const errorSource = error ?? response ?? resolvedSnapshot?.body
  const errorCode = getApiErrorCode(errorSource)
  const meta = extractApiErrorMeta(errorSource)

  const gatewayDisplay = resolvedSnapshot ? formatGatewaySnapshotForDisplay(resolvedSnapshot) : null
  const statusLabel =
    resolvedSnapshot != null
      ? resolvedSnapshot.networkError
        ? 'No response'
        : `${resolvedSnapshot.status} ${resolvedSnapshot.statusText}`.trim()
      : null

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
          <CodeIcon color="primary" />
          <Typography variant="h6">{title}</Typography>
        </Stack>

        {(uniqueErrors.length > 0 || errorCode || meta) && (
          <Box sx={{ mb: 2 }}>
            <ValidationErrorsAlert
              title={getApiErrorTitle(errorSource)}
              errors={uniqueErrors}
              errorCode={errorCode}
              meta={meta}
            />
          </Box>
        )}

        {payload !== undefined && (
          <Accordion defaultExpanded disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', width: '100%', pr: 1 }}>
                <Typography sx={{ fontWeight: 600, flex: 1 }}>Request payload</Typography>
                <CopyJsonButton value={payload} label="Copy request payload" />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Box component="pre" sx={codeBlockSx}>
                {JSON.stringify(payload, null, 2)}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {gatewayDisplay && (
          <Accordion
            defaultExpanded
            disableGutters
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%', pr: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flex: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>API gateway response</Typography>
                  {statusLabel && (
                    <Chip
                      label={statusLabel}
                      color={responseFailed ? 'error' : 'success'}
                      size="small"
                    />
                  )}
                </Stack>
                <CopyJsonButton value={gatewayDisplay} label="Copy gateway response" />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Exact HTTP response from the gateway (status, headers, and body as returned on the wire).
              </Typography>
              <Box component="pre" sx={codeBlockSx}>
                {gatewayDisplay}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {response && !resolvedSnapshot && (
          <Accordion
            defaultExpanded={responseFailed || uniqueErrors.length > 0}
            disableGutters
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%', pr: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flex: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>Response</Typography>
                  <Chip
                    label={responseFailed ? 'Failed' : 'Success'}
                    color={responseFailed ? 'error' : 'success'}
                    size="small"
                  />
                </Stack>
                <CopyJsonButton value={response} label="Copy response" />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Box component="pre" sx={codeBlockSx}>
                {JSON.stringify(response, null, 2)}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {error != null && !resolvedSnapshot && (
          <Accordion disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mt: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', width: '100%', pr: 1 }}>
                <Typography sx={{ fontWeight: 600, flex: 1 }}>Raw error response</Typography>
                <CopyJsonButton value={formatError(error, gatewaySnapshot)} label="Copy error response" />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Box component="pre" sx={{ ...codeBlockSx, bgcolor: '#450a0a', maxHeight: 360 }}>
                {formatError(error, gatewaySnapshot)}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}
      </CardContent>
    </Card>
  )
}
