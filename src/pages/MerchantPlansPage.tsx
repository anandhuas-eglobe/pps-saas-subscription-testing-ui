import { useCallback, useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Pagination from '@mui/material/Pagination'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RefreshIcon from '@mui/icons-material/Refresh'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import StorefrontIcon from '@mui/icons-material/Storefront'
import { getMerchantCart, getActiveSubscription, listMerchantPlans, purchasePlanCart, upsertMerchantCart, cancelMerchantCheckout } from '../api/merchant'
import { getPlanById, listPlans } from '../api/plans'
import { ApiRequestError } from '../api/client'
import { PageHeader } from '../components/layout/PageHeader'
import { CartPreviewPanel } from '../components/merchant/CartPreviewPanel'
import { CancelMerchantCheckoutButton } from '../components/payment/CancelMerchantCheckoutButton'
import { PlanCartConfigurator } from '../components/merchant/PlanCartConfigurator'
import { ApiErrorAlert } from '../components/ApiErrorAlert'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { useApiTransaction } from '../hooks/useApiTransaction'
import type {
  BillingAddress,
  BillingCycleValue,
  MerchantCartPreview,
  MerchantPlanPurchaseResult,
  PlanDetail,
} from '../types/subscription'
import { BillingCycle, PlanStatus, PlanType } from '../types/subscription'
import {
  getApiErrorSummary,
} from '../utils/apiErrors'
import {
  fetchExistingPlanCart,
  hydratePlanCartFormState,
} from '../utils/cartHydration'
import {
  buildDefaultCartSelections,
  updateAttributeValue,
  validateCartSelections,
} from '../utils/cartBuilder'
import { formatMoney, formatTrialGrace, planStatusColor } from '../utils/planDisplay'
import {
  buildInitiatePurchasePayload,
  requiresBillingAddressForCheckout,
} from '../utils/billingAddress'
import { handlePurchaseCheckoutResult } from '../utils/checkoutSession'

const PLANS_PAGE_SIZE = 10

export function MerchantPlansPage() {
  const [plans, setPlans] = useState<PlanDetail[]>([])
  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [selectedPlan, setSelectedPlan] = useState<PlanDetail | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<BillingCycleValue>(BillingCycle.MONTHLY)
  const [isTrial, setIsTrial] = useState(false)
  const [selections, setSelections] = useState<ReturnType<typeof buildDefaultCartSelections>>([])

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [cartPreview, setCartPreview] = useState<MerchantCartPreview | null>(null)
  const [clientValidationErrors, setClientValidationErrors] = useState<string[]>([])
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<unknown>(null)
  const [purchaseResult, setPurchaseResult] = useState<MerchantPlanPurchaseResult | null>(null)
  const [checkoutPopupBlocked, setCheckoutPopupBlocked] = useState(false)
  const [cancellingCheckout, setCancellingCheckout] = useState(false)

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const { transaction, execute } = useApiTransaction()

  const listQueryPayload = useMemo(
    () => ({
      page,
      limit: PLANS_PAGE_SIZE,
      planType: PlanType.PUBLIC,
      status: PlanStatus.ACTIVE,
      sortBy: 'baseMonthlyPrice',
      sortOrder: 'asc' as const,
    }),
    [page],
  )

  const loadExistingPlanCart = useCallback(
    async (availablePlans: PlanDetail[]) => {
      const existingCart = await fetchExistingPlanCart()
      if (!existingCart) {
        return
      }

      let plan = availablePlans.find((item) => item.id === existingCart.planId)
      if (!plan) {
        plan = await getPlanById(existingCart.planId)
      }

      const formState = hydratePlanCartFormState(existingCart, plan)
      setSelectedPlan(plan)
      setSelectedPlanId(plan.id)
      setBillingCycle(formState.billingCycle)
      setIsTrial(formState.isTrial)
      setSelections(formState.selections)
      setCartPreview(existingCart)
    },
    [],
  )

  const loadPlans = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [listResult, activeSubscription, merchantPlansResult] = await Promise.all([
        execute(listQueryPayload, () => listPlans(listQueryPayload), 'GET /api/v1/admin/plans'),
        getActiveSubscription().catch(() => null),
        page === 1
          ? execute({}, () => listMerchantPlans(), 'GET /api/v1/merchant/subscription/plans')
          : Promise.resolve(null),
      ])

      const planDetails = await Promise.all(listResult.plans.map((plan) => getPlanById(plan.id)))

      if (page === 1 && merchantPlansResult) {
        for (const merchantPlan of merchantPlansResult.plans) {
          if (!planDetails.some((plan) => plan.id === merchantPlan.id)) {
            planDetails.push(merchantPlan)
          }
        }
      }

      setPlans(planDetails)
      setTotalPages(listResult.pagination.totalPages)
      setTotal(listResult.pagination.total)
      setActivePlanId(
        activeSubscription?.subscription.planId ??
          merchantPlansResult?.activePlanId ??
          null,
      )

      await loadExistingPlanCart(planDetails)
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load merchant plans'
      setLoadError(message)
      setPlans([])
    } finally {
      setLoading(false)
    }
  }, [execute, listQueryPayload, loadExistingPlanCart, page])

  const livePayload = useMemo(() => {
    if (!selectedPlan) {
      return undefined
    }
    if (isTrial) {
      return { planId: selectedPlan.id, isTrial: true }
    }
    return {
      planId: selectedPlan.id,
      billingCycle,
      features: selections,
    }
  }, [selectedPlan, isTrial, billingCycle, selections])

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  const handleSelectPlan = async (plan: PlanDetail) => {
    setSelectedPlan(plan)
    setSelectedPlanId(plan.id)
    setSubmitError(null)
    setClientValidationErrors([])
    setPurchaseError(null)
    setPurchaseResult(null)

    try {
      const existingCart = await fetchExistingPlanCart()
      if (existingCart?.planId === plan.id) {
        const formState = hydratePlanCartFormState(existingCart, plan)
        setBillingCycle(formState.billingCycle)
        setIsTrial(formState.isTrial)
        setSelections(formState.selections)
        setCartPreview(existingCart)
        return
      }
    } catch {
      // Fall back to default configuration when cart cannot be loaded.
    }

    setBillingCycle(BillingCycle.MONTHLY)
    setIsTrial(false)
    setSelections(buildDefaultCartSelections(plan))
    setCartPreview(null)
  }

  const handleAttributeValueChange = (planFeatureAttributeId: string, value: number) => {
    if (!selectedPlan) {
      return
    }
    setSelections((current) =>
      updateAttributeValue(selectedPlan, current, planFeatureAttributeId, value),
    )
  }

  const handleAddToCart = async () => {
    if (!selectedPlan) {
      return
    }

    if (!isTrial) {
      const validationErrors = validateCartSelections(selectedPlan, selections)
      if (validationErrors.length > 0) {
        setClientValidationErrors(validationErrors)
        setSnackbar({
          open: true,
          message: 'Fix configuration issues before adding to cart.',
          severity: 'error',
        })
        return
      }
    }

    setSubmitting(true)
    setSubmitError(null)
    setClientValidationErrors([])
    setPurchaseError(null)
    setPurchaseResult(null)

    try {
      const payload = isTrial
        ? { planId: selectedPlan.id, isTrial: true }
        : {
            planId: selectedPlan.id,
            billingCycle,
            features: selections,
          }

      const result = await execute(
        payload,
        () => upsertMerchantCart(payload),
        'POST /api/v1/merchant/cart/plan',
      )
      const preview = await getMerchantCart()
      setCartPreview(preview)
      setSnackbar({ open: true, message: result.message, severity: 'success' })
    } catch (error) {
      setSubmitError(error)
      setSnackbar({
        open: true,
        message: getApiErrorSummary(error),
        severity: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmPayment = async (billingAddress?: BillingAddress) => {
    setPurchasing(true)
    setPurchaseError(null)
    setPurchaseResult(null)
    setCheckoutPopupBlocked(false)

    try {
      const requiresBilling = cartPreview
        ? requiresBillingAddressForCheckout({
            isTrial: cartPreview.isTrial,
            subscriptionAction: cartPreview.subscriptionAction,
          })
        : false
      const purchasePayload = buildInitiatePurchasePayload(billingAddress, requiresBilling)
      const result = await execute(
        purchasePayload,
        () => purchasePlanCart(purchasePayload),
        'POST /api/v1/merchant/subscription/plan/purchase',
      )
      setPurchaseResult(result)
      const opened = handlePurchaseCheckoutResult(result)
      setCheckoutPopupBlocked(Boolean(result.checkoutUrl) && !opened)
      setSnackbar({
        open: true,
        message: result.checkoutUrl
          ? opened
            ? 'Checkout session opened in a new tab.'
            : 'Purchase started. Open the checkout session below if the popup was blocked.'
          : result.message,
        severity: 'success',
      })
      await loadPlans()
    } catch (error) {
      setPurchaseError(error)
      setSnackbar({
        open: true,
        message: getApiErrorSummary(error),
        severity: 'error',
      })
    } finally {
      setPurchasing(false)
    }
  }

  const handleCancelCheckout = async () => {
    setCancellingCheckout(true)
    setPurchaseError(null)

    try {
      const result = await execute(
        {},
        () => cancelMerchantCheckout(),
        'POST /api/v1/merchant/subscription/checkout/cancel',
      )
      setPurchaseResult(null)
      setCheckoutPopupBlocked(false)
      const preview = await getMerchantCart().catch(() => null)
      setCartPreview(preview)
      setSnackbar({ open: true, message: result.message, severity: 'success' })
    } catch (error) {
      setPurchaseError(error)
      setSnackbar({
        open: true,
        message: getApiErrorSummary(error),
        severity: 'error',
      })
    } finally {
      setCancellingCheckout(false)
    }
  }

  const handleCheckoutCancelled = async () => {
    setPurchaseResult(null)
    setCheckoutPopupBlocked(false)
    const preview = await getMerchantCart().catch(() => null)
    setCartPreview(preview)
  }

  return (
    <>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Merchant checkout"
          title="Browse plans & configure cart"
          description="List plans available to the merchant, configure attribute limits and volume tiers, then add the selection to the subscription cart."
          apiEndpoint="GET /api/v1/merchant/cart/plan · GET /api/v1/merchant/subscription/plans · POST /api/v1/merchant/cart/plan · POST /api/v1/merchant/subscription/plan/purchase · POST /api/v1/merchant/subscription/checkout/cancel"
          backTo="/"
          backLabel="Back to home"
          actions={
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => void loadPlans()}
              disabled={loading}
            >
              Refresh plans
            </Button>
          }
        />

        {loadError && <Alert severity="error">{loadError}</Alert>}

        <Alert severity="info">
          <Typography variant="subtitle2" gutterBottom>
            Stuck checkout?
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            If a Stripe session was started but not completed, cancel checkout to expire the session,
            delete the pending invoice, and unlock the cart (PROCESSING → ACTIVE).
          </Typography>
          <CancelMerchantCheckoutButton onCancelled={() => void handleCheckoutCancelled()} />
        </Alert>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: selectedPlan ? 5 : 12 }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <StorefrontIcon color="primary" />
                <Typography variant="h6">Available plans</Typography>
                {activePlanId && (
                  <Chip label="Active plan highlighted" size="small" color="success" variant="outlined" />
                )}
              </Stack>

              {loading ? (
                <Stack sx={{ py: 8, alignItems: 'center' }}>
                  <CircularProgress />
                  <Typography color="text.secondary" sx={{ mt: 2 }}>
                    Loading merchant plans...
                  </Typography>
                </Stack>
              ) : plans.length === 0 ? (
                <Alert severity="info">No plans are available for this merchant.</Alert>
              ) : (
                <Grid container spacing={2}>
                  {plans.map((plan) => {
                    const isSelected = plan.id === selectedPlanId
                    const isActive = plan.id === activePlanId

                    return (
                      <Grid key={plan.id} size={{ xs: 12, sm: selectedPlan ? 12 : 6, xl: selectedPlan ? 12 : 4 }}>
                        <Card
                          sx={{
                            borderColor: isSelected ? 'primary.main' : 'divider',
                            boxShadow: isSelected ? '0 12px 32px rgba(79, 70, 229, 0.12)' : undefined,
                          }}
                        >
                          <CardActionArea onClick={() => handleSelectPlan(plan)}>
                            <CardContent>
                              <Stack spacing={1.5}>
                                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                                  <Chip label={plan.planType} size="small" variant="outlined" />
                                  <Chip
                                    label={plan.status}
                                    size="small"
                                    color={planStatusColor(plan.status)}
                                  />
                                  {isActive && (
                                    <Chip
                                      icon={<CheckCircleIcon />}
                                      label="Current plan"
                                      size="small"
                                      color="success"
                                    />
                                  )}
                                  {isSelected && (
                                    <Chip label="Selected" size="small" color="primary" />
                                  )}
                                </Stack>

                                <Box>
                                  <Typography variant="h6">{plan.planName}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {plan.planDescription || 'No description'}
                                  </Typography>
                                </Box>

                                <Stack direction="row" spacing={2}>
                                  <Typography variant="body2">
                                    {formatMoney(plan.baseCurrency, plan.baseMonthlyPrice)} / mo
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {formatMoney(plan.baseCurrency, plan.baseYearlyPrice)} / yr
                                  </Typography>
                                </Stack>

                                <Typography variant="caption" color="text.secondary">
                                  Trial: {formatTrialGrace(plan.trial.enabled, plan.trial.days)} ·{' '}
                                  {plan.features.length} feature(s)
                                </Typography>
                              </Stack>
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      </Grid>
                    )
                  })}
                </Grid>
              )}

              {!loading && plans.length > 0 && (
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Showing {plans.length} of {total} public active plans
                    {page === 1 && plans.length > listQueryPayload.limit
                      ? ' (includes merchant-only plans on page 1)'
                      : ''}
                  </Typography>
                  <Pagination
                    count={Math.max(totalPages, 1)}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    color="primary"
                  />
                </Stack>
              )}
            </Stack>
          </Grid>

          {selectedPlan && (
            <Grid size={{ xs: 12, lg: 7 }}>
              <Stack spacing={2}>
                <PlanCartConfigurator
                  plan={selectedPlan}
                  billingCycle={billingCycle}
                  isTrial={isTrial}
                  selections={selections}
                  onBillingCycleChange={setBillingCycle}
                  onTrialChange={setIsTrial}
                  onAttributeValueChange={handleAttributeValueChange}
                />

                {clientValidationErrors.length > 0 && (
                  <Alert severity="error">
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Fix configuration before adding to cart:
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                      {clientValidationErrors.map((message) => (
                        <Typography key={message} component="li" variant="body2">
                          {message}
                        </Typography>
                      ))}
                    </Box>
                  </Alert>
                )}

                {submitError != null && (
                  <ApiErrorAlert
                    error={submitError}
                    subtitle="The cart API rejected this configuration. Review each item below and update the form."
                  />
                )}

                <Button
                  variant="contained"
                  size="large"
                  startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <ShoppingCartIcon />}
                  disabled={submitting}
                  onClick={() => void handleAddToCart()}
                >
                  Add to cart
                </Button>

                {cartPreview && (
                  <>
                    {purchaseError != null && (
                      <ApiErrorAlert
                        error={purchaseError}
                        subtitle="Plan purchase failed. Review the error below and try again."
                      />
                    )}
                    <CartPreviewPanel
                      cart={cartPreview}
                      purchasing={purchasing}
                      purchaseResult={purchaseResult}
                      checkoutPopupBlocked={checkoutPopupBlocked}
                      onConfirmPayment={(billingAddress) => void handleConfirmPayment(billingAddress)}
                      onCancelCheckout={() => void handleCancelCheckout()}
                      cancellingCheckout={cancellingCheckout}
                    />
                  </>
                )}
              </Stack>
            </Grid>
          )}
        </Grid>

        <ApiTransactionInspector
          livePayload={livePayload ?? listQueryPayload}
          livePayloadTitle={livePayload ? 'Request preview' : 'List plans query'}
          transaction={transaction}
        />
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}
