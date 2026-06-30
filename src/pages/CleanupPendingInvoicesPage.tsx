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
import CleaningServicesIcon from '@mui/icons-material/CleaningServices'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import RefreshIcon from '@mui/icons-material/Refresh'
import SendIcon from '@mui/icons-material/Send'
import TerminalIcon from '@mui/icons-material/Terminal'
import { listInvoices } from '../api/merchant'
import { ApiRequestError } from '../api/client'
import { checkRedisDevToolsHealth, publishEventToRedisStream } from '../api/redisDevTools'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { PageHeader } from '../components/layout/PageHeader'
import { InvoicePickerSelect } from '../components/payment/InvoicePickerSelect'
import { useApiTransaction } from '../hooks/useApiTransaction'
import { InvoiceStatus, type InvoiceListItem } from '../types/subscription'
import {
  loadLastPaymentHandoff,
} from '../utils/paymentEventBuilder'
import {
  CLEANUP_PENDING_INVOICES_REQUESTED_STREAM,
  applyInvoiceToCleanupForm,
  buildCleanupPendingInvoiceDockerRedisXAddCommand,
  buildCleanupPendingInvoiceRedisStreamPayloadJson,
  buildCleanupPendingInvoicesRequestedEvent,
  createDefaultCleanupPendingInvoicePublishForm,
  type CleanupPendingInvoicePublishFormValues,
  type CleanupPendingInvoicesRequestedEvent,
} from '../utils/cleanupPendingInvoiceEventBuilder'

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

