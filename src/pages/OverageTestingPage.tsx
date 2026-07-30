import { useCallback, useEffect, useMemo, useState } from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PaymentIcon from '@mui/icons-material/Payment'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RefreshIcon from '@mui/icons-material/Refresh'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { Link as RouterLink } from 'react-router-dom'
import { initiateManualOveragePayment, listOverageHistory } from '../api/overage'
import { getActiveSubscription } from '../api/merchant'
import { ApiRequestError } from '../api/client'
import {
  DEFAULT_REDIS_CONNECTION,
  publishEventToRedisStream,
} from '../api/redisDevTools'
import { ApiErrorAlert } from '../components/ApiErrorAlert'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { PageHeader } from '../components/layout/PageHeader'
import { UsageSimulationPanel } from '../components/merchant/UsageSimulationPanel'
import { useApiTransaction } from '../hooks/useApiTransaction'
import type {
  ActiveSubscriptionResponse,
  ManualOveragePaymentResult,
  OverageHistoryListItem,
} from '../types/subscription'
import {
  MerchantSubscriptionOverageStatus,
} from '../types/subscription'
import { generateBulkOverageUsage } from '../utils/overageBulkGenerator'
import {
  overageScenarioCategoryLabels,
  overageTestScenarios,
  type OverageScenarioCategory,
} from '../utils/overageScenarios'
import { formatDateTime, formatMoney } from '../utils/planDisplay'
import {
  buildSucceededPaymentEventFromHandoff,
} from '../utils/paymentEventBuilder'
import { handlePurchaseCheckoutResult } from '../utils/checkoutSession'
import { CheckoutSessionActions } from '../components/payment/CheckoutSessionActions'
import {
  buildResellerOverageRequestedEvent,
  RESELLER_OVERAGE_REQUESTED_STREAM,
} from '../utils/resellerOverageEventBuilder'

const DEFAULT_MOCK_MERCHANT_ID = '00000000-0000-4000-8000-000000000003'

const OVERAGE_LIST_QUERY = { limit: 20, sortBy: 'createdAt' as const, sortOrder: 'desc' as const }

type OveragePreviewKind = 'list' | 'payment' | 'reseller' | 'redis'

function overageStatusColor(status: string): 'success' | 'warning' | 'error' | 'default' {
  if (status === MerchantSubscriptionOverageStatus.PAID) return 'success'
  if (status === MerchantSubscriptionOverageStatus.PROCESSING) return 'warning'
  if (status === MerchantSubscriptionOverageStatus.FAILED) return 'error'
  return 'default'
}

