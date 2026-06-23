import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PaymentIcon from '@mui/icons-material/Payment'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RefreshIcon from '@mui/icons-material/Refresh'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import SpeedIcon from '@mui/icons-material/Speed'
import TuneIcon from '@mui/icons-material/Tune'
import {
  getInvoiceById,
  getMerchantAttributeCart,
  purchaseAttributeCart,
  upsertAttributeCart,
} from '../../api/merchant'
import { DEFAULT_REDIS_CONNECTION, publishToRedisStream } from '../../api/redisDevTools'
import { UsageSimulationPanel } from '../merchant/UsageSimulationPanel'
import type {
  ActiveSubscriptionResponse,
  MerchantAttributePurchaseResult,
  PlanDetailFeatureAttribute,
  SubscriptionLimitAndUsage,
} from '../../types/subscription'
import { PriceType } from '../../types/subscription'
import { ApiErrorAlert } from '../ApiErrorAlert'
import {
  extractSubscribedPlanAttributes,
  type SubscribedPlanAttributeItem,
} from '../../utils/attributeChangeBuilder'
import {
  defaultAddonAttributeValue,
  validateAddonAttributeValue,
} from '../../utils/addonBuilder'
import { buildAttributePurchasePayload, defaultBillingAddress } from '../../utils/billingAddress'
import { formatDateTime, formatMoney, formatUsageLimit } from '../../utils/planDisplay'
import {
  buildSucceededPaymentEventFromHandoff,
  saveLastPaymentHandoff,
} from '../../utils/paymentEventBuilder'

interface NitroActiveSubscriptionWorkspaceProps {
  activeSubscription: ActiveSubscriptionResponse
  onRefresh: () => Promise<void>
  refreshing?: boolean
}

function usageProgressPercent(row: SubscriptionLimitAndUsage): number | null {
  if (row.usageType.toUpperCase() === 'UNLIMITED' || row.usageLimit == null || row.usageLimit <= 0) {
    return null
  }

  return Math.min(100, Math.round((row.usedCount / row.usageLimit) * 100))
}

