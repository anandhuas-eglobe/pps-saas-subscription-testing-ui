import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ApiTransactionRecord } from '../hooks/useApiTransaction'
import { ApiLogPanel } from './ApiLogPanel'
import { ApiPayloadPreview } from './ApiPayloadPreview'

interface ApiTransactionInspectorProps {
  livePayload?: unknown
  livePayloadTitle?: string
  transaction?: ApiTransactionRecord | null
  logTitle?: string
  showLivePreview?: boolean
  showLogPanel?: boolean
}

export function ApiTransactionInspector({
  livePayload,
  livePayloadTitle = 'Payload preview',
  transaction,
  logTitle = 'Last API interaction',
  showLivePreview = livePayload !== undefined,
  showLogPanel = true,
}: ApiTransactionInspectorProps) {
  const hasLog =
    transaction != null &&
    (transaction.lastPayload !== undefined ||
      transaction.lastResponse != null ||
      transaction.lastError != null)

  if (!showLivePreview && (!showLogPanel || !hasLog)) {
    return null
  }

  return (
    <Stack spacing={2}>
      {showLivePreview && livePayload !== undefined && (
        <ApiPayloadPreview title={livePayloadTitle} payload={livePayload} />
      )}

      {showLogPanel && hasLog && (
        <Stack spacing={0.5}>
          {transaction?.endpoint && (
            <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
              Endpoint: {transaction.endpoint}
            </Typography>
          )}
          <ApiLogPanel
            title={logTitle}
            payload={transaction?.lastPayload}
            response={transaction?.lastResponse ?? null}
            error={transaction?.lastError}
          />
        </Stack>
      )}
    </Stack>
  )
}
