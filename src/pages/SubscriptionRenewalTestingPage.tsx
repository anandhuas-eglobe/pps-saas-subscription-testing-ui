import { useCallback, useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import PaymentIcon from '@mui/icons-material/Payment'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RefreshIcon from '@mui/icons-material/Refresh'
import ScheduleIcon from '@mui/icons-material/Schedule'
import { Link as RouterLink } from 'react-router-dom'
import { extendMerchantSubscriptionEndDate } from '../api/plans'
import {
  cancelMerchantCheckout,
  cancelSubscriptionAutoRenew,
  fetchScheduledSubscriptionDowngrade,
  getActiveSubscription,
  getManualSubscriptionRenewalPreview,
  initiateManualRenewal,
  listInvoices,
} from '../api/merchant'
import { updateSubscriptionDates } from '../api/subscriptionTest'
import {
  enqueueSubscriptionAutoRenewCronJob,
  SUBSCRIPTION_AUTO_RENEW_CRON_QUEUE,
} from '../api/cronDevTools'
import { ApiRequestError } from '../api/client'
import { DEFAULT_REDIS_CONNECTION, publishToRedisStream } from '../api/redisDevTools'
import { ApiErrorAlert } from '../components/ApiErrorAlert'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { PageHeader } from '../components/layout/PageHeader'
import { BillingAddressFields } from '../components/merchant/BillingAddressFields'
import { RenewalRedisEventsPanel } from '../components/merchant/RenewalRedisEventsPanel'
import { CheckoutSessionActions } from '../components/payment/CheckoutSessionActions'
import { useApiTransaction } from '../hooks/useApiTransaction'
import type {
  ActiveSubscriptionResponse,
  BillingAddress,
  InvoiceListItem,
  ManualRenewalResponse,
  ManualSubscriptionRenewalPreviewResponse,
  ScheduledSubscriptionDowngradeResponse,
} from '../types/subscription'
import {
  buildInitiateManualRenewalPayload,
  defaultBillingAddress,
} from '../utils/billingAddress'
import { formatDateOnly, formatDateTime, formatMoney, toDatetimeLocalInputValue, datetimeLocalInputToIso } from '../utils/planDisplay'
import {
  buildSucceededPaymentEventFromHandoff,
} from '../utils/paymentEventBuilder'
import { handlePurchaseCheckoutResult } from '../utils/checkoutSession'
import {
  checkAutoRenewEligibility,
  checkManualRenewalEligibility,
  describePreviewAvailability,
} from '../utils/renewalEligibility'
import {
  buildExpirePresetDates,
  expirePresetLabels,
  type ExpirePresetKind,
} from '../utils/renewalDatePresets'

const DEFAULT_MOCK_MERCHANT_ID = '00000000-0000-4000-8000-000000000003'

type RenewalPreviewKind = 'extend' | 'updateDates' | 'cron' | 'renew' | 'redis'

function EligibilityRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
      <Chip label={ok ? 'OK' : 'NO'} size="small" color={ok ? 'success' : 'default'} />
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        {detail && (
          <Typography variant="caption" color="text.secondary">
            {detail}
          </Typography>
        )}
      </Box>
    </Stack>
  )
}

