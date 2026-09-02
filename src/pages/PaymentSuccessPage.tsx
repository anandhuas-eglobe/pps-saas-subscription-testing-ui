import { useCallback, useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import RefreshIcon from '@mui/icons-material/Refresh'
import VerifiedIcon from '@mui/icons-material/Verified'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import { getInvoiceById } from '../api/merchant'
import { ApiRequestError } from '../api/client'
import {
  checkCronDevToolsHealth,
  enqueueStripeWebhookProcessCronJob,
  PAYMENT_STRIPE_WEBHOOK_PROCESS_CRON_QUEUE,
} from '../api/cronDevTools'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { InvoiceDetailView } from '../components/invoices/InvoiceDetailView'
import { PageHeader } from '../components/layout/PageHeader'
import { useApiTransaction } from '../hooks/useApiTransaction'
import { InvoiceStatus, type InvoiceDetail } from '../types/subscription'
import { formatMoney, invoiceStatusColor } from '../utils/planDisplay'

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 2 * 60 * 1000
const REDIRECT_DELAY_MS = 1500
const ACTIVE_SUBSCRIPTION_PATH = '/merchant/subscription'

type PollPhase = 'missing-id' | 'polling' | 'completed' | 'failed' | 'timeout'

function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function isCompletedStatus(status: string): boolean {
  return status.toUpperCase() === InvoiceStatus.COMPLETED
}

function isFailedStatus(status: string): boolean {
  return status.toUpperCase() === InvoiceStatus.FAILED
}

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const invoiceId = searchParams.get('invoice_id')?.trim() ?? ''

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [phase, setPhase] = useState<PollPhase>(invoiceId ? 'polling' : 'missing-id')
  const [pollGeneration, setPollGeneration] = useState(0)
  const [pollStartedAt, setPollStartedAt] = useState<number | null>(null)
  const [remainingMs, setRemainingMs] = useState(POLL_TIMEOUT_MS)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [attemptCount, setAttemptCount] = useState(0)

  const [cronDevToolsAvailable, setCronDevToolsAvailable] = useState<boolean | null>(null)
  const [runningWebhookCron, setRunningWebhookCron] = useState(false)
  const [webhookCronMessage, setWebhookCronMessage] = useState<string | null>(null)
  const [webhookCronError, setWebhookCronError] = useState<string | null>(null)

  const { transaction, execute } = useApiTransaction()

  useEffect(() => {
    checkCronDevToolsHealth()
      .then((health) => setCronDevToolsAvailable(health.available))
      .catch(() => setCronDevToolsAvailable(false))
  }, [])

  useEffect(() => {
    if (!invoiceId) {
      setPhase('missing-id')
      return
    }

    let cancelled = false
    let timeoutId: number | null = null
    const startedAt = Date.now()

    setPhase('polling')
    setPollStartedAt(startedAt)
    setRemainingMs(POLL_TIMEOUT_MS)
    setFetchError(null)
    setAttemptCount(0)

    const poll = async () => {
      if (cancelled) {
        return
      }

      setAttemptCount((current) => current + 1)

      try {
        const detail = await execute(
          { invoiceId },
          () => getInvoiceById(invoiceId),
          `GET /api/v1/merchant/subscription/invoices/${invoiceId}`,
        )
        if (cancelled) {
          return
        }

        setInvoice(detail)
        setFetchError(null)

        if (isCompletedStatus(detail.status)) {
          setPhase('completed')
          return
        }

        if (isFailedStatus(detail.status)) {
          setPhase('failed')
          return
        }
      } catch (err) {
        if (cancelled) {
          return
        }

        const message =
          err instanceof ApiRequestError
            ? err.body.message ?? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to load invoice'
        setFetchError(message)
      }

      const elapsed = Date.now() - startedAt
      if (elapsed >= POLL_TIMEOUT_MS) {
        if (!cancelled) {
          setPhase('timeout')
        }
        return
      }

      timeoutId = window.setTimeout(() => {
        void poll()
      }, POLL_INTERVAL_MS)
    }

    void poll()

    return () => {
      cancelled = true
      if (timeoutId != null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [invoiceId, pollGeneration, execute])

  useEffect(() => {
    if (phase !== 'polling' || pollStartedAt == null) {
      return
    }

    const tick = () => {
      setRemainingMs(Math.max(0, POLL_TIMEOUT_MS - (Date.now() - pollStartedAt)))
    }

    tick()
    const intervalId = window.setInterval(tick, 250)
    return () => window.clearInterval(intervalId)
  }, [phase, pollStartedAt])

  useEffect(() => {
    if (phase !== 'completed') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      navigate(ACTIVE_SUBSCRIPTION_PATH, { replace: true })
    }, REDIRECT_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [phase, navigate])

  const handleRetryPolling = useCallback(() => {
    if (!invoiceId) {
      return
    }
    setPhase('polling')
    setPollGeneration((current) => current + 1)
  }, [invoiceId])

  const handleRunWebhookCron = async () => {
    setRunningWebhookCron(true)
    setWebhookCronError(null)
    setWebhookCronMessage(null)

    try {
      const result = await execute(
        {
          queue: PAYMENT_STRIPE_WEBHOOK_PROCESS_CRON_QUEUE,
          jobName: PAYMENT_STRIPE_WEBHOOK_PROCESS_CRON_QUEUE,
          data: {},
        },
        () => enqueueStripeWebhookProcessCronJob(),
        `POST /dev-tools/cron/enqueue (${PAYMENT_STRIPE_WEBHOOK_PROCESS_CRON_QUEUE})`,
      )
      setWebhookCronMessage(result.message)
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to enqueue Stripe webhook process cron job'
      setWebhookCronError(message)
    } finally {
      setRunningWebhookCron(false)
    }
  }

  const progressValue = useMemo(() => {
    return ((POLL_TIMEOUT_MS - remainingMs) / POLL_TIMEOUT_MS) * 100
  }, [remainingMs])

  const statusLabel = invoice?.status ?? (phase === 'polling' ? 'Checking…' : 'Unknown')

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Checkout"
        title="Payment success"
        description="Stripe redirected here after checkout. This page polls the invoice until it is COMPLETED (up to 2 minutes), then returns to the active subscription page. If the invoice is still pending, run the Stripe webhook process cron."
        apiEndpoint={`GET /api/v1/merchant/subscription/invoices/:id · POST /dev-tools/cron/enqueue (${PAYMENT_STRIPE_WEBHOOK_PROCESS_CRON_QUEUE})`}
        backTo={ACTIVE_SUBSCRIPTION_PATH}
        backLabel="Back to active subscription"
        actions={
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<VerifiedIcon />}
              component={RouterLink}
              to={ACTIVE_SUBSCRIPTION_PATH}
            >
              Active subscription
            </Button>
            {invoiceId && (
              <Button
                variant="outlined"
                startIcon={<ReceiptLongIcon />}
                component={RouterLink}
                to={`/merchant/invoices/${invoiceId}`}
              >
                View invoice
              </Button>
            )}
          </Stack>
        }
      />

      {phase === 'missing-id' && (
        <Alert severity="error">
          Missing <code>invoice_id</code> query parameter. Checkout success URLs should look like{' '}
          <code>/payment/success?invoice_id=…</code>.
        </Alert>
      )}

      {phase === 'completed' && (
        <Alert severity="success" icon={<CheckCircleIcon />}>
          Invoice {invoice?.invoiceNumber ?? invoiceId} is COMPLETED. Returning to the active
          subscription page…
        </Alert>
      )}

      {phase === 'failed' && (
        <Alert severity="error">
          Invoice {invoice?.invoiceNumber ?? invoiceId} is FAILED. Payment was not completed. Check
          the invoice or retry checkout from merchant plans.
        </Alert>
      )}

      {phase === 'timeout' && (
        <Alert severity="warning">
          Invoice {invoice?.invoiceNumber ?? invoiceId} did not reach COMPLETED within 2 minutes
          (last status: {invoice?.status ?? 'unknown'}). Run the Stripe webhook process cron, then
          retry polling.
        </Alert>
      )}

      {fetchError && phase === 'polling' && (
        <Alert severity="warning">
          Latest invoice fetch failed: {fetchError}. Polling continues until the 2-minute timeout.
        </Alert>
      )}

      {fetchError && phase !== 'polling' && phase !== 'missing-id' && (
        <Alert severity="error">{fetchError}</Alert>
      )}

      {invoiceId && (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  {phase === 'polling' ? (
                    <CircularProgress size={22} />
                  ) : phase === 'completed' ? (
                    <CheckCircleIcon color="success" />
                  ) : null}
                  <Typography variant="h6">
                    {phase === 'polling'
                      ? 'Waiting for invoice COMPLETED'
                      : phase === 'completed'
                        ? 'Payment confirmed'
                        : phase === 'failed'
                          ? 'Payment failed'
                          : 'Polling stopped'}
                  </Typography>
                  <Chip
                    label={statusLabel}
                    color={invoice ? invoiceStatusColor(invoice.status) : 'default'}
                    size="small"
                  />
                </Stack>
                {invoice && (
                  <Typography variant="body2" color="text.secondary">
                    {invoice.invoiceNumber} · {formatMoney(invoice.currency, invoice.grandTotal)}
                  </Typography>
                )}
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                invoice_id={invoiceId}
              </Typography>

              {phase === 'polling' && (
                <Box>
                  <LinearProgress variant="determinate" value={progressValue} sx={{ mb: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    Attempt {attemptCount} · {formatCountdown(remainingMs)} remaining of 2:00 ·
                    polling every {POLL_INTERVAL_MS / 1000}s
                  </Typography>
                </Box>
              )}

              {(phase === 'timeout' || phase === 'failed') && (
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRetryPolling}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Retry polling
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Run Stripe webhook process cron</Typography>
            <Typography variant="body2" color="text.secondary">
              Enqueues a one-off BullMQ job on{' '}
              <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {PAYMENT_STRIPE_WEBHOOK_PROCESS_CRON_QUEUE}
              </Box>
              . Same action as <strong>Crons → Stripe webhook process</strong> in the header. Use this
              after Stripe checkout so RECEIVED webhook events are processed and the invoice can
              become COMPLETED.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={
                  runningWebhookCron ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <PlayArrowIcon />
                  )
                }
                disabled={runningWebhookCron || cronDevToolsAvailable === false}
                onClick={() => void handleRunWebhookCron()}
              >
                {runningWebhookCron ? 'Enqueueing…' : 'Run webhook process cron'}
              </Button>
              {cronDevToolsAvailable === false && (
                <Typography variant="caption" color="text.secondary">
                  Available when running npm run dev with the cron dev middleware.
                </Typography>
              )}
            </Stack>
            {webhookCronMessage && <Alert severity="success">{webhookCronMessage}</Alert>}
            {webhookCronError && <Alert severity="error">{webhookCronError}</Alert>}
          </Stack>
        </CardContent>
      </Card>

      {invoice && <InvoiceDetailView invoice={invoice} />}

      <ApiTransactionInspector
        livePayload={invoiceId ? { invoiceId } : undefined}
        livePayloadTitle="Invoice poll payload"
        transaction={transaction}
        logTitle="Last invoice / cron interaction"
      />
    </Stack>
  )
}
