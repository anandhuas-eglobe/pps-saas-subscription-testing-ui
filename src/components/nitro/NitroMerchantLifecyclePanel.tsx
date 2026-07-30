import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PaymentIcon from '@mui/icons-material/Payment'
import RefreshIcon from '@mui/icons-material/Refresh'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import StorefrontIcon from '@mui/icons-material/Storefront'
import VerifiedIcon from '@mui/icons-material/Verified'
import { Link as RouterLink } from 'react-router-dom'
import {
  getActiveSubscription,
  getInvoiceById,
  getMerchantCart,
  listMerchantPlans,
  purchasePlanCart,
  upsertMerchantCart,
} from '../../api/merchant'
import { getPlanById } from '../../api/plans'
import { ApiRequestError } from '../../api/client'
import { DEFAULT_REDIS_CONNECTION, publishToRedisStream } from '../../api/redisDevTools'
import { ActiveSubscriptionSummary } from '../merchant/ActiveSubscriptionSummary'
import { BillingAddressFields } from '../merchant/BillingAddressFields'
import { NitroActiveSubscriptionWorkspace } from './NitroActiveSubscriptionWorkspace'
import type {
  ActiveSubscriptionResponse,
  BillingAddress,
  BillingCycleValue,
  MerchantCartPreview,
  MerchantPlanPurchaseResult,
  PlanDetail,
} from '../../types/subscription'
import { BillingCycle, PlanStatus } from '../../types/subscription'
import { ApiErrorAlert } from '../ApiErrorAlert'
import {
  buildInitiatePurchasePayload,
  defaultBillingAddress,
  isBillingAddressComplete,
  requiresBillingAddressForCheckout,
} from '../../utils/billingAddress'
import { buildDefaultCartSelections } from '../../utils/cartBuilder'
import {
  fetchExistingPlanCart,
  hydratePlanCartFormState,
} from '../../utils/cartHydration'
import { formatMoney } from '../../utils/planDisplay'
import {
  buildSucceededPaymentEventFromHandoff,
  saveLastPaymentHandoff,
} from '../../utils/paymentEventBuilder'

type LifecycleStep = 'cart' | 'purchase' | 'confirm' | 'active' | null