export function SubscriptionRenewalTestingPage() {
  const [subscriptionData, setSubscriptionData] = useState<ActiveSubscriptionResponse | null>(null)
  const [scheduledChange, setScheduledChange] = useState<ScheduledSubscriptionDowngradeResponse | null>(
    null,
  )
  const [preview, setPreview] = useState<ManualSubscriptionRenewalPreviewResponse | null>(null)
  const [renewalInvoices, setRenewalInvoices] = useState<InvoiceListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const [extendDays, setExtendDays] = useState('1')
  const [extendMerchantId, setExtendMerchantId] = useState('')
  const [extending, setExtending] = useState(false)
  const [extendMessage, setExtendMessage] = useState<string | null>(null)
  const [extendError, setExtendError] = useState<string | null>(null)

  const [updateStartDate, setUpdateStartDate] = useState('')
  const [updateEndDate, setUpdateEndDate] = useState('')
  const [updatingDates, setUpdatingDates] = useState(false)
  const [updateDatesMessage, setUpdateDatesMessage] = useState<string | null>(null)
  const [updateDatesError, setUpdateDatesError] = useState<string | null>(null)

  const [cancellingCheckout, setCancellingCheckout] = useState(false)
  const [cancelCheckoutMessage, setCancelCheckoutMessage] = useState<string | null>(null)
  const [cancelCheckoutError, setCancelCheckoutError] = useState<string | null>(null)

  const [autoPoll, setAutoPoll] = useState(false)
  const [cancellingAutoRenew, setCancellingAutoRenew] = useState(false)

  const [billingAddress, setBillingAddress] = useState<BillingAddress>(defaultBillingAddress)
  const [includeBillingAddress, setIncludeBillingAddress] = useState(false)
  const [initiatingRenewal, setInitiatingRenewal] = useState(false)
  const [renewalResult, setRenewalResult] = useState<ManualRenewalResponse | null>(null)
  const [renewalError, setRenewalError] = useState<unknown>(null)
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const [runningAutoRenewCron, setRunningAutoRenewCron] = useState(false)
  const [autoRenewCronMessage, setAutoRenewCronMessage] = useState<string | null>(null)
  const [autoRenewCronError, setAutoRenewCronError] = useState<string | null>(null)

  const [previewKind, setPreviewKind] = useState<RenewalPreviewKind>('extend')
  const { transaction, execute } = useApiTransaction()

  const subscription = subscriptionData?.subscription

  const autoEligibility = useMemo(
    () => (subscription ? checkAutoRenewEligibility(subscription) : null),
    [subscription],
  )

  const manualEligibility = useMemo(
    () => (subscription ? checkManualRenewalEligibility(subscription) : null),
    [subscription],
  )

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [activeSub, previewResult, invoiceResult, scheduledChangeResult] = await Promise.all([
        getActiveSubscription(),
        getManualSubscriptionRenewalPreview().catch(() => null),
        listInvoices({ limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }).catch(() => null),
        fetchScheduledSubscriptionDowngrade(),
      ])
      setSubscriptionData(activeSub)
      setScheduledChange(scheduledChangeResult)
      setPreview(previewResult)
      setExtendMerchantId((current) => current || DEFAULT_MOCK_MERCHANT_ID)
      const renewalItems =
        invoiceResult?.invoices.filter((item: InvoiceListItem) =>
          item.lineItems?.some(
            (line) =>
              line.lineItemCategory === 'SUBSCRIPTION_RENEWAL' ||
              line.lineItemCategory === 'SUBSCRIPTION_DOWNGRADE',
          ),
        ) ?? []
      setRenewalInvoices(renewalItems)
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setSubscriptionData(null)
        setScheduledChange(null)
        setPreview(null)
        setRenewalInvoices([])
        return
      }
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!autoPoll) return
    const interval = window.setInterval(() => {
      void loadAll()
    }, 5000)
    return () => window.clearInterval(interval)
  }, [autoPoll, loadAll])

  useEffect(() => {
    if (!subscription) return
    setUpdateStartDate(toDatetimeLocalInputValue(subscription.startDate))
    setUpdateEndDate(toDatetimeLocalInputValue(subscription.endDate))
  }, [subscription?.startDate, subscription?.endDate])

  const handleExtendEndDate = async () => {
    const parsedDays = Number(extendDays)
    if (!extendMerchantId.trim()) {
      setExtendError('Merchant ID is required.')
      return
    }
    if (!Number.isInteger(parsedDays) || parsedDays <= 0) {
      setExtendError('Days must be a positive integer.')
      return
    }

    setExtending(true)
    setExtendError(null)
    setExtendMessage(null)
    setPreviewKind('extend')
    const payload = {
      merchantId: extendMerchantId.trim(),
      days: parsedDays,
    }

    try {
      const result = await execute(
        payload,
        () => extendMerchantSubscriptionEndDate(payload),
        'POST /api/v1/admin/plans/merchant/extend-subscription-end-date',
      )
      setExtendMessage(
        `Extended ${result.subscriptionId}: ${formatDateTime(result.previousEndDate)} → ${formatDateTime(result.newEndDate)}`,
      )
      await loadAll()
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to extend end date'
      setExtendError(message)
    } finally {
      setExtending(false)
    }
  }

  const handleUpdateSubscriptionDates = async () => {
    if (!updateStartDate.trim() || !updateEndDate.trim()) {
      setUpdateDatesError('Start date and end date are required.')
      return
    }

    const start = new Date(updateStartDate)
    const end = new Date(updateEndDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setUpdateDatesError('Enter valid start and end dates.')
      return
    }
    if (end.getTime() <= start.getTime()) {
      setUpdateDatesError('End date must be after start date.')
      return
    }

    setUpdatingDates(true)
    setUpdateDatesError(null)
    setUpdateDatesMessage(null)
    setPreviewKind('updateDates')

    const payload = {
      startDate: datetimeLocalInputToIso(updateStartDate),
      endDate: datetimeLocalInputToIso(updateEndDate),
    }

    try {
      const result = await execute(
        payload,
        () => updateSubscriptionDates(payload),
        'PATCH /api/v1/test/subscription/update-dates',
      )
      setUpdateDatesMessage(result.message)
      await loadAll()
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to update subscription dates'
      setUpdateDatesError(message)
    } finally {
      setUpdatingDates(false)
    }
  }

  const handleExpirePreset = (kind: ExpirePresetKind) => {
    setPreviewKind('updateDates')
    const { start, end } = buildExpirePresetDates(kind, subscription?.startDate)
    setUpdateStartDate(toDatetimeLocalInputValue(start.toISOString()))
    setUpdateEndDate(toDatetimeLocalInputValue(end.toISOString()))
  }

  const handleRunAutoRenewCron = async () => {
    setRunningAutoRenewCron(true)
    setAutoRenewCronError(null)
    setAutoRenewCronMessage(null)
    setPreviewKind('cron')

    const payload = {
      queue: SUBSCRIPTION_AUTO_RENEW_CRON_QUEUE,
      jobName: SUBSCRIPTION_AUTO_RENEW_CRON_QUEUE,
      data: {},
    }

    try {
      const result = await execute(
        payload,
        () => enqueueSubscriptionAutoRenewCronJob(),
        `POST /dev-tools/cron/enqueue (${SUBSCRIPTION_AUTO_RENEW_CRON_QUEUE})`,
      )
      setAutoRenewCronMessage(result.message)
      await loadAll()
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to enqueue auto-renew cron job'
      setAutoRenewCronError(message)
    } finally {
      setRunningAutoRenewCron(false)
    }
  }

  const handleCancelCheckout = async () => {
    setCancellingCheckout(true)
    setCancelCheckoutError(null)
    setCancelCheckoutMessage(null)

    try {
      const result = await execute(
        {},
        () => cancelMerchantCheckout(),
        'POST /api/v1/merchant/subscription/checkout/cancel',
      )
      setCancelCheckoutMessage(result.message)
      setRenewalResult(null)
      await loadAll()
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to cancel checkout'
      setCancelCheckoutError(message)
    } finally {
      setCancellingCheckout(false)
    }
  }

  const handleDisableAutoRenew = async () => {
    setCancellingAutoRenew(true)
    try {
      await cancelSubscriptionAutoRenew()
      await loadAll()
    } catch (err) {
      setError(err)
    } finally {
      setCancellingAutoRenew(false)
    }
  }

  const handleInitiateManualRenewal = async () => {
    setInitiatingRenewal(true)
    setRenewalError(null)
    setRenewalResult(null)
    setPaymentMessage(null)
    setPaymentError(null)
    setPreviewKind('renew')
    const payload = buildInitiateManualRenewalPayload(billingAddress, includeBillingAddress)

    try {
      const result = await execute(
        payload,
        () => initiateManualRenewal(payload),
        'POST /api/v1/merchant/subscription/renew',
      )
      setRenewalResult(result)
      handlePurchaseCheckoutResult(result)
      await loadAll()
    } catch (err) {
      setRenewalError(err)
    } finally {
      setInitiatingRenewal(false)
    }
  }

  const handleConfirmRenewalPayment = async () => {
    const handoff = renewalResult?.paymentHandoff
    if (!handoff) return

    setConfirmingPayment(true)
    setPaymentError(null)
    setPaymentMessage(null)
    setPreviewKind('redis')
    const event = buildSucceededPaymentEventFromHandoff(handoff)

    try {
      await execute(
        event,
        () => publishToRedisStream(event, { redis: DEFAULT_REDIS_CONNECTION }),
        'POST /dev-tools/redis/publish (payment.invoice.status.updated)',
      )
      setPaymentMessage(`Published PAYMENT_SUCCEEDED for ${handoff.invoiceNumber}`)
      await loadAll()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish payment event'
      setPaymentError(message)
    } finally {
      setConfirmingPayment(false)
    }
  }

  const isEndDatePast = subscription
    ? new Date(subscription.endDate).getTime() <= Date.now()
    : false

  const extendPreviewPayload = useMemo(
    () => ({
      merchantId: extendMerchantId.trim(),
      days: Number(extendDays) || 0,
    }),
    [extendMerchantId, extendDays],
  )

  const renewPreviewPayload = useMemo(
    () => buildInitiateManualRenewalPayload(billingAddress, includeBillingAddress),
    [billingAddress, includeBillingAddress],
  )

  const updateDatesPreviewPayload = useMemo(() => {
    if (!updateStartDate.trim() || !updateEndDate.trim()) {
      return { startDate: '', endDate: '' }
    }
    return {
      startDate: datetimeLocalInputToIso(updateStartDate),
      endDate: datetimeLocalInputToIso(updateEndDate),
    }
  }, [updateStartDate, updateEndDate])

  const cronPreviewPayload = useMemo(
    () => ({
      queue: SUBSCRIPTION_AUTO_RENEW_CRON_QUEUE,
      jobName: SUBSCRIPTION_AUTO_RENEW_CRON_QUEUE,
      data: {},
    }),
    [],
  )

  const redisPreviewPayload = useMemo(() => {
    const handoff = renewalResult?.paymentHandoff
    if (!handoff) return null
    return buildSucceededPaymentEventFromHandoff(handoff)
  }, [renewalResult])

  const livePreview = useMemo(() => {
    if (previewKind === 'redis' && redisPreviewPayload) {
      return { title: 'Redis payment event preview', payload: redisPreviewPayload }
    }
    if (previewKind === 'renew') {
      return { title: 'Manual renewal payload preview', payload: renewPreviewPayload }
    }
    if (previewKind === 'updateDates') {
      return { title: 'Update subscription dates payload preview', payload: updateDatesPreviewPayload }
    }
    if (previewKind === 'cron') {
      return { title: 'Auto-renew cron enqueue preview', payload: cronPreviewPayload }
    }
    return { title: 'Extend end date payload preview', payload: extendPreviewPayload }
  }, [
    previewKind,
    redisPreviewPayload,
    renewPreviewPayload,
    updateDatesPreviewPayload,
    cronPreviewPayload,
    extendPreviewPayload,
  ])

  const renewalCheckoutUrl =
    renewalResult?.checkoutUrl ?? renewalResult?.stripeCheckoutUrl ?? null

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Merchant"
        title="Subscription renewal testing"
        description="End-to-end workspace for auto-renew scheduler flows, manual renewal preview, POST /renew recovery checkout, and subscription date test utilities."
        apiEndpoint="PATCH /test/subscription/update-dates · BullMQ subscription-cron-auto-renew · GET /renewal/preview · POST /renew · POST /checkout/cancel"
        backTo="/"
        backLabel="Back to home"
        actions={
          <Stack direction="row" spacing={1}>
            <FormControlLabel
              control={
                <Switch checked={autoPoll} onChange={(event) => setAutoPoll(event.target.checked)} />
              }
              label="Auto-refresh (5s)"
            />
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => void loadAll()}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>
        }
      />

      {loading && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading subscription state…</Typography>
        </Stack>
      )}

      {!loading && error != null && <ApiErrorAlert error={error} action={<Button onClick={() => void loadAll()}>Retry</Button>} />}

      {!loading && !subscriptionData && (
        <Alert severity="info">
          No active subscription found.{' '}
          <RouterLink to="/merchant/plans">Purchase a plan</RouterLink> first, then return here to
          test renewal flows.
        </Alert>
      )}

      {!loading && subscription && (
        <>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
                <AutorenewIcon color="primary" />
                <Typography variant="h6">Current subscription state</Typography>
                <Chip label={subscription.status} size="small" color="primary" variant="outlined" />
                <Chip
                  label={subscription.autoRenew ? 'Auto-renew on' : 'Auto-renew off'}
                  size="small"
                  color={subscription.autoRenew ? 'success' : 'default'}
                />
                {subscription.isTrial && <Chip label="Trial" size="small" color="warning" />}
              </Stack>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    End date
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatDateTime(subscription.endDate)}
                    {isEndDatePast ? ' (expired)' : ''}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Grace period until
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {subscription.gracePeriodDate
                      ? formatDateOnly(subscription.gracePeriodDate)
                      : '—'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Plan
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {subscriptionData.plan.planName}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Billing cycle
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {subscription.billingCycle}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
                <TrendingDownIcon color="action" fontSize="small" />
                <Typography variant="subtitle2">Scheduled subscription change</Typography>
                <Chip
                  label={scheduledChange ? 'Plan downgrade scheduled' : 'None'}
                  size="small"
                  color={scheduledChange ? 'warning' : 'default'}
                  variant="outlined"
                />
              </Stack>

              {scheduledChange ? (
                <Stack spacing={1.5}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">
                        Scheduled date
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {formatDateOnly(scheduledChange.scheduledChange.scheduledDate)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">
                        Target plan
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {scheduledChange.plan.planName}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">
                        Billing cycle after change
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {scheduledChange.scheduledChange.billingCycle}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">
                        Auto-renew after downgrade
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {scheduledChange.scheduledChange.autoRenew ? 'Yes' : 'No'}
                      </Typography>
                    </Grid>
                  </Grid>
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    {subscription.autoRenew
                      ? 'At renewal, the scheduled downgrade is applied as part of the normal auto-renew flow.'
                      : 'With auto-renew off, the scheduler still processes a downgrade renewal when end date is reached.'}{' '}
                    Manual renewal preview is blocked while a change is scheduled.
                  </Alert>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No scheduled plan change. Renewal will continue on the current plan unless
                  auto-renew is off and no downgrade is scheduled (job skips).
                </Typography>
              )}

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Auto-renew batch eligibility
                  </Typography>
                  <Stack spacing={1}>
                    <EligibilityRow
                      label="Status ACTIVE"
                      ok={subscription.status === 'ACTIVE'}
                      detail={subscription.status}
                    />
                    <EligibilityRow label="Not trial" ok={!subscription.isTrial} />
                    <EligibilityRow
                      label="No grace period"
                      ok={subscription.gracePeriodDate == null}
                    />
                    <EligibilityRow label="End date reached" ok={isEndDatePast} detail={subscription.endDate} />
                  </Stack>
                  {autoEligibility && autoEligibility.notes.length > 0 && (
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      {autoEligibility.notes.map((note) => (
                        <Typography key={note} variant="caption" color="text.secondary">
                          · {note}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Manual recovery eligibility (POST /renew)
                  </Typography>
                  {manualEligibility?.eligible ? (
                    <Alert severity="success">
                      Eligible for manual recovery ({manualEligibility.eligibleState})
                    </Alert>
                  ) : (
                    <Alert severity="info">
                      {manualEligibility?.reasons.join(' · ')}
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <RenewalRedisEventsPanel
            merchantId={DEFAULT_MOCK_MERCHANT_ID}
            autoRefresh={autoPoll}
          />

          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
                <ScheduleIcon color="primary" />
                <Typography variant="h6">Run auto-renew cron job</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enqueues a one-off BullMQ job on queue{' '}
                <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {SUBSCRIPTION_AUTO_RENEW_CRON_QUEUE}
                </Box>
                . The subscription MS worker picks it up and processes eligible due subscriptions
                (same handler as the scheduled cron). Requires the subscription service and Redis to
                be running locally.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={
                    runningAutoRenewCron ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <PlayArrowIcon />
                    )
                  }
                  disabled={runningAutoRenewCron}
                  onClick={() => void handleRunAutoRenewCron()}
                >
                  {runningAutoRenewCron ? 'Enqueueing…' : 'Run auto-renew cron now'}
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Typical flow: expire subscription dates → run cron → confirm payment if needed.
                </Typography>
              </Stack>
              {autoRenewCronMessage && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {autoRenewCronMessage}
                </Alert>
              )}
              {autoRenewCronError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {autoRenewCronError}
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Prepare subscription for renewal
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Auto-renew triggers when end_date ≤ now. Use admin extend to add days, or set absolute
                dates below (PATCH /test/subscription/update-dates) to expire immediately.
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Merchant ID"
                    value={extendMerchantId}
                    onChange={(event) => {
                      setPreviewKind('extend')
                      setExtendMerchantId(event.target.value)
                    }}
                    fullWidth
                    size="small"
                    helperText="Mock merchant in dev: 00000000-0000-4000-8000-000000000003"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <TextField
                    label="Add days to end date"
                    type="number"
                    value={extendDays}
                    onChange={(event) => {
                      setPreviewKind('extend')
                      setExtendDays(event.target.value)
                    }}
                    fullWidth
                    size="small"
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack direction="row" spacing={1} sx={{ height: '100%', alignItems: 'flex-start' }}>
                    <Button
                      variant="outlined"
                      onClick={() => void handleExtendEndDate()}
                      disabled={extending}
                    >
                      {extending ? 'Extending…' : 'Extend end date'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      disabled={!subscription.autoRenew || cancellingAutoRenew}
                      onClick={() => void handleDisableAutoRenew()}
                    >
                      {cancellingAutoRenew ? 'Disabling…' : 'Disable auto-renew'}
                    </Button>
                    <Button component={RouterLink} to="/admin/extend-subscription" variant="text">
                      Full extend page
                    </Button>
                  </Stack>
                </Grid>
              </Grid>

              {extendMessage && <Alert severity="success" sx={{ mt: 2 }}>{extendMessage}</Alert>}
              {extendError && <Alert severity="error" sx={{ mt: 2 }}>{extendError}</Alert>}

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle1" gutterBottom>
                Set absolute subscription dates (logged-in merchant)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                PATCH /api/v1/test/subscription/update-dates — updates start and end dates on the
                active subscription for the current merchant JWT. Use this to expire immediately for
                auto-renew testing without admin extend-by-days.
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Start date"
                    type="datetime-local"
                    value={updateStartDate}
                    onChange={(event) => {
                      setPreviewKind('updateDates')
                      setUpdateStartDate(event.target.value)
                    }}
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="End date"
                    type="datetime-local"
                    value={updateEndDate}
                    onChange={(event) => {
                      setPreviewKind('updateDates')
                      setUpdateEndDate(event.target.value)
                    }}
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Stack spacing={1}>
                    <Button
                      variant="contained"
                      onClick={() => void handleUpdateSubscriptionDates()}
                      disabled={updatingDates || !subscription}
                    >
                      {updatingDates ? 'Updating…' : 'Update dates'}
                    </Button>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                      {(['immediate', 'monthly', 'yearly'] as ExpirePresetKind[]).map((kind) => (
                        <Button
                          key={kind}
                          variant="outlined"
                          color="warning"
                          size="small"
                          disabled={!subscription}
                          onClick={() => handleExpirePreset(kind)}
                        >
                          {expirePresetLabels[kind]}
                        </Button>
                      ))}
                    </Stack>
                    {subscription && (
                      <Typography variant="caption" color="text.secondary">
                        Presets set end date to now. Monthly/yearly use a full billing period ending
                        today (start = now − 1 month/year). Current billing cycle:{' '}
                        {subscription.billingCycle}.
                      </Typography>
                    )}
                  </Stack>
                </Grid>
              </Grid>

              {subscription && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Current: {formatDateTime(subscription.startDate)} → {formatDateTime(subscription.endDate)}
                </Typography>
              )}

              {updateDatesMessage && <Alert severity="success" sx={{ mt: 2 }}>{updateDatesMessage}</Alert>}
              {updateDatesError && <Alert severity="error" sx={{ mt: 2 }}>{updateDatesError}</Alert>}

              {!isEndDatePast && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  End date is still in the future. Pick an expire preset above, then click Update dates
                  to trigger auto-renew testing without a DB update.
                </Alert>
              )}

              {isEndDatePast && autoEligibility?.eligible && subscription.autoRenew && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Subscription is due for auto-renew. Enable auto-refresh to watch for a new renewal
                  invoice. Confirm payment via the section below or{' '}
                  <RouterLink to="/dev/payment-confirm">Confirm Payment</RouterLink>.
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Manual renewal preview
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                GET /api/v1/merchant/subscription/renewal/preview — pricing estimate for manual
                renewal at end of cycle (not the recovery flow).
              </Typography>

              {preview ? (
                <>
                  <Alert severity={preview.available ? 'success' : 'info'} sx={{ mb: 2 }}>
                    {describePreviewAvailability(preview).summary}
                  </Alert>
                  {preview.available && (
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        Plan: {preview.plan.planName} · End date:{' '}
                        {formatDateOnly(preview.subscription.endDate)}
                      </Typography>
                      <Typography variant="subtitle2">
                        Estimated total:{' '}
                        {formatMoney(preview.pricing.currency, preview.pricing.grandTotal)}
                      </Typography>
                    </Stack>
                  )}
                </>
              ) : (
                <Alert severity="info">Preview not available (no subscription or request failed).</Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Manual recovery checkout
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                POST /api/v1/merchant/subscription/renew — for RENEWAL_FAILED, grace period, or
                MERCHANT_CANCELLED subscriptions.
              </Typography>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeBillingAddress}
                    onChange={(event) => {
                      setPreviewKind('renew')
                      setIncludeBillingAddress(event.target.checked)
                    }}
                  />
                }
                label="Include billing address (required when no prior completed invoice address exists)"
              />

              {includeBillingAddress && (
                <Box sx={{ mt: 2, mb: 2 }} onFocus={() => setPreviewKind('renew')}>
                  <BillingAddressFields
                    value={billingAddress}
                    onChange={(value) => {
                      setPreviewKind('renew')
                      setBillingAddress(value)
                    }}
                  />
                </Box>
              )}

              <Button
                variant="contained"
                startIcon={
                  initiatingRenewal ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />
                }
                disabled={initiatingRenewal}
                onClick={() => void handleInitiateManualRenewal()}
              >
                {initiatingRenewal ? 'Initiating…' : 'Initiate manual renewal'}
              </Button>

              {renewalError != null && (
                <Box sx={{ mt: 2 }}>
                  <ApiErrorAlert error={renewalError} />
                </Box>
              )}

              {renewalResult && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {renewalResult.message} ({renewalResult.outcome}, {renewalResult.renewalType})
                  </Typography>
                  <Typography variant="body2">
                    Invoice {renewalResult.invoice.invoiceNumber} ·{' '}
                    {formatMoney(renewalResult.invoice.currency, renewalResult.invoice.grandTotal)} ·{' '}
                    {renewalResult.invoice.status}
                  </Typography>
                  {renewalResult.paymentHandoff && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={
                          confirmingPayment ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            <PaymentIcon />
                          )
                        }
                        disabled={confirmingPayment}
                        onClick={() => void handleConfirmRenewalPayment()}
                      >
                        Confirm payment (Redis)
                      </Button>
                      <Button
                        size="small"
                        component={RouterLink}
                        to="/dev/payment-confirm"
                        variant="outlined"
                      >
                        Open payment confirm page
                      </Button>
                    </Stack>
                  )}
                  {renewalCheckoutUrl && (
                    <CheckoutSessionActions
                      checkoutUrl={renewalCheckoutUrl}
                      onCancelCheckout={() => void handleCancelCheckout()}
                      cancellingCheckout={cancellingCheckout}
                    />
                  )}
                </Alert>
              )}

              {cancelCheckoutMessage && <Alert severity="success" sx={{ mt: 2 }}>{cancelCheckoutMessage}</Alert>}
              {cancelCheckoutError && <Alert severity="error" sx={{ mt: 2 }}>{cancelCheckoutError}</Alert>}

              {paymentMessage && <Alert severity="success" sx={{ mt: 2 }}>{paymentMessage}</Alert>}
              {paymentError && <Alert severity="error" sx={{ mt: 2 }}>{paymentError}</Alert>}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent renewal invoices
              </Typography>
              {renewalInvoices.length === 0 ? (
                <Alert severity="info">
                  No SUBSCRIPTION_RENEWAL or SUBSCRIPTION_DOWNGRADE invoices found yet.
                </Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Invoice</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {renewalInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>{invoice.invoiceNumber}</TableCell>
                          <TableCell>
                            <Chip label={invoice.status} size="small" />
                          </TableCell>
                          <TableCell align="right">
                            {formatMoney(invoice.currency, invoice.grandTotal)}
                          </TableCell>
                          <TableCell>{formatDateTime(invoice.createdAt)}</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              component={RouterLink}
                              to={`/merchant/invoices/${invoice.id}`}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ApiTransactionInspector
        livePayload={livePreview.payload}
        livePayloadTitle={livePreview.title}
        transaction={transaction}
      />
    </Stack>
  )
}
