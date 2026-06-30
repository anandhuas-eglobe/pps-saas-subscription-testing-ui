import { useCallback, useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import CancelScheduleSendIcon from '@mui/icons-material/CancelScheduleSend'
import EventRepeatIcon from '@mui/icons-material/EventRepeat'
import PaymentIcon from '@mui/icons-material/Payment'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import { Link as RouterLink } from 'react-router-dom'
import {
  cancelScheduledSubscriptionDowngrade,
  cancelSubscriptionAutoRenew,
  getManualSubscriptionRenewalPreview,
  getScheduledSubscriptionDowngrade,
  initiateManualRenewal,
} from '../../api/merchant'
import { ApiRequestError } from '../../api/client'
import type {
  ActiveSubscriptionResponse,
  BillingAddress,
  ManualRenewalResponse,
  ManualSubscriptionRenewalPreviewResponse,
  ScheduledSubscriptionDowngradeResponse,
} from '../../types/subscription'
import {
  buildInitiateManualRenewalPayload,
  defaultBillingAddress,
} from '../../utils/billingAddress'
import { formatDateOnly, formatMoney } from '../../utils/planDisplay'
import { saveLastPaymentHandoff } from '../../utils/paymentEventBuilder'
import {
  checkManualRenewalEligibility,
  resolveManualRenewalEligibleState,
} from '../../utils/renewalEligibility'
import { BillingAddressFields } from './BillingAddressFields'
import { ApiTransactionInspector } from '../ApiTransactionInspector'
import { useApiTransaction } from '../../hooks/useApiTransaction'

interface SubscriptionManagementPanelProps {
  subscriptionData: ActiveSubscriptionResponse
  onChanged?: () => void
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  )
}

