import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import PaymentIcon from '@mui/icons-material/Payment'
import RefreshIcon from '@mui/icons-material/Refresh'
import SendIcon from '@mui/icons-material/Send'
import TerminalIcon from '@mui/icons-material/Terminal'
import CircularProgress from '@mui/material/CircularProgress'
import { checkRedisDevToolsHealth, publishToRedisStream } from '../api/redisDevTools'
import { listInvoices } from '../api/merchant'
import { ApiRequestError } from '../api/client'
import { ApiLogPanel } from '../components/ApiLogPanel'
import { PageHeader } from '../components/layout/PageHeader'
import { InvoicePickerSelect } from '../components/payment/InvoicePickerSelect'
import type { InvoiceListItem } from '../types/subscription'
import {
  applyInvoiceToPaymentForm,
  applyPaymentHandoffToForm,
  buildDockerRedisXAddCommand,
  buildPaymentInvoiceStatusEvent,
  buildRedisStreamPayloadJson,
  createDefaultPaymentConfirmationForm,
  defaultNewStatusForAction,
  loadLastPaymentHandoff,
  type InvoiceStatusValue,
  type PaymentConfirmationFormValues,
  type PaymentInvoiceStatusEvent,
} from '../utils/paymentEventBuilder'

const INVOICE_STATUS_OPTIONS: InvoiceStatusValue[] = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'REASSIGNED',
]

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