function LimitValueField({
  attribute,
  value,
  disabled,
  onChange,
}: {
  attribute: PlanDetailFeatureAttribute
  value: number
  disabled: boolean
  onChange: (value: number) => void
}) {
  const config = attribute.attributeConfig
  const label = 'New limit'

  if (config.priceType === PriceType.VOLUME_PRICE) {
    const tiers = config.volumePrice ?? []
    return (
      <FormControl fullWidth size="small" disabled={disabled}>
        <InputLabel>{label}</InputLabel>
        <Select
          label={label}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        >
          {tiers.map((tier) => (
            <MenuItem key={tier.count} value={tier.count}>
              {tier.count}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    )
  }

  return (
    <TextField
      fullWidth
      size="small"
      type="number"
      label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  )
}

export function NitroActiveSubscriptionWorkspace({
  activeSubscription,
  onRefresh,
  refreshing = false,
}: NitroActiveSubscriptionWorkspaceProps) {
  const { subscription, plan } = activeSubscription
  const limitsAndUsages = subscription.limitsAndUsages

  const planAttributes = useMemo(() => extractSubscribedPlanAttributes(plan), [plan])

  const planAttributeById = useMemo(() => {
    const map = new Map<string, SubscribedPlanAttributeItem>()
    for (const item of planAttributes) {
      map.set(item.planFeatureAttributeId, item)
    }
    return map
  }, [planAttributes])

  const [selectedAttributeCode, setSelectedAttributeCode] = useState('')
  const [newLimit, setNewLimit] = useState(0)
  const [limitBusy, setLimitBusy] = useState(false)
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [limitError, setLimitError] = useState<unknown>(null)
  const [limitMessage, setLimitMessage] = useState<string | null>(null)
  const [attributePurchaseResult, setAttributePurchaseResult] =
    useState<MerchantAttributePurchaseResult | null>(null)

  const selectedUsageRow = limitsAndUsages.find((row) => row.attributeCode === selectedAttributeCode)
  const selectedPlanItem = selectedUsageRow
    ? planAttributeById.get(selectedUsageRow.planFeatureAttributeId)
    : undefined

  useEffect(() => {
    if (limitsAndUsages.length === 0) {
      setSelectedAttributeCode('')
      return
    }

    const stillValid = limitsAndUsages.some((row) => row.attributeCode === selectedAttributeCode)
    if (!stillValid) {
      setSelectedAttributeCode(limitsAndUsages[0].attributeCode)
    }
  }, [limitsAndUsages, selectedAttributeCode])

  useEffect(() => {
    if (!selectedPlanItem || !selectedUsageRow) {
      return
    }

    const baseline =
      selectedUsageRow.usageLimit ?? defaultAddonAttributeValue(selectedPlanItem.attribute)
    setNewLimit(baseline)
    setLimitError(null)
    setLimitMessage(null)
    setAttributePurchaseResult(null)
  }, [selectedPlanItem, selectedUsageRow])

  const handleSelectAttribute = (attributeCode: string) => {
    setSelectedAttributeCode(attributeCode)
    setLimitError(null)
    setLimitMessage(null)
    setAttributePurchaseResult(null)
  }

  const validateLimitChange = (): string[] => {
    if (!selectedPlanItem || !selectedUsageRow) {
      return ['Select an attribute first.']
    }

    const errors = validateAddonAttributeValue(selectedPlanItem.attribute, newLimit)
    const previousValue = selectedUsageRow.usageLimit
    if (previousValue != null && newLimit === previousValue) {
      errors.push(
        `New limit must differ from the current limit (${previousValue.toLocaleString()}).`,
      )
    }

    return errors
  }

  const handleAddLimitToCart = async () => {
    if (!selectedPlanItem) return

    const validationErrors = validateLimitChange()
    if (validationErrors.length > 0) {
      setLimitError(validationErrors.join(' '))
      return
    }

    setLimitBusy(true)
    setLimitError(null)
    setLimitMessage(null)
    setAttributePurchaseResult(null)

    try {
      const result = await upsertAttributeCart({
        features: [
          {
            planFeatureId: selectedPlanItem.planFeatureId,
            attributes: [
              {
                planFeatureAttributeId: selectedPlanItem.planFeatureAttributeId,
                value: newLimit,
              },
            ],
          },
        ],
      })
      await getMerchantAttributeCart()
      setLimitMessage(result.message)
    } catch (error) {
      setLimitError(error)
    } finally {
      setLimitBusy(false)
    }
  }

  const handlePurchaseLimitChange = async () => {
    if (!selectedPlanItem) return

    const validationErrors = validateLimitChange()
    if (validationErrors.length > 0) {
      setLimitError(validationErrors.join(' '))
      return
    }

    setLimitBusy(true)
    setLimitError(null)
    setLimitMessage(null)
    setAttributePurchaseResult(null)

    try {
      await upsertAttributeCart({
        features: [
          {
            planFeatureId: selectedPlanItem.planFeatureId,
            attributes: [
              {
                planFeatureAttributeId: selectedPlanItem.planFeatureAttributeId,
                value: newLimit,
              },
            ],
          },
        ],
      })

      const result = await purchaseAttributeCart(buildAttributePurchasePayload(defaultBillingAddress))
      if (result.paymentHandoff) {
        saveLastPaymentHandoff(result.paymentHandoff)
      }
      setAttributePurchaseResult(result)
      setLimitMessage(result.message)
    } catch (error) {
      setLimitError(error)
    } finally {
      setLimitBusy(false)
    }
  }

  const handleConfirmAttributePayment = async () => {
    if (!attributePurchaseResult?.paymentHandoff) return

    setConfirmingPayment(true)
    setLimitError(null)

    try {
      const handoff = attributePurchaseResult.paymentHandoff
      let merchantId: string | undefined

      try {
        const invoice = await getInvoiceById(handoff.invoiceId)
        merchantId = invoice.merchantId
      } catch {
        // Fall back to default merchant id in payment event builder.
      }

      const event = buildSucceededPaymentEventFromHandoff({
        ...handoff,
        merchantId,
      })

      await publishToRedisStream(event, { redis: DEFAULT_REDIS_CONNECTION })
      setLimitMessage('Payment confirmed via Redis. Attribute limit change should be applied shortly.')
      await onRefresh()
    } catch (error) {
      setLimitError(error)
    } finally {
      setConfirmingPayment(false)
    }
  }

  const canConfirmAttributePayment =
    Boolean(attributePurchaseResult?.paymentHandoff) && !limitBusy && !confirmingPayment

  if (limitsAndUsages.length === 0) {
    return (
      <Alert severity="info">
        No INCLUDED attribute usage rows on this subscription. Attribute limits and usage simulation
        appear after the plan includes trackable attributes.
      </Alert>
    )
  }

  return (
    <Stack spacing={2.5}>
      <Divider />

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <SpeedIcon color="primary" fontSize="small" />
          <Typography variant="h6">Subscription attributes</Typography>
          <Chip label={`${limitsAndUsages.length} attributes`} size="small" variant="outlined" />
        </Stack>
        <Button
          size="small"
          variant="outlined"
          startIcon={refreshing ? <CircularProgress size={14} /> : <RefreshIcon />}
          onClick={() => void onRefresh()}
          disabled={refreshing}
        >
          Refresh usage
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Select an attribute to change its limit or run the validate → log → confirm usage lifecycle.
      </Typography>

      {subscription.isThresholdReached && (
        <Alert severity="warning">
          Usage threshold has been reached on this subscription. Overage rules may apply.
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Attribute</TableCell>
                  <TableCell>Usage type</TableCell>
                  <TableCell>Consumption</TableCell>
                  <TableCell>Overage</TableCell>
                  <TableCell>Last updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {limitsAndUsages.map((row) => {
                  const progress = usageProgressPercent(row)
                  const isSelected = row.attributeCode === selectedAttributeCode

                  return (
                    <TableRow
                      key={row.usageId}
                      hover
                      selected={isSelected}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleSelectAttribute(row.attributeCode)}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 600 }}>
                          {row.attributeCode}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {row.planFeatureAttributeId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={row.usageType} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ minWidth: 200 }}>
                        <Typography variant="body2">
                          {formatUsageLimit(
                            row.usageType,
                            row.usedCount,
                            row.usageLimit,
                            row.scheduledUsageLimit,
                          )}
                        </Typography>
                        {row.scheduledUsageLimit != null &&
                          row.scheduledUsageLimit !== row.usageLimit && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Scheduled: {row.scheduledUsageLimit.toLocaleString()}
                            </Typography>
                          )}
                        {progress != null && (
                          <Box sx={{ mt: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              color={progress >= 90 ? 'warning' : 'primary'}
                            />
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.overageEnabled ? 'Enabled' : 'Disabled'}
                          size="small"
                          color={row.overageEnabled ? 'warning' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{formatDateTime(row.updatedAt)}</Typography>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {selectedUsageRow && (
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <TuneIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Change limit · {selectedUsageRow.attributeCode}
                  </Typography>
                </Stack>

                {subscription.isTrial && (
                  <Alert severity="warning">
                    Trial subscriptions cannot purchase attribute limit changes. End the trial or
                    upgrade to a paid plan first.
                  </Alert>
                )}

                {!selectedPlanItem && (
                  <Alert severity="info">
                    Plan attribute metadata is not available for this row. Usage simulation still
                    works below.
                  </Alert>
                )}

                {selectedPlanItem && (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      {selectedPlanItem.featureName} · {selectedPlanItem.attributeName}
                      {selectedUsageRow.usageLimit != null && (
                        <>
                          {' '}
                          · Current limit: {selectedUsageRow.usageLimit.toLocaleString()}
                        </>
                      )}
                    </Typography>

                    <LimitValueField
                      attribute={selectedPlanItem.attribute}
                      value={newLimit}
                      disabled={limitBusy || subscription.isTrial}
                      onChange={setNewLimit}
                    />

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }}>
                      <Button
                        variant="outlined"
                        startIcon={
                          limitBusy ? <CircularProgress size={16} /> : <ShoppingCartIcon />
                        }
                        onClick={() => void handleAddLimitToCart()}
                        disabled={limitBusy || confirmingPayment || subscription.isTrial}
                      >
                        Add to attribute cart
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={limitBusy ? <CircularProgress size={16} /> : <PaymentIcon />}
                        onClick={() => void handlePurchaseLimitChange()}
                        disabled={limitBusy || confirmingPayment || subscription.isTrial}
                      >
                        Purchase limit change
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={
                          confirmingPayment ? <CircularProgress size={16} /> : <CheckCircleIcon />
                        }
                        onClick={() => void handleConfirmAttributePayment()}
                        disabled={!canConfirmAttributePayment}
                      >
                        Confirm payment
                      </Button>
                    </Stack>

                    {attributePurchaseResult?.paymentHandoff && (
                      <Alert severity="info">
                        Invoice {attributePurchaseResult.paymentHandoff.invoiceNumber} (
                        {formatMoney(
                          attributePurchaseResult.paymentHandoff.currency,
                          attributePurchaseResult.paymentHandoff.grandTotal,
                        )}
                        ) · Publish payment success to Redis to apply the limit change.
                      </Alert>
                    )}

                    {attributePurchaseResult && !attributePurchaseResult.paymentHandoff && (
                      <Alert severity="success">
                        No payment required for this change. Refresh usage to see updated limits.
                      </Alert>
                    )}
                  </>
                )}

                {limitError != null && <ApiErrorAlert error={limitError} />}
                {limitMessage && <Alert severity="success">{limitMessage}</Alert>}
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <PlayArrowIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Usage simulation · {selectedUsageRow.attributeCode}
                  </Typography>
                </Stack>

                <UsageSimulationPanel
                  key={selectedUsageRow.attributeCode}
                  merchantSubscriptionId={subscription.subscriptionId}
                  limitsAndUsages={limitsAndUsages}
                  refreshingUsage={refreshing}
                  onUsageUpdated={onRefresh}
                  initialAttributeCode={selectedUsageRow.attributeCode}
                  hideCurrentUsageTable
                  hideAttributePicker
                />
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}
    </Stack>
  )
}