function PricingPreviewCard({
  pricing,
  title,
}: {
  pricing: { subtotal: number; currency: string; taxAmount: number; grandTotal: number; lines: { lineItemName: string; quantity: number | null; unitPrice: number | null; subTotal: number }[] }
  title: string
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {title}
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Line item</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Unit</TableCell>
                <TableCell align="right">Subtotal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pricing.lines.map((line) => (
                <TableRow key={line.lineItemName}>
                  <TableCell>{line.lineItemName}</TableCell>
                  <TableCell align="right">{line.quantity ?? '—'}</TableCell>
                  <TableCell align="right">
                    {line.unitPrice != null ? formatMoney(pricing.currency, line.unitPrice) : '—'}
                  </TableCell>
                  <TableCell align="right">{formatMoney(pricing.currency, line.subTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Stack direction="row" spacing={2} sx={{ mt: 2, justifyContent: 'flex-end' }}>
          <Typography variant="body2" color="text.secondary">
            Subtotal: {formatMoney(pricing.currency, pricing.subtotal)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tax: {formatMoney(pricing.currency, pricing.taxAmount)}
          </Typography>
          <Typography variant="subtitle2">
            Total: {formatMoney(pricing.currency, pricing.grandTotal)}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}

export function SubscriptionManagementPanel({
  subscriptionData,
  onChanged,
}: SubscriptionManagementPanelProps) {
  const { subscription } = subscriptionData

  const [downgrade, setDowngrade] = useState<ScheduledSubscriptionDowngradeResponse | null>(null)
  const [downgradeLoading, setDowngradeLoading] = useState(true)
  const [downgradeNotFound, setDowngradeNotFound] = useState(false)
  const [downgradeError, setDowngradeError] = useState<string | null>(null)

  const [renewalPreview, setRenewalPreview] = useState<ManualSubscriptionRenewalPreviewResponse | null>(
    null,
  )
  const [renewalLoading, setRenewalLoading] = useState(true)
  const [renewalError, setRenewalError] = useState<string | null>(null)

  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [cancellingDowngrade, setCancellingDowngrade] = useState(false)
  const [cancellingAutoRenew, setCancellingAutoRenew] = useState(false)

  const [billingAddress, setBillingAddress] = useState<BillingAddress>(defaultBillingAddress)
  const [includeBillingAddress, setIncludeBillingAddress] = useState(false)
  const [initiatingRenewal, setInitiatingRenewal] = useState(false)
  const [renewalResult, setRenewalResult] = useState<ManualRenewalResponse | null>(null)
  const [renewalInitError, setRenewalInitError] = useState<string | null>(null)

  const { transaction, execute } = useApiTransaction()

  const manualRecoveryState = resolveManualRenewalEligibleState(subscription)
  const manualRecoveryCheck = checkManualRenewalEligibility(subscription)

  const livePayload = useMemo(
    () => buildInitiateManualRenewalPayload(billingAddress, includeBillingAddress),
    [billingAddress, includeBillingAddress],
  )

  const loadDowngrade = useCallback(async () => {
    setDowngradeLoading(true)
    setDowngradeError(null)
    setDowngradeNotFound(false)
    try {
      const result = await execute(
        {},
        () => getScheduledSubscriptionDowngrade(),
        'GET /api/v1/merchant/subscription/downgrade/schedule',
      )
      setDowngrade(result)
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setDowngradeNotFound(true)
        setDowngrade(null)
        return
      }
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load scheduled downgrade'
      setDowngradeError(message)
      setDowngrade(null)
    } finally {
      setDowngradeLoading(false)
    }
  }, [execute])

  const loadRenewalPreview = useCallback(async () => {
    setRenewalLoading(true)
    setRenewalError(null)
    try {
      const result = await execute(
        {},
        () => getManualSubscriptionRenewalPreview(),
        'GET /api/v1/merchant/subscription/renewal/preview',
      )
      setRenewalPreview(result)
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load renewal preview'
      setRenewalError(message)
      setRenewalPreview(null)
    } finally {
      setRenewalLoading(false)
    }
  }, [execute])

  useEffect(() => {
    void loadDowngrade()
    void loadRenewalPreview()
  }, [loadDowngrade, loadRenewalPreview])

  const handleCancelDowngrade = async () => {
    setCancellingDowngrade(true)
    setActionError(null)
    setActionMessage(null)
    try {
      const result = await execute(
        {},
        () => cancelScheduledSubscriptionDowngrade(),
        'POST /api/v1/merchant/subscription/downgrade/schedule/cancel',
      )
      setActionMessage(result.message)
      setDowngrade(null)
      setDowngradeNotFound(true)
      onChanged?.()
      void loadRenewalPreview()
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to cancel scheduled downgrade'
      setActionError(message)
    } finally {
      setCancellingDowngrade(false)
    }
  }

  const handleCancelAutoRenew = async () => {
    setCancellingAutoRenew(true)
    setActionError(null)
    setActionMessage(null)
    try {
      const result = await execute(
        {},
        () => cancelSubscriptionAutoRenew(),
        'PUT /api/v1/merchant/subscription/auto-renew/cancel',
      )
      setActionMessage(result.message)
      onChanged?.()
      void loadRenewalPreview()
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to disable auto-renew'
      setActionError(message)
    } finally {
      setCancellingAutoRenew(false)
    }
  }

  const handleInitiateManualRenewal = async () => {
    setInitiatingRenewal(true)
    setRenewalInitError(null)
    setRenewalResult(null)
    setActionError(null)
    setActionMessage(null)
    try {
      const payload = buildInitiateManualRenewalPayload(billingAddress, includeBillingAddress)
      const result = await execute(
        payload,
        () => initiateManualRenewal(payload),
        'POST /api/v1/merchant/subscription/renew',
      )
      setRenewalResult(result)
      setActionMessage(result.message)
      if (result.paymentHandoff) {
        saveLastPaymentHandoff(result.paymentHandoff)
      }
      onChanged?.()
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to initiate manual renewal'
      setRenewalInitError(message)
    } finally {
      setInitiatingRenewal(false)
    }
  }

  return (
    <Stack spacing={3}>
      {actionMessage && <Alert severity="success">{actionMessage}</Alert>}
      {actionError && <Alert severity="error">{actionError}</Alert>}

      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
            <EventRepeatIcon color="primary" fontSize="small" />
            <Typography variant="h6">Auto-renew</Typography>
            <Chip
              label={subscription.autoRenew ? 'Enabled' : 'Disabled'}
              size="small"
              color={subscription.autoRenew ? 'success' : 'default'}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Disable auto-renew on the active subscription. Manual renewal preview becomes available
            when auto-renew is off and no plan downgrade is scheduled.
          </Typography>
          <Button
            variant="outlined"
            color="warning"
            disabled={!subscription.autoRenew || cancellingAutoRenew}
            onClick={() => void handleCancelAutoRenew()}
          >
            {cancellingAutoRenew ? 'Disabling…' : 'Disable auto-renew'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
            <TrendingDownIcon color="primary" fontSize="small" />
            <Typography variant="h6">Scheduled plan downgrade</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            GET /api/v1/merchant/subscription/downgrade/schedule · POST
            /api/v1/merchant/subscription/downgrade/schedule/cancel
          </Typography>

          {downgradeLoading && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <CircularProgress size={20} />
              <Typography color="text.secondary">Loading scheduled downgrade…</Typography>
            </Stack>
          )}

          {!downgradeLoading && downgradeError && (
            <Alert severity="error" action={<Button onClick={() => void loadDowngrade()}>Retry</Button>}>
              {downgradeError}
            </Alert>
          )}

          {!downgradeLoading && downgradeNotFound && (
            <Alert severity="info">No scheduled plan downgrade for this merchant.</Alert>
          )}

          {!downgradeLoading && downgrade && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <DetailField
                    label="Scheduled date"
                    value={formatDateOnly(downgrade.scheduledChange.scheduledDate)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <DetailField label="Target plan" value={downgrade.plan.planName} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <DetailField label="Billing cycle" value={downgrade.scheduledChange.billingCycle} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <DetailField
                    label="Auto-renew after downgrade"
                    value={downgrade.scheduledChange.autoRenew ? 'Yes' : 'No'}
                  />
                </Grid>
              </Grid>

              {downgrade.limitsAndUsages.length > 0 && (
                <>
                  <Divider />
                  <Typography variant="subtitle2">Projected limits after downgrade</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Attribute</TableCell>
                          <TableCell align="right">Used</TableCell>
                          <TableCell align="right">New limit</TableCell>
                          <TableCell>Overage</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {downgrade.limitsAndUsages.map((row) => (
                          <TableRow key={row.planFeatureAttributeId}>
                            <TableCell>{row.attributeCode}</TableCell>
                            <TableCell align="right">{row.usedCount.toLocaleString()}</TableCell>
                            <TableCell align="right">{row.usageLimit.toLocaleString()}</TableCell>
                            <TableCell>{row.overageEnabled ? 'Yes' : 'No'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              <PricingPreviewCard
                pricing={downgrade.pricing}
                title="Estimated first billing cycle on downgraded plan"
              />

              <Button
                variant="outlined"
                color="warning"
                startIcon={<CancelScheduleSendIcon />}
                disabled={cancellingDowngrade}
                onClick={() => void handleCancelDowngrade()}
              >
                {cancellingDowngrade ? 'Cancelling…' : 'Cancel scheduled downgrade'}
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
            <EventRepeatIcon color="primary" fontSize="small" />
            <Typography variant="h6">Manual renewal preview</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            GET /api/v1/merchant/subscription/renewal/preview
          </Typography>

          {renewalLoading && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <CircularProgress size={20} />
              <Typography color="text.secondary">Loading renewal preview…</Typography>
            </Stack>
          )}

          {!renewalLoading && renewalError && (
            <Alert
              severity="error"
              action={<Button onClick={() => void loadRenewalPreview()}>Retry</Button>}
            >
              {renewalError}
            </Alert>
          )}

          {!renewalLoading && renewalPreview && !renewalPreview.available && (
            <Alert severity="info">
              <Typography variant="subtitle2" gutterBottom>
                Renewal preview unavailable
              </Typography>
              <Typography variant="body2">
                {renewalPreview.message} ({renewalPreview.reason})
              </Typography>
            </Alert>
          )}

          {!renewalLoading && renewalPreview?.available && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <DetailField
                    label="Current end date"
                    value={formatDateOnly(renewalPreview.subscription.endDate)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <DetailField label="Plan" value={renewalPreview.plan.planName} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <DetailField label="Billing cycle" value={renewalPreview.subscription.billingCycle} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <DetailField label="Status" value={renewalPreview.subscription.status} />
                </Grid>
              </Grid>
              <PricingPreviewCard
                pricing={renewalPreview.pricing}
                title="Estimated renewal cost for next billing cycle"
              />
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
            <PaymentIcon color="primary" fontSize="small" />
            <Typography variant="h6">Manual renewal recovery</Typography>
            {manualRecoveryState && (
              <Chip label={manualRecoveryState} size="small" color="warning" />
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            POST /api/v1/merchant/subscription/renew — recovery checkout for RENEWAL_FAILED, grace
            period, or MERCHANT_CANCELLED subscriptions. For full scenario testing see{' '}
            <RouterLink to="/merchant/renewal-testing">Renewal Testing</RouterLink>.
          </Typography>

          {manualRecoveryCheck.eligible ? (
            <Stack spacing={2}>
              <Alert severity="warning">
                Subscription is eligible for manual recovery ({manualRecoveryState}).
              </Alert>
              <BillingAddressFields value={billingAddress} onChange={setBillingAddress} disabled={!includeBillingAddress} />
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Button
                  variant="contained"
                  disabled={initiatingRenewal}
                  onClick={() => void handleInitiateManualRenewal()}
                >
                  {initiatingRenewal ? 'Initiating…' : 'Initiate manual renewal'}
                </Button>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setIncludeBillingAddress((value) => !value)}
                >
                  {includeBillingAddress ? 'Omit billing address' : 'Include billing address'}
                </Button>
              </Stack>
              {renewalInitError && <Alert severity="error">{renewalInitError}</Alert>}
              {renewalResult && (
                <Alert severity="success">
                  {renewalResult.message} — Invoice {renewalResult.invoice.invoiceNumber} (
                  {formatMoney(renewalResult.invoice.currency, renewalResult.invoice.grandTotal)}) ·{' '}
                  {renewalResult.invoice.status}
                  {renewalResult.paymentHandoff && (
                    <>
                      {' '}
                      ·{' '}
                      <RouterLink to="/dev/payment-confirm">Confirm payment</RouterLink>
                    </>
                  )}
                </Alert>
              )}
            </Stack>
          ) : (
            <Alert severity="info">{manualRecoveryCheck.reasons.join(' ')}</Alert>
          )}
        </CardContent>
      </Card>

      <ApiTransactionInspector
        livePayload={livePayload}
        transaction={transaction}
        livePayloadTitle="Request preview"
      />
    </Stack>
  )
}