function updateFormField<K extends keyof CleanupPendingInvoicePublishFormValues>(
  form: CleanupPendingInvoicePublishFormValues,
  key: K,
  value: CleanupPendingInvoicePublishFormValues[K],
): CleanupPendingInvoicePublishFormValues {
  return { ...form, [key]: value }
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function CleanupPendingInvoicesPage() {
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState(createDefaultCleanupPendingInvoicePublishForm)
  const [rawJson, setRawJson] = useState('')
  const [rawJsonError, setRawJsonError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const { transaction, execute, clear } = useApiTransaction()
  const [devToolsAvailable, setDevToolsAvailable] = useState<boolean | null>(null)
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [invoicesError, setInvoicesError] = useState<string | null>(null)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  })

  const builtEvent = useMemo(() => buildCleanupPendingInvoicesRequestedEvent(form), [form])

  const activeEvent = useMemo((): CleanupPendingInvoicesRequestedEvent | null => {
    if (tab === 0) {
      return builtEvent
    }

    const source = rawJson.trim() || JSON.stringify(builtEvent)
    try {
      return JSON.parse(source) as CleanupPendingInvoicesRequestedEvent
    } catch {
      return null
    }
  }, [tab, builtEvent, rawJson])

  const dockerCommand = useMemo(() => {
    if (!activeEvent) return ''
    return buildCleanupPendingInvoiceDockerRedisXAddCommand(activeEvent, {
      containerName: form.redisContainer,
      password: form.redisPassword,
    })
  }, [activeEvent, form.redisContainer, form.redisPassword])

  const payloadJson = useMemo(
    () => (activeEvent ? buildCleanupPendingInvoiceRedisStreamPayloadJson(activeEvent) : ''),
    [activeEvent],
  )

  useEffect(() => {
    checkRedisDevToolsHealth()
      .then((health) => setDevToolsAvailable(health.available))
      .catch(() => setDevToolsAvailable(false))
  }, [])

  const loadInvoices = async () => {
    setLoadingInvoices(true)
    setInvoicesError(null)
    try {
      const result = await listInvoices({
        page: 1,
        limit: 50,
        status: InvoiceStatus.PENDING,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      setInvoices(result.invoices)
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.body.message ?? error.message
          : error instanceof Error
            ? error.message
            : 'Failed to load invoices'
      setInvoicesError(message)
      setInvoices([])
    } finally {
      setLoadingInvoices(false)
    }
  }

  useEffect(() => {
    void loadInvoices()
  }, [])

  const handleInvoiceSelect = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)

    if (!invoiceId) {
      return
    }

    const invoice = invoices.find((item) => item.id === invoiceId)
    if (!invoice) {
      return
    }

    setForm((current) => applyInvoiceToCleanupForm(current, invoice))
    setSnackbar({ open: true, message: `Loaded PENDING invoice ${invoice.invoiceNumber}` })
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
            stream: CLEANUP_PENDING_INVOICES_REQUESTED_STREAM,
            redis: {
              host: form.redisHost,
              port: form.redisPort,
              password: form.redisPassword,
              db: 0,
            },
          }),
        `POST /dev-tools/redis/publish (${CLEANUP_PENDING_INVOICES_REQUESTED_STREAM})`,
      )
      setSnackbar({ open: true, message: result.message })
      if (tab === 0) {
        setForm((current) => ({ ...current, eventId: crypto.randomUUID() }))
      }
      void loadInvoices()
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to publish to Redis stream',
      })
    } finally {
      setPublishing(false)
    }
  }

  const handleLoadLastCheckout = () => {
    const handoff = loadLastPaymentHandoff()
    if (!handoff) {
      setSnackbar({
        open: true,
        message: 'No checkout invoice found. Complete a plan, add-on, or attribute purchase first.',
      })
      return
    }

    setForm((current) =>
      applyInvoiceToCleanupForm(current, {
        id: handoff.invoiceId,
        invoiceNumber: handoff.invoiceNumber,
      }),
    )
    setSelectedInvoiceId(handoff.invoiceId)
    setSnackbar({ open: true, message: `Loaded invoice ${handoff.invoiceNumber}` })
  }

  const handleReset = () => {
    setForm(createDefaultCleanupPendingInvoicePublishForm())
    setSelectedInvoiceId('')
    setRawJson('')
    setRawJsonError(null)
    clear()
  }

  const handleNewEventId = () => {
    setForm((current) => ({ ...current, eventId: crypto.randomUUID() }))
    setSnackbar({ open: true, message: 'Generated a new event ID.' })
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Dev tools"
        title="Cleanup Pending Invoices (Redis Stream)"
        description="Publish CleanupPendingInvoicesRequested to payment.pending.invoice.cleanup.requested. The subscription CleanupPendingInvoicesConsumer deletes PENDING invoices and may release the merchant cart from PROCESSING."
        apiEndpoint={`Redis stream ${CLEANUP_PENDING_INVOICES_REQUESTED_STREAM}`}
        actions={
          <>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleReset}>
              Reset
            </Button>
            <Button variant="outlined" onClick={handleLoadLastCheckout}>
              Load last checkout
            </Button>
            <Button variant="outlined" onClick={handleNewEventId}>
              New event ID
            </Button>
          </>
        }
      />

      <Alert severity="info" icon={<CleaningServicesIcon />}>
        Use <strong>Publish to Redis</strong> while running <code>npm run dev</code>. The consumer
        requires <code>metadata.context.source = payment-service</code> and{' '}
        <code>entityType = invoice</code>. Only invoices in <strong>PENDING</strong> status are
        eligible for cleanup.
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
                <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
                  Event
                </Typography>
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
                      label="Event type"
                      value="CleanupPendingInvoicesRequested"
                      disabled
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
                  Invoice (PENDING only)
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <InvoicePickerSelect
                    invoices={invoices}
                    loading={loadingInvoices}
                    error={invoicesError}
                    selectedInvoiceId={selectedInvoiceId}
                    onSelect={handleInvoiceSelect}
                    onRefresh={() => void loadInvoices()}
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Invoice ID"
                      value={form.invoiceId}
                      onChange={(event) => {
                        setSelectedInvoiceId('')
                        setForm((current) =>
                          updateFormField(current, 'invoiceId', event.target.value),
                        )
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Invoice number"
                      value={form.invoiceNumber}
                      onChange={(event) =>
                        setForm((current) =>
                          updateFormField(current, 'invoiceNumber', event.target.value),
                        )
                      }
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
                  Metadata
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
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
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Entity ID"
                      value={form.entityId}
                      onChange={(event) =>
                        setForm((current) => updateFormField(current, 'entityId', event.target.value))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Entity name"
                      value={form.entityName}
                      onChange={(event) =>
                        setForm((current) => updateFormField(current, 'entityName', event.target.value))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Source (fixed)"
                      value="payment-service"
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Entity type (fixed)"
                      value="invoice"
                      disabled
                    />
                  </Grid>
                </Grid>
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
            <Chip label={CLEANUP_PENDING_INVOICES_REQUESTED_STREAM} size="small" variant="outlined" />
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
