import { useCallback, useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import DownloadIcon from '@mui/icons-material/Download'
import RefreshIcon from '@mui/icons-material/Refresh'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import TuneIcon from '@mui/icons-material/Tune'
import VerifiedIcon from '@mui/icons-material/Verified'
import { Link as RouterLink } from 'react-router-dom'
import {
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
  validateAttributeCartDrafts,
  type AttributeChangeDraft,
} from '../utils/attributeChangeBuilder'
import { buildAttributePurchasePayload } from '../utils/billingAddress'
import { saveLastPaymentHandoff } from '../utils/paymentEventBuilder'

function applyCartPreviewToDrafts(
  drafts: Record<string, AttributeChangeDraft>,
  cart: MerchantAttributeCartPreview,
): Record<string, AttributeChangeDraft> {
  const next = { ...drafts }

  for (const change of cart.attributeChanges) {
    const existing = next[change.planFeatureAttributeId]
    next[change.planFeatureAttributeId] = {
      selected: true,
      newValue: change.newValue,
      previousValue: change.previousValue,
      ...(existing ? {} : {}),
    }
  }

  return next
}

export function MerchantAttributeChangesPage() {
  const [subscriptionData, setSubscriptionData] = useState<ActiveSubscriptionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [drafts, setDrafts] = useState<Record<string, AttributeChangeDraft>>({})
  const [cartPreview, setCartPreview] = useState<MerchantAttributeCartPreview | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [fetchingCart, setFetchingCart] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [fetchError, setFetchError] = useState<unknown>(null)
  const [clientValidationErrors, setClientValidationErrors] = useState<string[]>([])

  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<unknown>(null)
  const [purchaseResult, setPurchaseResult] = useState<MerchantAttributePurchaseResult | null>(null)

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const attributeItems = useMemo(
    () => (subscriptionData ? extractSubscribedPlanAttributes(subscriptionData.plan) : []),
    [subscriptionData],
  )

  const loadSubscription = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    setNotFound(false)
    setSubscriptionData(null)

    try {
      const result = await getActiveSubscription()
      setSubscriptionData(result)
      const items = extractSubscribedPlanAttributes(result.plan)
      setDrafts(createDefaultAttributeDrafts(items))
      setCartPreview(null)
      setSubmitError(null)
      setFetchError(null)
      setPurchaseError(null)
      setPurchaseResult(null)
      setClientValidationErrors([])
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
  }, [])

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
    setFetchingCart(true)
    setFetchError(null)

    try {
      const preview = await getMerchantAttributeCart()
      setCartPreview(preview)
      setDrafts((current) => applyCartPreviewToDrafts(current, preview))
      setSnackbar({ open: true, message: 'Attribute cart loaded', severity: 'success' })
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        setCartPreview(null)
        setSnackbar({
          open: true,
          message: 'No attribute cart found for this merchant',
          severity: 'error',
        })
        return
      }

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
      }

      const result = await upsertAttributeCart(payload)
      const preview = await getMerchantAttributeCart()
      setCartPreview(preview)
      setDrafts((current) => applyCartPreviewToDrafts(current, preview))
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

  const handleConfirmPayment = async (billingAddress: BillingAddress) => {
    setPurchasing(true)
    setPurchaseError(null)
    setPurchaseResult(null)

    try {
      const result = await purchaseAttributeCart(buildAttributePurchasePayload(billingAddress))
      setPurchaseResult(result)
      if (result.paymentHandoff) {
        saveLastPaymentHandoff(result.paymentHandoff)
      }
      setSnackbar({ open: true, message: result.message, severity: 'success' })
      const preview = await getMerchantAttributeCart()
      setCartPreview(preview)
      setDrafts((current) => applyCartPreviewToDrafts(current, preview))
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
          description="View all included and add-on attributes on your subscribed plan, change limits, upsert the attribute cart, and fetch pricing preview."
          apiEndpoint="POST /api/v1/merchant/cart/attribute · GET /api/v1/merchant/cart/attribute · POST /api/v1/merchant/subscription/attribute/purchase"
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
                    currency={subscriptionData.plan.baseCurrency}
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
                  onConfirmPayment={(billingAddress) => void handleConfirmPayment(billingAddress)}
                />
              </>
            )}
          </>
        )}
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