export function NitroMerchantLifecyclePanel() {
  const [plans, setPlans] = useState<PlanDetail[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [plansError, setPlansError] = useState<string | null>(null)

  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [billingCycle, setBillingCycle] = useState<BillingCycleValue>(BillingCycle.MONTHLY)
  const [useTrial, setUseTrial] = useState(false)

  const [cartPreview, setCartPreview] = useState<MerchantCartPreview | null>(null)
  const [purchaseResult, setPurchaseResult] = useState<MerchantPlanPurchaseResult | null>(null)
  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscriptionResponse | null>(
    null,
  )

  const [busyStep, setBusyStep] = useState<LifecycleStep>(null)
  const [lastCompletedStep, setLastCompletedStep] = useState<LifecycleStep>(null)
  const [stepError, setStepError] = useState<unknown>(null)
  const [refreshingSubscription, setRefreshingSubscription] = useState(false)
  const [billingAddress, setBillingAddress] = useState<BillingAddress>(defaultBillingAddress)

  const activePlans = useMemo(
    () => plans.filter((plan) => plan.status === PlanStatus.ACTIVE),
    [plans],
  )

  const selectedPlan = useMemo(
    () => activePlans.find((plan) => plan.id === selectedPlanId) ?? null,
    [activePlans, selectedPlanId],
  )

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true)
    setPlansError(null)
    try {
      const result = await listMerchantPlans()
      setPlans(result.plans)
      setSelectedPlanId((current) => {
        if (current && result.plans.some((plan) => plan.id === current)) {
          return current
        }
        const firstActive = result.plans.find((plan) => plan.status === PlanStatus.ACTIVE)
        return firstActive?.id ?? ''
      })

      const existingCart = await fetchExistingPlanCart()
      if (existingCart) {
        let plan = result.plans.find((item) => item.id === existingCart.planId)
        if (!plan) {
          plan = await getPlanById(existingCart.planId)
          setPlans((current) =>
            current.some((item) => item.id === plan!.id) ? current : [...current, plan!],
          )
        }

        const formState = hydratePlanCartFormState(existingCart, plan)
        setSelectedPlanId(plan.id)
        setBillingCycle(formState.billingCycle)
        setUseTrial(formState.isTrial)
        setCartPreview(existingCart)
        setLastCompletedStep('cart')
      }
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.body.message ?? error.message
          : error instanceof Error
            ? error.message
            : 'Failed to load merchant plans'
      setPlansError(message)
      setPlans([])
    } finally {
      setLoadingPlans(false)
    }
  }, [])

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  useEffect(() => {
    if (!selectedPlan?.trial.enabled) {
      setUseTrial(false)
    }
  }, [selectedPlan])

  const resetFlowState = () => {
    setCartPreview(null)
    setPurchaseResult(null)
    setActiveSubscription(null)
    setLastCompletedStep(null)
    setStepError(null)
  }

  const handleAddToCart = async () => {
    if (!selectedPlan) return

    setBusyStep('cart')
    setStepError(null)

    try {
      const payload = useTrial
        ? { planId: selectedPlan.id, isTrial: true }
        : {
            planId: selectedPlan.id,
            billingCycle,
            features: buildDefaultCartSelections(selectedPlan),
          }

      await upsertMerchantCart(payload)
      const preview = await getMerchantCart()
      setCartPreview(preview)
      setPurchaseResult(null)
      setActiveSubscription(null)
      setLastCompletedStep('cart')
    } catch (error) {
      setStepError(error)
    } finally {
      setBusyStep(null)
    }
  }

  const handlePurchase = async () => {
    setBusyStep('purchase')
    setStepError(null)

    try {
      if (!cartPreview) {
        throw new Error('Add a plan to the cart first.')
      }

      const requiresBilling = requiresBillingAddressForCheckout({
        isTrial: cartPreview.isTrial,
        subscriptionAction: cartPreview.subscriptionAction,
      })
      const result = await purchasePlanCart(
        buildInitiatePurchasePayload(
          requiresBilling ? billingAddress : undefined,
          requiresBilling,
        ),
      )
      setPurchaseResult(result)
      if (result.paymentHandoff) {
        saveLastPaymentHandoff(result.paymentHandoff)
      }
      setActiveSubscription(null)
      setLastCompletedStep('purchase')
    } catch (error) {
      setStepError(error)
    } finally {
      setBusyStep(null)
    }
  }

  const handleConfirmPayment = async () => {
    if (!purchaseResult?.paymentHandoff) return

    setBusyStep('confirm')
    setStepError(null)

    try {
      const handoff = purchaseResult.paymentHandoff
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
      setLastCompletedStep('confirm')
    } catch (error) {
      setStepError(error)
    } finally {
      setBusyStep(null)
    }
  }

  const refreshActiveSubscription = useCallback(async () => {
    setRefreshingSubscription(true)
    setStepError(null)

    try {
      const result = await getActiveSubscription()
      setActiveSubscription(result)
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        setActiveSubscription(null)
        setStepError('No active subscription found.')
      } else {
        setStepError(error)
      }
    } finally {
      setRefreshingSubscription(false)
    }
  }, [])

  const handleViewActive = async () => {
    setBusyStep('active')
    setStepError(null)
    setActiveSubscription(null)

    try {
      const result = await getActiveSubscription()
      setActiveSubscription(result)
      setLastCompletedStep('active')
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        setStepError('No active subscription yet. Confirm payment and try again.')
      } else {
        setStepError(error)
      }
    } finally {
      setBusyStep(null)
    }
  }

  const requiresBillingForCart =
    cartPreview != null &&
    requiresBillingAddressForCheckout({
      isTrial: cartPreview.isTrial,
      subscriptionAction: cartPreview.subscriptionAction,
    })

  const canPurchase =
    Boolean(cartPreview) &&
    busyStep === null &&
    (!requiresBillingForCart || isBillingAddressComplete(billingAddress))
  const canConfirm = Boolean(purchaseResult?.paymentHandoff) && busyStep === null
  const isTrialCheckout = cartPreview?.isTrial === true

  return (
    <Card>
      <CardContent>
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <StorefrontIcon color="primary" />
              <Typography variant="h6">Merchant lifecycle</Typography>
            </Stack>
            <Button
              variant="outlined"
              size="small"
              startIcon={loadingPlans ? <CircularProgress size={14} /> : <RefreshIcon />}
              onClick={() => {
                resetFlowState()
                void loadPlans()
              }}
              disabled={loadingPlans}
            >
              Reload plans
            </Button>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            Quick end-to-end checkout: add default cart selections, purchase, publish payment success
            to Redis, then view the active subscription.
          </Typography>

          {plansError && (
            <Alert severity="error" action={<Button onClick={() => void loadPlans()}>Retry</Button>}>
              {plansError}
            </Alert>
          )}

          {loadingPlans && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <CircularProgress size={20} />
              <Typography color="text.secondary">Loading merchant plans…</Typography>
            </Stack>
          )}

          {!loadingPlans && activePlans.length === 0 && (
            <Alert severity="warning">
              No active merchant plans available. Activate a Nitro plan above, then reload.
            </Alert>
          )}

          {!loadingPlans && activePlans.length > 0 && (
            <>
              <GridLikePlanPicker
                selectedPlanId={selectedPlanId}
                billingCycle={billingCycle}
                useTrial={useTrial}
                selectedPlan={selectedPlan}
                activePlans={activePlans}
                onPlanChange={(planId) => {
                  setSelectedPlanId(planId)
                  resetFlowState()
                }}
                onBillingCycleChange={setBillingCycle}
                onUseTrialChange={setUseTrial}
              />

              <Divider />

              <Stack
                direction={{ xs: 'column', lg: 'row' }}
                spacing={1}
                sx={{ alignItems: { lg: 'center' }, flexWrap: 'wrap' }}
              >
                <LifecycleActionButton
                  label="1. Add to cart"
                  loading={busyStep === 'cart'}
                  disabled={!selectedPlan || busyStep !== null}
                  icon={<ShoppingCartIcon />}
                  completed={lastCompletedStep === 'cart' || Boolean(purchaseResult)}
                  onClick={() => void handleAddToCart()}
                />
                <ArrowForwardIcon color="disabled" sx={{ display: { xs: 'none', lg: 'block' } }} />
                <LifecycleActionButton
                  label="2. Purchase"
                  loading={busyStep === 'purchase'}
                  disabled={!canPurchase}
                  icon={<PaymentIcon />}
                  completed={lastCompletedStep === 'purchase' || Boolean(purchaseResult?.paymentHandoff) || (Boolean(purchaseResult) && isTrialCheckout)}
                  onClick={() => void handlePurchase()}
                />
                <ArrowForwardIcon color="disabled" sx={{ display: { xs: 'none', lg: 'block' } }} />
                <LifecycleActionButton
                  label="3. Confirm payment"
                  loading={busyStep === 'confirm'}
                  disabled={!canConfirm}
                  icon={<CheckCircleIcon />}
                  completed={lastCompletedStep === 'confirm' || lastCompletedStep === 'active'}
                  onClick={() => void handleConfirmPayment()}
                />
                <ArrowForwardIcon color="disabled" sx={{ display: { xs: 'none', lg: 'block' } }} />
                <LifecycleActionButton
                  label="4. View active"
                  loading={busyStep === 'active'}
                  disabled={busyStep !== null}
                  icon={<VerifiedIcon />}
                  completed={lastCompletedStep === 'active'}
                  onClick={() => void handleViewActive()}
                />
              </Stack>

              {isTrialCheckout && purchaseResult && !purchaseResult.paymentHandoff && (
                <Alert severity="info">
                  Trial checkout does not require Redis payment confirmation. Use{' '}
                  <strong>View active</strong> after purchase.
                </Alert>
              )}

              {cartPreview && (
                <Alert
                  severity={
                    (cartPreview.planDetails?.warningAttributes?.length ?? 0) > 0
                      ? 'warning'
                      : 'info'
                  }
                  icon={<ShoppingCartIcon />}
                >
                  Cart: <strong>{cartPreview.subscriptionAction}</strong>
                  {' · '}
                  {cartPreview.isTrial ? 'Trial' : cartPreview.billingCycle ?? billingCycle} ·{' '}
                  {formatMoney(cartPreview.pricing.currency, cartPreview.pricing.grandTotal)}
                  {(cartPreview.planDetails?.warningAttributes?.length ?? 0) > 0 && (
                    <>
                      {' · '}
                      {cartPreview.planDetails?.warningAttributes?.length} attribute warning
                      {(cartPreview.planDetails?.warningAttributes?.length ?? 0) === 1 ? '' : 's'}
                    </>
                  )}
                  {(cartPreview.planDetails?.systemAddedEntities?.length ?? 0) > 0 && (
                    <>
                      {' · '}
                      {cartPreview.planDetails?.systemAddedEntities?.length} system-added
                    </>
                  )}
                  {(cartPreview.planDetails?.autoAlignedAttributes?.length ?? 0) > 0 && (
                    <>
                      {' · '}
                      {cartPreview.planDetails?.autoAlignedAttributes?.length} auto-aligned
                    </>
                  )}
                </Alert>
              )}

              {cartPreview && requiresBillingForCart && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                    Billing address (required for purchase)
                  </Typography>
                  <BillingAddressFields value={billingAddress} onChange={setBillingAddress} />
                </Box>
              )}

              {purchaseResult && (
                <Alert severity="success" icon={<PaymentIcon />}>
                  {purchaseResult.message}
                  {purchaseResult.paymentHandoff && (
                    <>
                      {' '}
                      · Invoice {purchaseResult.paymentHandoff.invoiceNumber} (
                      {formatMoney(
                        purchaseResult.paymentHandoff.currency,
                        purchaseResult.paymentHandoff.grandTotal,
                      )}
                      )
                    </>
                  )}
                </Alert>
              )}

              {stepError != null && <ApiErrorAlert error={stepError} />}

              {activeSubscription && (
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <Button
                      component={RouterLink}
                      to="/merchant/subscription"
                      size="small"
                      endIcon={<OpenInNewIcon />}
                    >
                      Open subscription page
                    </Button>
                  </Stack>
                  <ActiveSubscriptionSummary
                    subscription={activeSubscription.subscription}
                    planName={activeSubscription.plan.planName}
                  />
                  <NitroActiveSubscriptionWorkspace
                    activeSubscription={activeSubscription}
                    onRefresh={refreshActiveSubscription}
                    refreshing={refreshingSubscription}
                  />
                </Stack>
              )}
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

function GridLikePlanPicker({
  selectedPlanId,
  billingCycle,
  useTrial,
  selectedPlan,
  activePlans,
  onPlanChange,
  onBillingCycleChange,
  onUseTrialChange,
}: {
  selectedPlanId: string
  billingCycle: BillingCycleValue
  useTrial: boolean
  selectedPlan: PlanDetail | null
  activePlans: PlanDetail[]
  onPlanChange: (planId: string) => void
  onBillingCycleChange: (cycle: BillingCycleValue) => void
  onUseTrialChange: (enabled: boolean) => void
}) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{ alignItems: { md: 'flex-end' } }}
    >
      <FormControl fullWidth sx={{ maxWidth: 360 }}>
        <InputLabel>Merchant plan</InputLabel>
        <Select
          label="Merchant plan"
          value={selectedPlanId}
          onChange={(event) => onPlanChange(event.target.value)}
        >
          {activePlans.map((plan) => (
            <MenuItem key={plan.id} value={plan.id}>
              {plan.planName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 140 }} disabled={useTrial}>
        <InputLabel>Billing</InputLabel>
        <Select
          label="Billing"
          value={billingCycle}
          onChange={(event) => onBillingCycleChange(event.target.value as BillingCycleValue)}
        >
          <MenuItem value={BillingCycle.MONTHLY}>Monthly</MenuItem>
          <MenuItem value={BillingCycle.YEARLY}>Yearly</MenuItem>
        </Select>
      </FormControl>

      {selectedPlan?.trial.enabled && (
        <FormControlLabel
          control={
            <Switch
              checked={useTrial}
              onChange={(event) => onUseTrialChange(event.target.checked)}
            />
          }
          label="Trial checkout"
        />
      )}
    </Stack>
  )
}

function LifecycleActionButton({
  label,
  loading,
  disabled,
  icon,
  completed,
  onClick,
}: {
  label: string
  loading: boolean
  disabled: boolean
  icon: ReactNode
  completed: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant={completed ? 'outlined' : 'contained'}
      color={completed ? 'success' : 'primary'}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : icon}
      onClick={onClick}
      sx={{ minWidth: { sm: 168 } }}
    >
      {loading ? 'Working…' : label}
    </Button>
  )
}
