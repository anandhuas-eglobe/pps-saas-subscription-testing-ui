import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import LocalMallIcon from '@mui/icons-material/LocalMall'
import RefreshIcon from '@mui/icons-material/Refresh'
import SendIcon from '@mui/icons-material/Send'
import TerminalIcon from '@mui/icons-material/Terminal'
import VerifiedIcon from '@mui/icons-material/Verified'
import { getActiveSubscription, listInvoices } from '../api/merchant'
import { ApiRequestError } from '../api/client'
import { checkRedisDevToolsHealth, publishEventToRedisStream } from '../api/redisDevTools'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { PageHeader } from '../components/layout/PageHeader'
import { useApiTransaction } from '../hooks/useApiTransaction'
import {
  RESELLER_OVERAGE_REQUESTED_STREAM,
  buildResellerOverageDockerRedisXAddCommand,
  buildResellerOverageRedisStreamPayloadJson,
  buildResellerOverageRequestedEvent,
  createDefaultResellerOveragePublishForm,
  type ResellerOveragePublishFormValues,
  type ResellerOverageRequestedEvent,
} from '../utils/resellerOverageEventBuilder'

const codeBlockSx = {
  m: 0,
  p: 2,
  borderRadius: 2,
  bgcolor: '#0f172a',
  color: '#e2e8f0',
  fontSize: '0.8rem',
  lineHeight: 1.5,
  overflow: 'auto',
  maxHeight: 420,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
}

