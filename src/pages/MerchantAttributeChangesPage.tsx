import { useCallback, useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CancelScheduleSendIcon from '@mui/icons-material/CancelScheduleSend'
import DownloadIcon from '@mui/icons-material/Download'
import RefreshIcon from '@mui/icons-material/Refresh'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import TuneIcon from '@mui/icons-material/Tune'
import VerifiedIcon from '@mui/icons-material/Verified'
import { Link as RouterLink } from 'react-router-dom'
import {
  cancelAttributeDowngradeSchedule,
  getActiveSubscription,
  getMerchantAttributeCart,
  purchaseAttributeCart,
  upsertAttributeCart,
} from '../api/merchant'
import { ApiRequestError } from '../api/client'
import { PageHeader } from '../components/layout/PageHeader'
import { AttributeCartPreviewPanel } from '../components/merchant/AttributeCartPreviewPanel'
import { AttributeChangeEditor } from '../components/merchant/AttributeChangeEditor'
import { ValidationErrorsAlert } from '../components/ValidationErrorsAlert'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { useApiTransaction } from '../hooks/useApiTransaction'
import type {
  ActiveSubscriptionResponse,
  BillingAddress,
  MerchantAttributeCartPreview,
  MerchantAttributePurchaseResult,
} from '../types/subscription'
import {
  extractApiErrors,
  getApiErrorSummary,
  getApiErrorTitle,
} from '../utils/apiErrors'
import {
  buildAttributeCartPayload,
  createDefaultAttributeDrafts,
  extractSubscribedPlanAttributes,
  isShortTermPurchaseEligible,
  validateAttributeCartDrafts,
  type AttributeChangeDraft,
} from '../utils/attributeChangeBuilder'
import {
  applyAttributeCartPreviewToDrafts,
  fetchExistingAttributeCart,
  readShortTermPurchaseFromCart,
} from '../utils/cartHydration'
import { buildAttributePurchasePayload } from '../utils/billingAddress'
import { handlePurchaseCheckoutResult } from '../utils/checkoutSession'

export function MerchantAttributeChangesPage() {
  const [subscriptionData, setSubscriptionData] = useState<ActiveSubscriptionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [drafts, setDrafts] = useState<Record<string, AttributeChangeDraft>>({})
  const [cartPreview, setCartPreview] = useState<MerchantAttributeCartPreview | null>(null)
  const [isShortTermPurchase, setIsShortTermPurchase] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [fetchingCart, setFetchingCart] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [fetchError, setFetchError] = useState<unknown>(null)
  const [clientValidationErrors, setClientValidationErrors] = useState<string[]>([])

  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<unknown>(null)
  const [purchaseResult, setPurchaseResult] = useState<MerchantAttributePurchaseResult | null>(null)
  const [checkoutPopupBlocked, setCheckoutPopupBlocked] = useState(false)

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const { transaction, execute } = useApiTransaction()

  const attributeItems = useMemo(
    () => (subscriptionData ? extractSubscribedPlanAttributes(subscriptionData.plan) : []),
    [subscriptionData],
  )

  const scheduledDowngradeAttributes = useMemo(
    () =>
      subscriptionData?.subscription.limitsAndUsages.filter(
        (row) =>
          row.scheduledUsageLimit != null &&
          row.scheduledUsageLimit !== row.usageLimit,
      ) ?? [],
    [subscriptionData],
  )

  const limitsAndUsages = subscriptionData?.subscription.limitsAndUsages ?? []

  const shortTermPurchaseEligible = useMemo(
    () => isShortTermPurchaseEligible(attributeItems, drafts, limitsAndUsages),
    [attributeItems, drafts, limitsAndUsages],
  )

  const [cancellingAttributeId, setCancellingAttributeId] = useState<string | null>(null)

  const livePayload = useMemo(
    () => ({
      features: buildAttributeCartPayload(attributeItems, drafts),
      ...(isShortTermPurchase ? { isShortTermPurchase: true } : {}),
    }),
    [attributeItems, drafts, isShortTermPurchase],
  )

  useEffect(() => {
    if (!shortTermPurchaseEligible && isShortTermPurchase) {
      setIsShortTermPurchase(false)
    }
  }, [shortTermPurchaseEligible, isShortTermPurchase])

  const applyExistingAttributeCart = useCallback(
    async (
      items: ReturnType<typeof extractSubscribedPlanAttributes>,
      usageLimits: typeof limitsAndUsages,
      trackTransaction: boolean,
    ) => {
      try {
        const preview = trackTransaction
          ? await execute({}, () => getMerchantAttributeCart(), 'GET /api/v1/merchant/cart/attribute')
          : await fetchExistingAttributeCart()

        if (!preview) {
          return null
        }

        setCartPreview(preview)
        setIsShortTermPurchase(readShortTermPurchaseFromCart(preview))
        setDrafts((current) =>
          applyAttributeCartPreviewToDrafts(
            Object.keys(current).length > 0 ? current : createDefaultAttributeDrafts(items, usageLimits),
            preview,
          ),
        )
        return preview
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) {
          return null
        }
        throw error
      }
    },
    [execute],
  )

  const loadSubscription = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    setNotFound(false)
    setSubscriptionData(null)

    try {
      const result = await execute(
        {},
        () => getActiveSubscription(),
        'GET /api/v1/merchant/subscription/active',
      )
      setSubscriptionData(result)
      const items = extractSubscribedPlanAttributes(result.plan)
      const defaultDrafts = createDefaultAttributeDrafts(items, result.subscription.limitsAndUsages)
      setDrafts(defaultDrafts)
      setCartPreview(null)
      setIsShortTermPurchase(false)
      setSubmitError(null)
      setFetchError(null)
      setPurchaseError(null)
      setPurchaseResult(null)
      setClientValidationErrors([])

      if (!result.subscription.isTrial) {
        await applyExistingAttributeCart(items, result.subscription.limitsAndUsages, false)
      }
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setNotFound(true)
        return
      }

      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load active subscription'
      setLoadError(message)
    } finally {
      setLoading(false)
    }
  }, [applyExistingAttributeCart, execute])

  useEffect(() => {
    void loadSubscription()
  }, [loadSubscription])

  const handleDraftChange = (planFeatureAttributeId: string, patch: Partial<AttributeChangeDraft>) => {
    setDrafts((current) => ({
      ...current,
      [planFeatureAttributeId]: {
        ...current[planFeatureAttributeId],
        ...patch,
      },
    }))
  }

  const handleFetchCart = async () => {
    if (!subscriptionData) {
      return
    }

    setFetchingCart(true)
    setFetchError(null)

    try {
      const preview = await applyExistingAttributeCart(
        extractSubscribedPlanAttributes(subscriptionData.plan),
        limitsAndUsages,
        true,
      )
      if (!preview) {
        setCartPreview(null)
        setSnackbar({
          open: true,
          message: 'No attribute cart found for this merchant',
          severity: 'error',
        })
        return
      }

      setSnackbar({ open: true, message: 'Attribute cart loaded', severity: 'success' })
    } catch (error) {
      setFetchError(error)
      setSnackbar({
        open: true,
        message: getApiErrorSummary(error),
        severity: 'error',
      })
    } finally {
      setFetchingCart(false)
    }
  }

  const handleAddToCart = async () => {
    if (!subscriptionData) {
      return
    }

    const validationErrors = validateAttributeCartDrafts(attributeItems, drafts)
    if (validationErrors.length > 0) {
      setClientValidationErrors(validationErrors)
      setSnackbar({
        open: true,
        message: 'Fix attribute changes before adding to cart.',
        severity: 'error',
      })
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    setPurchaseError(null)
    setPurchaseResult(null)
    setClientValidationErrors([])

    try {
      const payload = {
        features: buildAttributeCartPayload(attributeItems, drafts),
        ...(isShortTermPurchase ? { isShortTermPurchase: true } : {}),
      }

      const result = await execute(
        payload,
        () => upsertAttributeCart(payload),
        'POST /api/v1/merchant/cart/attribute',
      )
      const preview = await getMerchantAttributeCart()
      setCartPreview(preview)
      setIsShortTermPurchase(readShortTermPurchaseFromCart(preview))
      setDrafts((current) => applyAttributeCartPreviewToDrafts(current, preview))
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

  const handleCancelAttributeDowngrade = async (planFeatureAttributeId: string) => {
    setCancellingAttributeId(planFeatureAttributeId)
    try {
      const payload = { planFeatureAttributeId }
      const result = await execute(
        payload,
        () => cancelAttributeDowngradeSchedule(planFeatureAttributeId),
        'POST /api/v1/merchant/subscription/attribute/downgrade/schedule/cancel',
      )
      setSnackbar({ open: true, message: result.message, severity: 'success' })
      await loadSubscription()
    } catch (error) {
      setSnackbar({
        open: true,
        message: getApiErrorSummary(error),
        severity: 'error',
      })
    } finally {
      setCancellingAttributeId(null)
    }
  }

  const handleConfirmPayment = async (billingAddress: BillingAddress) => {
    setPurchasing(true)
    setPurchaseError(null)
    setPurchaseResult(null)
    setCheckoutPopupBlocked(false)

    try {
      const purchasePayload = buildAttributePurchasePayload(billingAddress)
      const result = await execute(
        purchasePayload,
        () => purchaseAttributeCart(purchasePayload),
        'POST /api/v1/merchant/subscription/attribute/purchase',
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
      const preview = await getMerchantAttributeCart()
      setCartPreview(preview)
      setIsShortTermPurchase(readShortTermPurchaseFromCart(preview))
      setDrafts((current) => applyAttributeCartPreviewToDrafts(current, preview))
      await loadSubscription()
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

  return (
    <>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Attribute changes"
          title="Upgrade or downgrade limits"
          description="View all included and add-on attributes on your subscribed plan, change limits, optionally mark upgrades as short-term purchases, upsert the attribute cart, and fetch pricing preview."
          apiEndpoint="GET /api/v1/merchant/cart/attribute · POST /api/v1/merchant/cart/attribute · POST /api/v1/merchant/subscription/attribute/purchase · POST /api/v1/merchant/subscription/attribute/downgrade/schedule/cancel"
          backTo="/"
          backLabel="Back to home"
          actions={
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => void loadSubscription()}
                disabled={loading}
              >
                Refresh plan
              </Button>
              <Button
                variant="outlined"
                startIcon={fetchingCart ? <CircularProgress size={16} /> : <DownloadIcon />}
                onClick={() => void handleFetchCart()}
                disabled={fetchingCart || loading || notFound}
              >
                Fetch cart
              </Button>
            </Stack>
          }
        />

        {loadError && <Alert severity="error">{loadError}</Alert>}

        {loading && (
          <Stack sx={{ py: 10, alignItems: 'center' }}>
            <CircularProgress />
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Loading subscribed plan attributes...
            </Typography>
          </Stack>
        )}

        {!loading && notFound && (
          <Alert
            severity="info"
            action={
              <Button component={RouterLink} to="/merchant/plans" color="inherit" size="small">
                Browse plans
              </Button>
            }
          >
            An active subscription is required before changing attribute limits.
          </Alert>
        )}

        {!loading && !notFound && subscriptionData && (
          <>
            <Alert severity="info" icon={<VerifiedIcon />}>
              Plan: <strong>{subscriptionData.plan.planName}</strong> ·{' '}
              {subscriptionData.subscription.billingCycle} ·{' '}
              {subscriptionData.subscription.isTrial
                ? 'Trial subscription (attribute cart requires paid subscription)'
                : 'Active paid subscription'}
            </Alert>

            {subscriptionData.subscription.isTrial && (
              <Alert severity="warning">
                Attribute limit changes require an active, non-trial subscription. Complete plan
                checkout first.
              </Alert>
            )}

            {scheduledDowngradeAttributes.length > 0 && (
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h6">Scheduled attribute downgrades</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cancel a pending attribute limit downgrade before it takes effect.
                    </Typography>
                    {scheduledDowngradeAttributes.map((row) => (
                      <Stack
                        key={row.planFeatureAttributeId}
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                      >
                        <Typography variant="body2">
                          {row.attributeCode}: current limit {row.usageLimit ?? '∞'} → scheduled{' '}
                          {row.scheduledUsageLimit ?? '∞'}
                        </Typography>
                        <Button
                          variant="outlined"
                          color="warning"
                          size="small"
                          startIcon={<CancelScheduleSendIcon />}
                          disabled={cancellingAttributeId === row.planFeatureAttributeId}
                          onClick={() =>
                            void handleCancelAttributeDowngrade(row.planFeatureAttributeId)
                          }
                        >
                          {cancellingAttributeId === row.planFeatureAttributeId
                            ? 'Cancelling…'
                            : 'Cancel scheduled downgrade'}
                        </Button>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {attributeItems.length === 0 ? (
              <Alert severity="warning" icon={<TuneIcon />}>
                This plan has no attribute features. Add ATTRIBUTE features when creating the plan.
              </Alert>
            ) : (
              <Card>
                <CardContent>
                  <AttributeChangeEditor
                    items={attributeItems}
                    drafts={drafts}
                    limitsAndUsages={limitsAndUsages}
                    currency={subscriptionData.plan.baseCurrency}
                    isShortTermPurchase={isShortTermPurchase}
                    shortTermPurchaseEligible={shortTermPurchaseEligible}
                    onShortTermPurchaseChange={setIsShortTermPurchase}
                    onDraftChange={handleDraftChange}
                  />
                </CardContent>
              </Card>
            )}

            {clientValidationErrors.length > 0 && (
              <Alert severity="error">
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Fix the following:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {clientValidationErrors.map((message) => (
                    <li key={message}>
                      <Typography variant="body2">{message}</Typography>
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {submitError != null && (
              <ValidationErrorsAlert
                title={getApiErrorTitle(submitError)}
                errors={extractApiErrors(submitError)}
                errorCode={
                  submitError instanceof ApiRequestError ? submitError.body.errorCode : undefined
                }
                subtitle="The attribute cart API rejected this request."
              />
            )}

            {fetchError != null && (
              <ValidationErrorsAlert
                title={getApiErrorTitle(fetchError)}
                errors={extractApiErrors(fetchError)}
                errorCode={
                  fetchError instanceof ApiRequestError ? fetchError.body.errorCode : undefined
                }
                subtitle="Failed to load the attribute cart."
              />
            )}

            {attributeItems.length > 0 && (
              <Button
                variant="contained"
                size="large"
                startIcon={
                  submitting ? <CircularProgress size={18} color="inherit" /> : <ShoppingCartIcon />
                }
                disabled={submitting || subscriptionData.subscription.isTrial}
                onClick={() => void handleAddToCart()}
              >
                Add to cart
              </Button>
            )}

            {cartPreview && (
              <>
                {purchaseError != null && (
                  <ValidationErrorsAlert
                    title={getApiErrorTitle(purchaseError)}
                    errors={extractApiErrors(purchaseError)}
                    errorCode={
                      purchaseError instanceof ApiRequestError
                        ? purchaseError.body.errorCode
                        : undefined
                    }
                    subtitle="Attribute purchase failed."
                  />
                )}
                <AttributeCartPreviewPanel
                  cart={cartPreview}
                  purchasing={purchasing}
                  purchaseResult={purchaseResult}
                  checkoutPopupBlocked={checkoutPopupBlocked}
                  onConfirmPayment={(billingAddress) => void handleConfirmPayment(billingAddress)}
                />
              </>
            )}
          </>
        )}
      </Stack>

      <ApiTransactionInspector
        livePayload={subscriptionData ? livePayload : undefined}
        transaction={transaction}
        livePayloadTitle="Request preview"
      />

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