export function OverageTestingPage() {
  const [subscriptionData, setSubscriptionData] = useState<ActiveSubscriptionResponse | null>(null)
  const [overageHistory, setOverageHistory] = useState<OverageHistoryListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [refreshingUsage, setRefreshingUsage] = useState(false)
  const [autoPoll, setAutoPoll] = useState(false)

  const [bulkAttributeCode, setBulkAttributeCode] = useState('')
  const [bulkCount, setBulkCount] = useState('5')
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [bulkResult, setBulkResult] = useState<string | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)

  const [resellerMerchantId, setResellerMerchantId] = useState(DEFAULT_MOCK_MERCHANT_ID)
  const [resellerAmount, setResellerAmount] = useState('25')
  const [resellerPublishing, setResellerPublishing] = useState(false)
  const [resellerMessage, setResellerMessage] = useState<string | null>(null)
  const [resellerError, setResellerError] = useState<string | null>(null)

  const [paying, setPaying] = useState(false)
  const [paymentResult, setPaymentResult] = useState<ManualOveragePaymentResult | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [paymentConfirmMessage, setPaymentConfirmMessage] = useState<string | null>(null)

  const [scenarioFilter, setScenarioFilter] = useState<OverageScenarioCategory | 'all'>('all')
  const [previewKind, setPreviewKind] = useState<OveragePreviewKind>('list')
  const { transaction, execute } = useApiTransaction()

  const subscription = subscriptionData?.subscription
  const plan = subscriptionData?.plan

  const overageEnabledAttributes = useMemo(
    () => subscription?.limitsAndUsages.filter((row) => row.overageEnabled) ?? [],
    [subscription],
  )

  const overageTotals = useMemo(() => {
    const byStatus = {
      PAID: 0,
      PROCESSING: 0,
      FAILED: 0,
    }
    let amountPaid = 0
    let amountProcessing = 0
    let amountFailed = 0

    for (const row of overageHistory) {
      if (row.status === MerchantSubscriptionOverageStatus.PAID) {
        byStatus.PAID++
        amountPaid += row.overageAmount
      } else if (row.status === MerchantSubscriptionOverageStatus.PROCESSING) {
        byStatus.PROCESSING++
        amountProcessing += row.overageAmount
      } else if (row.status === MerchantSubscriptionOverageStatus.FAILED) {
        byStatus.FAILED++
        amountFailed += row.overageAmount
      }
    }

    return { byStatus, amountPaid, amountProcessing, amountFailed }
  }, [overageHistory])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPreviewKind('list')
    try {
      const [activeSub, historyResult] = await Promise.all([
        getActiveSubscription(),
        execute(
          OVERAGE_LIST_QUERY,
          () => listOverageHistory(OVERAGE_LIST_QUERY),
          'GET /api/v1/merchant/overage-tracking',
        ).catch(() => ({
          items: [],
          pagination: { total: 0, page: 1, limit: 20, totalPages: 1, hasNext: false, hasPrev: false },
        })),
      ])
      setSubscriptionData(activeSub)
      setOverageHistory(historyResult.items)
      setBulkAttributeCode((current) => {
        if (current) return current
        const first = activeSub.subscription.limitsAndUsages.find((row) => row.overageEnabled)
        return first?.attributeCode ?? ''
      })
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setSubscriptionData(null)
        setOverageHistory([])
        return
      }
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [execute])

  const refreshUsage = useCallback(async () => {
    setRefreshingUsage(true)
    setPreviewKind('list')
    try {
      const activeSub = await getActiveSubscription()
      setSubscriptionData(activeSub)
      const historyResult = await execute(
        OVERAGE_LIST_QUERY,
        () => listOverageHistory(OVERAGE_LIST_QUERY),
        'GET /api/v1/merchant/overage-tracking',
      )
      setOverageHistory(historyResult.items)
    } catch {
      // Keep last known snapshot on background refresh failure.
    } finally {
      setRefreshingUsage(false)
    }
  }, [execute])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!autoPoll) return
    const interval = window.setInterval(() => {
      void refreshUsage()
    }, 5000)
    return () => window.clearInterval(interval)
  }, [autoPoll, refreshUsage])

  const handleBulkGenerate = async () => {
    if (!subscription || !bulkAttributeCode) return
    const parsedCount = Number(bulkCount)
    if (!Number.isInteger(parsedCount) || parsedCount <= 0) {
      setBulkError('Count must be a positive integer.')
      return
    }

    setBulkRunning(true)
    setBulkError(null)
    setBulkResult(null)
    setBulkProgress({ done: 0, total: parsedCount })

    try {
      let currentLimits = subscription.limitsAndUsages
      const result = await generateBulkOverageUsage({
        attributeCode: bulkAttributeCode,
        count: parsedCount,
        limitsAndUsages: currentLimits,
        onProgress: (done, total) => setBulkProgress({ done, total }),
        onIterationComplete: async () => {
          const activeSub = await getActiveSubscription()
          setSubscriptionData(activeSub)
          currentLimits = activeSub.subscription.limitsAndUsages
        },
      })

      await refreshUsage()

      if (result.errors.length > 0) {
        setBulkError(result.errors.join(' · '))
      }

      setBulkResult(
        `Completed ${result.succeeded}/${parsedCount} overage usage confirmations` +
          (result.failed > 0 ? ` (${result.failed} did not complete)` : ''),
      )
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Bulk generation failed')
    } finally {
      setBulkRunning(false)
      setBulkProgress(null)
    }
  }

  const handleResellerPublish = async () => {
    const parsedAmount = Number(resellerAmount)
    if (!resellerMerchantId.trim()) {
      setResellerError('Merchant ID is required.')
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setResellerError('Overage amount must be positive.')
      return
    }

    setResellerPublishing(true)
    setResellerError(null)
    setResellerMessage(null)
    setPreviewKind('reseller')
    const event = buildResellerOverageRequestedEvent({
      eventId: crypto.randomUUID(),
      merchantId: resellerMerchantId.trim(),
      overageAmount: parsedAmount,
      correlationId: `reseller-overage-ui-${Date.now()}`,
      entityId: crypto.randomUUID(),
      entityName: 'TEST-ORDER-OVERAGE',
      redisContainer: 'pps-redis',
      redisPassword: 'bitnami',
      redisHost: 'localhost',
      redisPort: 6790,
    })

    try {
      await execute(
        event,
        () =>
          publishEventToRedisStream(event, {
            stream: RESELLER_OVERAGE_REQUESTED_STREAM,
            redis: DEFAULT_REDIS_CONNECTION,
          }),
        `POST /dev-tools/redis/publish (${RESELLER_OVERAGE_REQUESTED_STREAM})`,
      )

      setResellerMessage(`Published ResellerOverageRequested (${parsedAmount}) to Redis`)
      await refreshUsage()
    } catch (err) {
      setResellerError(err instanceof Error ? err.message : 'Failed to publish reseller overage')
    } finally {
      setResellerPublishing(false)
    }
  }

  const handleManualPayment = async () => {
    setPaying(true)
    setPaymentError(null)
    setPaymentResult(null)
    setPaymentConfirmMessage(null)
    setPreviewKind('payment')
    const payload = {}

    try {
      const result = await execute(
        payload,
        () => initiateManualOveragePayment(),
        'POST /api/v1/merchant/overage-tracking/manual-payment',
      )
      setPaymentResult(result)
      handlePurchaseCheckoutResult(result)
      await refreshUsage()
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Manual overage payment failed')
      if (err instanceof ApiRequestError) {
        setPaymentError(err.body.message ?? err.message)
      }
    } finally {
      setPaying(false)
    }
  }

  const handleConfirmPayment = async () => {
    const handoff = paymentResult?.paymentHandoff
    if (!handoff) return

    setConfirmingPayment(true)
    setPreviewKind('redis')
    const event = buildSucceededPaymentEventFromHandoff(handoff)

    try {
      await execute(
        event,
        () =>
          publishEventToRedisStream(event, {
            stream: 'payment.invoice.status.updated',
            redis: DEFAULT_REDIS_CONNECTION,
          }),
        'POST /dev-tools/redis/publish (payment.invoice.status.updated)',
      )
      setPaymentConfirmMessage(`Published PAYMENT_SUCCEEDED for ${handoff.invoiceNumber}`)
      await refreshUsage()
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Failed to confirm payment')
    } finally {
      setConfirmingPayment(false)
    }
  }

  const filteredScenarios =
    scenarioFilter === 'all'
      ? overageTestScenarios
      : overageTestScenarios.filter((scenario) => scenario.category === scenarioFilter)

  const failedOverageCount = overageTotals.byStatus.FAILED

  const resellerPreviewPayload = useMemo(
    () =>
      buildResellerOverageRequestedEvent({
        eventId: 'preview-event-id',
        merchantId: resellerMerchantId.trim(),
        overageAmount: Number(resellerAmount) || 0,
        correlationId: 'reseller-overage-ui-preview',
        entityId: 'preview-order-id',
        entityName: 'TEST-ORDER-OVERAGE',
        redisContainer: 'pps-redis',
        redisPassword: 'bitnami',
        redisHost: 'localhost',
        redisPort: 6790,
      }),
    [resellerMerchantId, resellerAmount],
  )

  const redisPreviewPayload = useMemo(() => {
    const handoff = paymentResult?.paymentHandoff
    if (!handoff) return null
    return buildSucceededPaymentEventFromHandoff(handoff)
  }, [paymentResult])

  const livePreview = useMemo(() => {
    if (previewKind === 'redis' && redisPreviewPayload) {
      return { title: 'Redis payment event preview', payload: redisPreviewPayload }
    }
    if (previewKind === 'reseller') {
      return { title: 'Reseller overage event preview', payload: resellerPreviewPayload }
    }
    if (previewKind === 'payment') {
      return { title: 'Manual overage payment preview', payload: {} }
    }
    return { title: 'Overage history query preview', payload: OVERAGE_LIST_QUERY }
  }, [previewKind, redisPreviewPayload, resellerPreviewPayload])

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Merchant billing"
        title="Overage testing"
        description="End-to-end workspace for usage overage, auto-charge thresholds, manual payment, reseller events, and renewal merge scenarios."
        apiEndpoint="usage-tracking · overage-tracking · Redis reseller stream"
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
          <Typography color="text.secondary">Loading overage context…</Typography>
        </Stack>
      )}

      {!loading && error != null && (
        <ApiErrorAlert error={error} action={<Button onClick={() => void loadAll()}>Retry</Button>} />
      )}

      {!loading && !subscriptionData && (
        <Alert severity="info">
          No active subscription found.{' '}
          <RouterLink to="/merchant/plans">Purchase a plan</RouterLink> with overage-enabled attributes
          first.
        </Alert>
      )}

      {!loading && subscription && plan && (
        <>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
                <WarningAmberIcon color="warning" />
                <Typography variant="h6">Overage context</Typography>
                {subscription.isThresholdReached && (
                  <Chip label="Max threshold reached" size="small" color="error" />
                )}
              </Stack>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Auto-charge amount
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatMoney(plan.baseCurrency, plan.overageAutoChargeAmount)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Max allowed overage
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatMoney(plan.baseCurrency, plan.overageMaxAllowedAmount)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    History totals
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    PAID {formatMoney(plan.baseCurrency, overageTotals.amountPaid)} · PROCESSING{' '}
                    {formatMoney(plan.baseCurrency, overageTotals.amountProcessing)} · FAILED{' '}
                    {formatMoney(plan.baseCurrency, overageTotals.amountFailed)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Overage-enabled attributes
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {overageEnabledAttributes.length} of {subscription.limitsAndUsages.length}
                  </Typography>
                </Grid>
              </Grid>

              {overageEnabledAttributes.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Attribute</TableCell>
                        <TableCell align="right">Used</TableCell>
                        <TableCell align="right">Limit</TableCell>
                        <TableCell>Overage</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {subscription.limitsAndUsages.map((row) => (
                        <TableRow key={row.usageId}>
                          <TableCell>{row.attributeCode}</TableCell>
                          <TableCell align="right">{row.usedCount.toLocaleString()}</TableCell>
                          <TableCell align="right">
                            {row.usageLimit?.toLocaleString() ?? '∞'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={row.overageEnabled ? 'Enabled' : 'Disabled'}
                              size="small"
                              color={row.overageEnabled ? 'warning' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="warning">
                  No overage-enabled attributes on this plan. Create or switch to a plan with overage
                  pricing on at least one attribute.
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Single usage overage flow
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Validate → log → confirm to record one usage unit. Overage is calculated asynchronously
                after confirm when usage exceeds the limit.
              </Typography>
              <UsageSimulationPanel
                merchantSubscriptionId={subscription.subscriptionId}
                limitsAndUsages={subscription.limitsAndUsages}
                refreshingUsage={refreshingUsage}
                onUsageUpdated={refreshUsage}
                initialAttributeCode={bulkAttributeCode}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Bulk overage generation
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Run multiple validate → log → confirm cycles to accumulate pending overage and trigger
                auto-charge settlement when total pending reaches{' '}
                {formatMoney(plan.baseCurrency, plan.overageAutoChargeAmount)}.
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, md: 5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Overage-enabled attribute</InputLabel>
                    <Select
                      label="Overage-enabled attribute"
                      value={bulkAttributeCode}
                      onChange={(event) => setBulkAttributeCode(event.target.value)}
                    >
                      {overageEnabledAttributes.length === 0 && (
                        <MenuItem value="" disabled>
                          No overage-enabled attributes
                        </MenuItem>
                      )}
                      {overageEnabledAttributes.map((row) => (
                        <MenuItem key={row.attributeCode} value={row.attributeCode}>
                          {row.attributeCode} ({row.usedCount}/{row.usageLimit ?? '∞'})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Count"
                    type="number"
                    value={bulkCount}
                    onChange={(event) => setBulkCount(event.target.value)}
                    slotProps={{ htmlInput: { min: 1, max: 100 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Button
                    variant="contained"
                    disabled={bulkRunning || !bulkAttributeCode || overageEnabledAttributes.length === 0}
                    startIcon={
                      bulkRunning ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />
                    }
                    onClick={() => void handleBulkGenerate()}
                  >
                    {bulkRunning && bulkProgress
                      ? `Generating ${bulkProgress.done}/${bulkProgress.total}…`
                      : 'Generate overage usage'}
                  </Button>
                </Grid>
              </Grid>

              {bulkResult && <Alert severity="success">{bulkResult}</Alert>}
              {bulkError && <Alert severity="error">{bulkError}</Alert>}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Reseller overage (Redis)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Publish <code>ResellerOverageRequested</code> to{' '}
                <code>{RESELLER_OVERAGE_REQUESTED_STREAM}</code>. Requires{' '}
                <code>MESSAGING_PROVIDER=redis</code>.
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, md: 5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Merchant ID"
                    value={resellerMerchantId}
                    onChange={(event) => {
                      setPreviewKind('reseller')
                      setResellerMerchantId(event.target.value)
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Overage amount"
                    type="number"
                    value={resellerAmount}
                    onChange={(event) => {
                      setPreviewKind('reseller')
                      setResellerAmount(event.target.value)
                    }}
                    slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Button
                    variant="outlined"
                    disabled={resellerPublishing}
                    onClick={() => void handleResellerPublish()}
                  >
                    {resellerPublishing ? 'Publishing…' : 'Publish reseller overage'}
                  </Button>
                </Grid>
              </Grid>
              {resellerMessage && <Alert severity="success">{resellerMessage}</Alert>}
              {resellerError && <Alert severity="error">{resellerError}</Alert>}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ mb: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
              >
                <Box>
                  <Typography variant="h6">Overage history & payment</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {failedOverageCount > 0
                      ? `${failedOverageCount} FAILED record(s) eligible for manual payment`
                      : 'Manual payment reclaims FAILED overage history rows'}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    startIcon={
                      paying ? <CircularProgress size={16} color="inherit" /> : <PaymentIcon />
                    }
                    disabled={paying}
                    onClick={() => void handleManualPayment()}
                  >
                    Manual overage payment
                  </Button>
                  <Button component={RouterLink} to="/merchant/invoices" variant="text" size="small">
                    All invoices
                  </Button>
                </Stack>
              </Stack>

              {paymentResult && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {paymentResult.message}
                  {paymentResult.paymentHandoff && (
                    <>
                      {' '}
                      — Invoice {paymentResult.paymentHandoff.invoiceNumber} (
                      {formatMoney(
                        paymentResult.paymentHandoff.currency,
                        paymentResult.paymentHandoff.grandTotal,
                      )}
                      )
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          disabled={confirmingPayment}
                          onClick={() => void handleConfirmPayment()}
                        >
                          {confirmingPayment ? 'Confirming…' : 'Confirm payment (Redis)'}
                        </Button>
                        <Button
                          size="small"
                          component={RouterLink}
                          to="/dev/payment-confirm"
                          variant="outlined"
                        >
                          Payment confirm page
                        </Button>
                      </Stack>
                    </>
                  )}
                  {paymentResult.checkoutUrl && (
                    <CheckoutSessionActions checkoutUrl={paymentResult.checkoutUrl} />
                  )}
                </Alert>
              )}
              {paymentConfirmMessage && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {paymentConfirmMessage}
                </Alert>
              )}
              {paymentError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {paymentError}
                </Alert>
              )}

              {overageHistory.length === 0 ? (
                <Alert severity="info">No overage history yet. Generate usage or publish reseller overage.</Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Attribute</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {overageHistory.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{row.overageType}</TableCell>
                          <TableCell>{row.attributeName ?? row.attributeCode ?? '—'}</TableCell>
                          <TableCell align="right">{formatMoney('USD', row.overageAmount)}</TableCell>
                          <TableCell>
                            <Chip
                              label={row.status}
                              size="small"
                              color={overageStatusColor(row.status)}
                            />
                          </TableCell>
                          <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                          <TableCell>
                            {row.invoiceId && (
                              <Button
                                size="small"
                                component={RouterLink}
                                to={`/merchant/invoices/${row.invoiceId}`}
                              >
                                Invoice
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary">
                Renewal merge: pending/failed overage is included in renewal invoices. Test via{' '}
                <RouterLink to="/merchant/renewal-testing">Renewal Testing</RouterLink>.
              </Typography>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Scenario playbook
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
            <Chip
              label="All"
              clickable
              color={scenarioFilter === 'all' ? 'primary' : 'default'}
              onClick={() => setScenarioFilter('all')}
            />
            {(Object.keys(overageScenarioCategoryLabels) as OverageScenarioCategory[]).map((key) => (
              <Chip
                key={key}
                label={overageScenarioCategoryLabels[key]}
                clickable
                color={scenarioFilter === key ? 'primary' : 'default'}
                onClick={() => setScenarioFilter(key)}
              />
            ))}
          </Stack>

          {filteredScenarios.map((scenario) => (
            <Accordion key={scenario.id} disableGutters sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2">{scenario.title}</Typography>
                  <Chip
                    label={overageScenarioCategoryLabels[scenario.category]}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {scenario.description}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Preparation
                </Typography>
                <Box component="ul" sx={{ mt: 0.5, mb: 1, pl: 2 }}>
                  {scenario.prepSteps.map((step) => (
                    <Typography key={step} component="li" variant="body2">
                      {step}
                    </Typography>
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Expected outcome
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {scenario.expectedOutcome}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                  {scenario.apiEndpoints.map((endpoint) => (
                    <Chip key={endpoint} label={endpoint} size="small" variant="outlined" />
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </CardContent>
      </Card>

      <ApiTransactionInspector
        livePayload={livePreview.payload}
        livePayloadTitle={livePreview.title}
        transaction={transaction}
      />
    </Stack>
  )
}