function updateFormField<K extends keyof PaymentConfirmationFormValues>(
  form: PaymentConfirmationFormValues,
  key: K,
  value: PaymentConfirmationFormValues[K],
): PaymentConfirmationFormValues {
  return { ...form, [key]: value }
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function PaymentConfirmationPage() {
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState(createDefaultPaymentConfirmationForm)
  const [rawJson, setRawJson] = useState('')
  const [rawJsonError, setRawJsonError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState<unknown>(null)
  const [publishError, setPublishError] = useState<unknown>(null)
  const [devToolsAvailable, setDevToolsAvailable] = useState<boolean | null>(null)
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [invoicesError, setInvoicesError] = useState<string | null>(null)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  })

  const builtEvent = useMemo(() => buildPaymentInvoiceStatusEvent(form), [form])

  const activeEvent = useMemo((): PaymentInvoiceStatusEvent | null => {
    if (tab === 0) {
      return builtEvent
    }

    const source = rawJson.trim() || JSON.stringify(builtEvent)
    try {
      return JSON.parse(source) as PaymentInvoiceStatusEvent
    } catch {
      return null
    }
  }, [tab, builtEvent, rawJson])

  const dockerCommand = useMemo(() => {
    if (!activeEvent) return ''
    return buildDockerRedisXAddCommand(activeEvent, {
      containerName: form.redisContainer,
      password: form.redisPassword,
    })
  }, [activeEvent, form.redisContainer, form.redisPassword])

  const payloadJson = useMemo(
    () => (activeEvent ? buildRedisStreamPayloadJson(activeEvent) : ''),
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

    setForm((current) => applyInvoiceToPaymentForm(current, invoice))
    setSnackbar({ open: true, message: `Loaded invoice ${invoice.invoiceNumber}` })
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
    setPublishError(null)
    setPublishResult(null)

    try {
      const result = await publishToRedisStream(activeEvent, {
        redis: {
          host: form.redisHost,
          port: form.redisPort,
          password: form.redisPassword,
          db: 0,
        },
      })
      setPublishResult(result)
      setSnackbar({ open: true, message: result.message })
      if (tab === 0) {
        setForm((current) => ({ ...current, eventId: crypto.randomUUID() }))
      }
    } catch (error) {
      setPublishError(error)
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
    setForm((current) => {
      const next = applyPaymentHandoffToForm(current, handoff)
      return next
    })
    setSelectedInvoiceId(handoff.invoiceId)
    setSnackbar({ open: true, message: `Loaded invoice ${handoff.invoiceNumber}` })
  }

  const handleReset = () => {
    setForm(createDefaultPaymentConfirmationForm())
    setSelectedInvoiceId('')
    setRawJson('')
    setRawJsonError(null)
    setPublishResult(null)
    setPublishError(null)
  }

  const handleNewEventId = () => {
    setForm((current) => ({ ...current, eventId: crypto.randomUUID() }))
    setSnackbar({ open: true, message: 'Generated a new event ID.' })
  }

  const handleActionChange = (action: PaymentConfirmationFormValues['action']) => {
    setForm((current) => ({
      ...current,
      action,
      newStatus: defaultNewStatusForAction(action),
    }))
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Dev tools"
        title="Confirm Payment (Redis Stream)"
        description="Build the payment.invoice.status.updated payload, publish it directly to Redis from the Vite dev server, or copy the docker exec command as a fallback. No subscription service API is involved."
        apiEndpoint="Vite dev: POST /dev-tools/redis/publish"
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

      <Alert severity="info" icon={<PaymentIcon />}>
        Use <strong>Publish to Redis</strong> while running <code>npm run dev</code> — the Vite dev server
        connects to Redis on your machine (default <code>localhost:6790</code>). The subscription service
        must have <code>MESSAGING_PROVIDER=redis</code> to consume the event. Payload shape matches{' '}
        <code>PaymentInvoiceStatusUpdated</code> v1.0: include <code>payload.payment</code> for
        succeeded/processing actions and <code>payload.failure</code> for failed payments.
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
                  <Grid size={{ xs: 12, md: 4 }}>
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
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Action</InputLabel>
                      <Select
                        label="Action"
                        value={form.action}
                        onChange={(event) =>
                          handleActionChange(
                            event.target.value as PaymentConfirmationFormValues['action'],
                          )
                        }
                      >
                        <MenuItem value="PAYMENT_SUCCEEDED">PAYMENT_SUCCEEDED</MenuItem>
                        <MenuItem value="PAYMENT_PROCESSING">PAYMENT_PROCESSING</MenuItem>
                        <MenuItem value="PAYMENT_FAILED">PAYMENT_FAILED</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>New invoice status</InputLabel>
                      <Select
                        label="New invoice status"
                        value={form.newStatus}
                        onChange={(event) =>
                          setForm((current) =>
                            updateFormField(
                              current,
                              'newStatus',
                              event.target.value as InvoiceStatusValue,
                            ),
                          )
                        }
                      >
                        {INVOICE_STATUS_OPTIONS.map((status) => (
                          <MenuItem key={status} value={status}>
                            {status}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
                  Invoice
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
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Merchant ID"
                      value={form.merchantId}
                      onChange={(event) =>
                        setForm((current) => updateFormField(current, 'merchantId', event.target.value))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Currency"
                      value={form.currency}
                      onChange={(event) =>
                        setForm((current) => updateFormField(current, 'currency', event.target.value))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Grand total"
                      type="number"
                      value={form.grandTotal}
                      onChange={(event) =>
                        setForm((current) =>
                          updateFormField(current, 'grandTotal', Number(event.target.value)),
                        )
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Checkout correlation ID"
                      value={form.checkoutCorrelationId}
                      onChange={(event) =>
                        setForm((current) =>
                          updateFormField(current, 'checkoutCorrelationId', event.target.value),
                        )
                      }
                    />
                  </Grid>
                </Grid>
              </Box>

              {(form.action === 'PAYMENT_SUCCEEDED' || form.action === 'PAYMENT_PROCESSING') && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
                      Payment receipt
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Transaction ID"
                          value={form.transactionId}
                          onChange={(event) =>
                            setForm((current) =>
                              updateFormField(current, 'transactionId', event.target.value),
                            )
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Payment reference"
                          value={form.paymentReference}
                          onChange={(event) =>
                            setForm((current) =>
                              updateFormField(current, 'paymentReference', event.target.value),
                            )
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Payment gateway"
                          value={form.paymentGateway}
                          onChange={(event) =>
                            setForm((current) =>
                              updateFormField(current, 'paymentGateway', event.target.value),
                            )
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Payment method</InputLabel>
                          <Select
                            label="Payment method"
                            value={form.paymentMethod}
                            onChange={(event) =>
                              setForm((current) =>
                                updateFormField(current, 'paymentMethod', event.target.value),
                              )
                            }
                          >
                            <MenuItem value="CREDIT_CARD">CREDIT_CARD</MenuItem>
                            <MenuItem value="DEBIT_CARD">DEBIT_CARD</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Card last 4"
                          value={form.cardLast4Digit}
                          onChange={(event) =>
                            setForm((current) =>
                              updateFormField(current, 'cardLast4Digit', event.target.value),
                            )
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Paid at (ISO 8601)"
                          value={form.paidAt}
                          onChange={(event) =>
                            setForm((current) => updateFormField(current, 'paidAt', event.target.value))
                          }
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </>
              )}

              {form.action === 'PAYMENT_FAILED' && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
                      Payment failure
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Failure code"
                          value={form.failureCode}
                          onChange={(event) =>
                            setForm((current) =>
                              updateFormField(current, 'failureCode', event.target.value),
                            )
                          }
                          helperText="Sent as payload.failure.failureCode (nullable)"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 8 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Failure reason"
                          value={form.failureReason}
                          onChange={(event) =>
                            setForm((current) =>
                              updateFormField(current, 'failureReason', event.target.value),
                            )
                          }
                          helperText="Sent as payload.failure.failureReason (nullable)"
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Failed at (ISO 8601)"
                          value={form.failedAt}
                          onChange={(event) =>
                            setForm((current) => updateFormField(current, 'failedAt', event.target.value))
                          }
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </>
              )}

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
                  Metadata
                </Typography>
                <Grid container spacing={2}>
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
                      label="Entity ID"
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
                      label="Metadata source"
                      value={form.metadataSource}
                      onChange={(event) =>
                        setForm((current) =>
                          updateFormField(current, 'metadataSource', event.target.value),
                        )
                      }
                      helperText="Must be payment-service for the subscription consumer"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Metadata entity type"
                      value={form.metadataEntityType}
                      onChange={(event) =>
                        setForm((current) =>
                          updateFormField(current, 'metadataEntityType', event.target.value),
                        )
                      }
                      helperText="Must be invoice for the subscription consumer"
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
            <Chip label="payment.invoice.status.updated" size="small" variant="outlined" />
            <Chip label="PaymentInvoiceStatusUpdated v1.0" size="small" variant="outlined" />
          </Stack>

          {!activeEvent ? (
            <Alert severity="error">Invalid JSON payload. Fix errors before publishing.</Alert>
          ) : (
            <>
              <Box component="pre" sx={{ ...codeBlockSx, maxHeight: 280, mb: 2 }}>
                {payloadJson}
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                size="large"
                startIcon={
                  publishing ? <CircularProgress size={18} color="inherit" /> : <SendIcon />
                }
                disabled={publishing || devToolsAvailable === false}
                onClick={handlePublish}
              >
                Publish to Redis
              </Button>
              <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopyPayload}>
                Copy payload JSON
              </Button>
            </Stack>
            </>
          )}
        </CardContent>
      </Card>

      <ApiLogPanel
        title="Publish result"
        payload={activeEvent ?? undefined}
        response={
          publishResult
            ? {
                success: true,
                data: publishResult,
                timestamp: new Date().toISOString(),
              }
            : null
        }
        error={publishError}
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
                  onClick={handleCopyCommand}
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