function updateFormField<K extends keyof ResellerOveragePublishFormValues>(
  form: ResellerOveragePublishFormValues,
  key: K,
  value: ResellerOveragePublishFormValues[K],
): ResellerOveragePublishFormValues {
  return { ...form, [key]: value }
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function ResellerOveragePublishPage() {
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState(createDefaultResellerOveragePublishForm)
  const [rawJson, setRawJson] = useState('')
  const [rawJsonError, setRawJsonError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const { transaction, execute, clear } = useApiTransaction()
  const [devToolsAvailable, setDevToolsAvailable] = useState<boolean | null>(null)
  const [loadingMerchant, setLoadingMerchant] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  })

  const builtEvent = useMemo(() => buildResellerOverageRequestedEvent(form), [form])

  const activeEvent = useMemo((): ResellerOverageRequestedEvent | null => {
    if (tab === 0) {
      return builtEvent
    }

    const source = rawJson.trim() || JSON.stringify(builtEvent)
    try {
      return JSON.parse(source) as ResellerOverageRequestedEvent
    } catch {
      return null
    }
  }, [tab, builtEvent, rawJson])

  const dockerCommand = useMemo(() => {
    if (!activeEvent) return ''
    return buildResellerOverageDockerRedisXAddCommand(activeEvent, {
      containerName: form.redisContainer,
      password: form.redisPassword,
    })
  }, [activeEvent, form.redisContainer, form.redisPassword])

  const payloadJson = useMemo(
    () => (activeEvent ? buildResellerOverageRedisStreamPayloadJson(activeEvent) : ''),
    [activeEvent],
  )

  useEffect(() => {
    checkRedisDevToolsHealth()
      .then((health) => setDevToolsAvailable(health.available))
      .catch(() => setDevToolsAvailable(false))
  }, [])

  const handleLoadTestMerchant = async () => {
    setLoadingMerchant(true)

    try {
      const subscription = await getActiveSubscription().catch(() => null)
      if (subscription) {
        const invoiceResult = await listInvoices({ page: 1, limit: 1 })
        const merchantId = invoiceResult.invoices[0]?.merchantId
        if (merchantId) {
          setForm((current) => updateFormField(current, 'merchantId', merchantId))
          setSnackbar({ open: true, message: `Loaded merchant ID ${merchantId} from invoices.` })
          return
        }
      }

      setSnackbar({
        open: true,
        message: 'Using default test merchant ID. Ensure it matches your JWT merchant context.',
      })
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.body.message ?? error.message
          : error instanceof Error
            ? error.message
            : 'Failed to load merchant context'
      setSnackbar({ open: true, message })
    } finally {
      setLoadingMerchant(false)
    }
  }

  const syncRawJsonFromForm = () => {
    setRawJson(JSON.stringify(builtEvent, null, 2))
    setRawJsonError(null)
  }

  const handleCopyCommand = async () => {
    if (!dockerCommand) {
      setSnackbar({ open: true, message: 'Fix JSON errors before copying the command.' })
      return
    }
    await copyText(dockerCommand)
    setSnackbar({ open: true, message: 'Docker command copied to clipboard.' })
  }

  const handleCopyPayload = async () => {
    if (!payloadJson) {
      setSnackbar({ open: true, message: 'Fix JSON errors before copying the payload.' })
      return
    }
    await copyText(payloadJson)
    setSnackbar({ open: true, message: 'Stream payload copied to clipboard.' })
  }

  const handlePublish = async () => {
    if (!activeEvent) {
      setSnackbar({ open: true, message: 'Fix JSON errors before publishing.' })
      return
    }

    setPublishing(true)

    try {
      const result = await execute(
        activeEvent,
        () =>
          publishEventToRedisStream(activeEvent, {
            stream: RESELLER_OVERAGE_REQUESTED_STREAM,
            redis: {
              host: form.redisHost,
              port: form.redisPort,
              password: form.redisPassword,
              db: 0,
            },
          }),
        `POST /dev-tools/redis/publish (${RESELLER_OVERAGE_REQUESTED_STREAM})`,
      )
      setSnackbar({ open: true, message: result.message })
      if (tab === 0) {
        setForm((current) => ({ ...current, eventId: crypto.randomUUID() }))
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to publish to Redis stream',
      })
    } finally {
      setPublishing(false)
    }
  }

  const handleReset = () => {
    setForm(createDefaultResellerOveragePublishForm())
    setRawJson('')
    setRawJsonError(null)
    clear()
  }

  const handleNewEventId = () => {
    setForm((current) => ({ ...current, eventId: crypto.randomUUID() }))
    setSnackbar({ open: true, message: 'Generated a new event ID.' })
  }

  const handleNewOrderId = () => {
    const orderId = crypto.randomUUID()
    setForm((current) => ({
      ...current,
      entityId: orderId,
      entityName: `ORDER-${orderId.slice(0, 8).toUpperCase()}`,
    }))
    setSnackbar({ open: true, message: 'Generated a new order entity ID.' })
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Dev tools"
        title="Reseller Overage (Redis Stream)"
        description="Publish a ResellerOverageRequested event to order.reseller.overage.requested so the subscription service consumer can record overage history and create a reseller overage invoice."
        apiEndpoint="Vite dev: POST /dev-tools/redis/publish"
        actions={
          <>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleReset}>
              Reset
            </Button>
            <Button variant="outlined" onClick={handleNewEventId}>
              New event ID
            </Button>
            <Button variant="outlined" onClick={handleNewOrderId}>
              New order ID
            </Button>
          </>
        }
      />

      <Alert severity="info" icon={<LocalMallIcon />}>
        The consumer expects <code>metadata.context.source = order-service</code> and{' '}
        <code>metadata.context.entityType = order</code>. Use <strong>Publish to Redis</strong> while
        running <code>npm run dev</code>. The subscription service must use{' '}
        <code>MESSAGING_PROVIDER=redis</code>.
      </Alert>

      {devToolsAvailable === false && (
        <Alert severity="warning">
          One-click publish is unavailable on this server. Run <code>npm run dev</code> and open{' '}
          <code>http://localhost:5173</code>, or use the docker command below.
        </Alert>
      )}

      <Card>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Form" />
          <Tab label="Raw JSON" />
        </Tabs>

        <CardContent>
          {tab === 0 ? (
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
                  Redis connection
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Redis host"
                      value={form.redisHost}
                      onChange={(event) =>
                        setForm((current) =>
                          updateFormField(current, 'redisHost', event.target.value),
                        )
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Redis port"
                      type="number"
                      value={form.redisPort}
                      onChange={(event) =>
                        setForm((current) =>
                          updateFormField(current, 'redisPort', Number(event.target.value)),
                        )
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Docker container"
                      value={form.redisContainer}
                      onChange={(event) =>
                        setForm((current) =>
                          updateFormField(current, 'redisContainer', event.target.value),
                        )
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Redis password"
                      value={form.redisPassword}
                      onChange={(event) =>
                        setForm((current) =>
                          updateFormField(current, 'redisPassword', event.target.value),
                        )
                      }
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              <Box>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ mb: 1.5, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Reseller overage event
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={
                      loadingMerchant ? <CircularProgress size={14} /> : <VerifiedIcon />
                    }
                    disabled={loadingMerchant}
                    onClick={() => void handleLoadTestMerchant()}
                  >
                    Load test merchant
                  </Button>
                </Stack>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Event ID"
                      value={form.eventId}
                      onChange={(event) =>
                        setForm((current) => updateFormField(current, 'eventId', event.target.value))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Correlation ID"
                      value={form.correlationId}
                      onChange={(event) =>
                        setForm((current) =>
                          updateFormField(current, 'correlationId', event.target.value),
                        )
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Merchant ID"
                      value={form.merchantId}
                      onChange={(event) =>
                        setForm((current) =>
                          updateFormField(current, 'merchantId', event.target.value),
                        )
                      }
                      helperText="Merchant that will be charged for reseller overage"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Overage amount"
                      type="number"
                      value={form.overageAmount}
                      onChange={(event) =>
                        setForm((current) =>
                          updateFormField(current, 'overageAmount', Number(event.target.value)),
                        )
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Order entity ID"
                      value={form.entityId}
                      onChange={(event) =>
                        setForm((current) => updateFormField(current, 'entityId', event.target.value))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Order entity name"
                      value={form.entityName}
                      onChange={(event) =>
                        setForm((current) =>
                          updateFormField(current, 'entityName', event.target.value),
                        )
                      }
                    />
                  </Grid>
                </Grid>

                <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
                  <Chip label="ResellerOverageRequested" size="small" />
                  <Chip label="eventVersion 1.0" size="small" variant="outlined" />
                  <Chip label="source: order-service" size="small" variant="outlined" />
                  <Chip label="entityType: order" size="small" variant="outlined" />
                </Stack>
              </Box>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={syncRawJsonFromForm}>
                  Load from form defaults
                </Button>
              </Stack>
              <TextField
                fullWidth
                multiline
                minRows={18}
                value={rawJson || JSON.stringify(builtEvent, null, 2)}
                onChange={(event) => {
                  setRawJson(event.target.value)
                  try {
                    JSON.parse(event.target.value.trim() || JSON.stringify(builtEvent))
                    setRawJsonError(null)
                  } catch (parseError) {
                    setRawJsonError(
                      parseError instanceof Error ? parseError.message : 'Invalid JSON',
                    )
                  }
                }}
                slotProps={{
                  input: {
                    sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
                  },
                }}
              />
              {rawJsonError && <Alert severity="error">{rawJsonError}</Alert>}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
            <SendIcon color="primary" />
            <Typography variant="h6">Publish</Typography>
            <Chip label={RESELLER_OVERAGE_REQUESTED_STREAM} size="small" variant="outlined" />
          </Stack>

          {!activeEvent ? (
            <Alert severity="error">Invalid JSON payload. Fix errors before publishing.</Alert>
          ) : (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                size="large"
                startIcon={
                  publishing ? <CircularProgress size={18} color="inherit" /> : <SendIcon />
                }
                disabled={publishing || devToolsAvailable === false}
                onClick={() => void handlePublish()}
              >
                Publish to Redis
              </Button>
              <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => void handleCopyPayload()}>
                Copy payload JSON
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>

      <ApiTransactionInspector
        livePayload={activeEvent ?? undefined}
        livePayloadTitle="Redis stream event preview"
        transaction={transaction}
        logTitle="Publish result"
      />

      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
            <TerminalIcon color="primary" />
            <Typography variant="h6">Terminal fallback</Typography>
            <Chip label="docker exec" size="small" variant="outlined" />
          </Stack>

          {!activeEvent ? (
            <Alert severity="error">Invalid JSON payload. Fix errors before copying the command.</Alert>
          ) : (
            <>
              <Box component="pre" sx={codeBlockSx}>
                {dockerCommand}
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => void handleCopyCommand()}
                >
                  Copy docker command
                </Button>
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        message={snackbar.message}
      />
    </Stack>
  )
}
