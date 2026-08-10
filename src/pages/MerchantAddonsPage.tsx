import { useCallback, useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ExtensionIcon from '@mui/icons-material/Extension'
import RefreshIcon from '@mui/icons-material/Refresh'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import VerifiedIcon from '@mui/icons-material/Verified'
import { Link as RouterLink } from 'react-router-dom'
import {
  getActiveSubscription,
  getMerchantAddonCart,
  purchaseAddonCart,
  upsertAddonCart,
} from '../api/merchant'
import { ApiRequestError } from '../api/client'
import { PageHeader } from '../components/layout/PageHeader'
import { AddonCartConfigurator } from '../components/merchant/AddonCartConfigurator'
import { AddonCartPreviewPanel } from '../components/merchant/AddonCartPreviewPanel'
import { ValidationErrorsAlert } from '../components/ValidationErrorsAlert'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { useApiTransaction } from '../hooks/useApiTransaction'
import type {
  ActiveSubscriptionResponse,
  BillingAddress,
  MerchantAddonCartPreview,
  MerchantAddonPurchaseResult,
} from '../types/subscription'
import { FeatureType } from '../types/subscription'
import {
  extractApiErrors,
  getApiErrorSummary,
  getApiErrorTitle,
} from '../utils/apiErrors'
import {
  defaultAddonAttributeValue,
  extractAddonCatalogItems,
  validateAddonAttributeValue,
  type AddonCatalogItem,
} from '../utils/addonBuilder'
import { formatMoney } from '../utils/planDisplay'
import {
  fetchExistingAddonCart,
  findAddonCatalogItem,
  hydrateAddonCartFormState,
} from '../utils/cartHydration'
import {
  buildInitiatePurchasePayload,
  requiresBillingAddressForCheckout,
} from '../utils/billingAddress'

import { handlePurchaseCheckoutResult } from '../utils/checkoutSession'

export function MerchantAddonsPage() {
  const [subscriptionData, setSubscriptionData] = useState<ActiveSubscriptionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selectedAddonKey, setSelectedAddonKey] = useState<string | null>(null)
  const [isAddonTrial, setIsAddonTrial] = useState(false)
  const [attributeValue, setAttributeValue] = useState(1)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [cartPreview, setCartPreview] = useState<MerchantAddonCartPreview | null>(null)

  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<unknown>(null)
  const [purchaseResult, setPurchaseResult] = useState<MerchantAddonPurchaseResult | null>(null)
  const [checkoutPopupBlocked, setCheckoutPopupBlocked] = useState(false)
  const [clientValidationErrors, setClientValidationErrors] = useState<string[]>([])

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const { transaction, execute } = useApiTransaction()

  const addonItems = useMemo(
    () => (subscriptionData ? extractAddonCatalogItems(subscriptionData.plan) : []),
    [subscriptionData],
  )

  const selectedAddon = useMemo(
    () => addonItems.find((item) => item.key === selectedAddonKey) ?? null,
    [addonItems, selectedAddonKey],
  )

  const subscriptionIsTrial = subscriptionData?.subscription.isTrial ?? false

  const defaultAddonTrialSelection = useCallback(
    (addon: AddonCatalogItem) => subscriptionIsTrial && addon.addonTrialEnabled,
    [subscriptionIsTrial],
  )

  const addonCartBlockedOnPlanTrial =
    Boolean(selectedAddon) && subscriptionIsTrial && !selectedAddon!.addonTrialEnabled

  const livePayload = useMemo(() => {
    if (!selectedAddon) {
      return undefined
    }
    return {
      planFeatureId: selectedAddon.planFeatureId,
      isAddonTrial,
      ...(selectedAddon.planFeatureAttributeId
        ? { planFeatureAttributeId: selectedAddon.planFeatureAttributeId }
        : {}),
      ...(selectedAddon.featureType !== FeatureType.SIMPLE &&
      selectedAddon.attribute &&
      !isAddonTrial
        ? { value: attributeValue }
        : {}),
    }
  }, [selectedAddon, isAddonTrial, attributeValue])

  const loadExistingAddonCart = useCallback(async (items: AddonCatalogItem[]) => {
    const existingCart = await fetchExistingAddonCart()
    if (!existingCart) {
      return
    }

    const formState = hydrateAddonCartFormState(existingCart)
    const matchingAddon = findAddonCatalogItem(items, formState.addonKey)
    if (!matchingAddon) {
      setCartPreview(existingCart)
      return
    }

    setSelectedAddonKey(matchingAddon.key)
    setIsAddonTrial(formState.isAddonTrial)
    setAttributeValue(
      matchingAddon.attribute ? formState.attributeValue : 1,
    )
    setCartPreview(existingCart)
  }, [])

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
      const items = extractAddonCatalogItems(result.plan)
      await loadExistingAddonCart(items)
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
  }, [execute, loadExistingAddonCart])

  useEffect(() => {
    void loadSubscription()
  }, [loadSubscription])

  useEffect(() => {
    if (!selectedAddon || !subscriptionIsTrial || !selectedAddon.addonTrialEnabled) {
      return
    }

    setIsAddonTrial(true)
  }, [selectedAddon, subscriptionIsTrial])

  const handleSelectAddon = async (addon: AddonCatalogItem) => {
    setSelectedAddonKey(addon.key)
    setSubmitError(null)
    setPurchaseError(null)
    setPurchaseResult(null)
    setClientValidationErrors([])

    try {
      const existingCart = await fetchExistingAddonCart()
      if (existingCart) {
        const formState = hydrateAddonCartFormState(existingCart)
        const matchingAddon = findAddonCatalogItem(addonItems, formState.addonKey)
        if (matchingAddon?.key === addon.key) {
          setIsAddonTrial(formState.isAddonTrial)
          setAttributeValue(addon.attribute ? formState.attributeValue : 1)
          setCartPreview(existingCart)
          return
        }
      }
    } catch {
      // Fall back to default configuration when cart cannot be loaded.
    }

    setIsAddonTrial(defaultAddonTrialSelection(addon))
    setAttributeValue(addon.attribute ? defaultAddonAttributeValue(addon.attribute) : 1)
    setCartPreview(null)
  }

  const handleAddToCart = async () => {
    if (!selectedAddon || !subscriptionData) {
      return
    }

    const errors: string[] = []
    if (subscriptionIsTrial && !selectedAddon.addonTrialEnabled) {
      errors.push(
        'This add-on cannot be purchased during plan trial because it does not offer an add-on trial.',
      )
    } else if (subscriptionIsTrial && !isAddonTrial) {
      errors.push(
        'Paid add-on purchase is not available while your plan is in trial. Enable add-on trial instead.',
      )
    }

    if (
      selectedAddon.featureType !== FeatureType.SIMPLE &&
      selectedAddon.attribute &&
      !isAddonTrial
    ) {
      errors.push(...validateAddonAttributeValue(selectedAddon.attribute, attributeValue))
    }

    if (errors.length > 0) {
      setClientValidationErrors(errors)
      setSnackbar({
        open: true,
        message: 'Fix add-on configuration before adding to cart.',
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
        planFeatureId: selectedAddon.planFeatureId,
        isAddonTrial,
        ...(selectedAddon.planFeatureAttributeId
          ? { planFeatureAttributeId: selectedAddon.planFeatureAttributeId }
          : {}),
        ...(selectedAddon.featureType !== FeatureType.SIMPLE &&
        selectedAddon.attribute &&
        !isAddonTrial
          ? { value: attributeValue }
          : {}),
      }

      const result = await execute(
        payload,
        () => upsertAddonCart(payload),
        'POST /api/v1/merchant/cart/addon',
      )
      const preview = await getMerchantAddonCart()
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
          })
        : false
      const purchasePayload = buildInitiatePurchasePayload(billingAddress, requiresBilling)
      const result = await execute(
        purchasePayload,
        () => purchaseAddonCart(purchasePayload),
        'POST /api/v1/merchant/subscription/addon/purchase',
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
          eyebrow="Merchant add-ons"
          title="Purchase plan add-ons"
          description="Browse add-ons available on your active subscription plan, configure limits or trials, add to cart, and complete checkout. View purchased add-ons on the active subscription page."
          apiEndpoint="GET /api/v1/merchant/cart/addon · GET /api/v1/merchant/subscription/active · POST /api/v1/merchant/cart/addon · POST /api/v1/merchant/subscription/addon/purchase"
          backTo="/"
          backLabel="Back to home"
          actions={
            <Stack direction="row" spacing={1}>
              <Button
                component={RouterLink}
                to="/merchant/subscription?tab=addons"
                variant="outlined"
                disabled={loading || notFound}
              >
                View purchased add-ons
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => void loadSubscription()}
                disabled={loading}
              >
                Refresh
              </Button>
            </Stack>
          }
        />

        {loadError && <Alert severity="error">{loadError}</Alert>}

        {loading && (
          <Stack sx={{ py: 10, alignItems: 'center' }}>
            <CircularProgress />
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Loading active subscription and add-ons...
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
            An active subscription is required before purchasing add-ons.
          </Alert>
        )}

        {!loading && !notFound && subscriptionData && (
          <>
            <Alert severity="info" icon={<VerifiedIcon />}>
              Subscribed to <strong>{subscriptionData.plan.planName}</strong> ·{' '}
              {subscriptionData.subscription.billingCycle} ·{' '}
              {subscriptionData.subscription.isTrial ? 'Plan trial' : 'Paid subscription'}
            </Alert>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, lg: selectedAddon ? 5 : 12 }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <ExtensionIcon color="primary" />
                    <Typography variant="h6">
                      Available add-ons ({addonItems.length})
                    </Typography>
                  </Stack>

                  {addonItems.length === 0 ? (
                    <Alert severity="warning">
                      No add-ons are configured on the current plan. Add ADDON features or attributes
                      when creating the plan in the admin console.
                    </Alert>
                  ) : (
                    <Grid container spacing={2}>
                      {addonItems.map((addon) => {
                        const isSelected = addon.key === selectedAddonKey
                        const priceLabel =
                          addon.featureType === FeatureType.SIMPLE && addon.feature.featureConfig
                            ? formatMoney(
                                subscriptionData.plan.baseCurrency,
                                addon.feature.featureConfig.planFeaturePriceMonthly,
                              )
                            : null

                        return (
                          <Grid
                            key={addon.key}
                            size={{ xs: 12, sm: selectedAddon ? 12 : 6, xl: selectedAddon ? 12 : 4 }}
                          >
                            <Card
                              sx={{
                                borderColor: isSelected ? 'primary.main' : 'divider',
                                boxShadow: isSelected
                                  ? '0 12px 32px rgba(79, 70, 229, 0.12)'
                                  : undefined,
                              }}
                            >
                              <CardActionArea onClick={() => handleSelectAddon(addon)}>
                                <CardContent>
                                  <Stack spacing={1.5}>
                                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                                      <Chip
                                        label={
                                          addon.featureType === FeatureType.SIMPLE
                                            ? 'Simple add-on'
                                            : 'Attribute add-on'
                                        }
                                        size="small"
                                        variant="outlined"
                                      />
                                      {addon.addonTrialEnabled && (
                                        <Chip
                                          label={`${addon.addonTrialPeriod ?? '?'}d trial`}
                                          size="small"
                                          color="warning"
                                          variant="outlined"
                                        />
                                      )}
                                      {isSelected && (
                                        <Chip label="Selected" size="small" color="primary" />
                                      )}
                                    </Stack>
                                    <Typography variant="h6">{addon.title}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {addon.subtitle}
                                    </Typography>
                                    {priceLabel && (
                                      <Typography variant="body2">
                                        From {priceLabel} / mo
                                      </Typography>
                                    )}
                                  </Stack>
                                </CardContent>
                              </CardActionArea>
                            </Card>
                          </Grid>
                        )
                      })}
                    </Grid>
                  )}
                </Stack>
              </Grid>

              {selectedAddon && (
                <Grid size={{ xs: 12, lg: 7 }}>
                  <Stack spacing={2}>
                    <Card>
                      <CardContent>
                        <AddonCartConfigurator
                          addon={selectedAddon}
                          currency={subscriptionData.plan.baseCurrency}
                          isAddonTrial={isAddonTrial}
                          attributeValue={attributeValue}
                          subscriptionIsTrial={subscriptionIsTrial}
                          onTrialChange={setIsAddonTrial}
                          onAttributeValueChange={setAttributeValue}
                        />
                      </CardContent>
                    </Card>

                    {clientValidationErrors.length > 0 && (
                      <Alert severity="error">
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
                      <ValidationErrorsAlert
                        title={getApiErrorTitle(submitError)}
                        errors={extractApiErrors(submitError)}
                        errorCode={
                          submitError instanceof ApiRequestError
                            ? submitError.body.errorCode
                            : undefined
                        }
                        subtitle="The add-on cart API rejected this configuration."
                      />
                    )}

                    {addonCartBlockedOnPlanTrial && (
                      <Alert severity="warning">
                        This add-on cannot be added while your plan is in trial because it does not
                        offer an add-on trial.
                      </Alert>
                    )}

                    <Button
                      variant="contained"
                      size="large"
                      startIcon={
                        submitting ? <CircularProgress size={18} color="inherit" /> : <ShoppingCartIcon />
                      }
                      disabled={submitting || addonCartBlockedOnPlanTrial}
                      onClick={() => void handleAddToCart()}
                    >
                      Add to cart
                    </Button>

                    {cartPreview && (
                      <>
                        <Divider />
                        {purchaseError != null && (
                          <ValidationErrorsAlert
                            title={getApiErrorTitle(purchaseError)}
                            errors={extractApiErrors(purchaseError)}
                            errorCode={
                              purchaseError instanceof ApiRequestError
                                ? purchaseError.body.errorCode
                                : undefined
                            }
                            subtitle="Add-on purchase failed."
                          />
                        )}
                        <AddonCartPreviewPanel
                          cart={cartPreview}
                          purchasing={purchasing}
                          purchaseResult={purchaseResult}
                          checkoutPopupBlocked={checkoutPopupBlocked}
                          onConfirmPayment={(billingAddress) =>
                            void handleConfirmPayment(billingAddress)
                          }
                        />
                      </>
                    )}
                  </Stack>
                </Grid>
              )}
            </Grid>
          </>
        )}
      </Stack>

      <ApiTransactionInspector
        livePayload={livePayload}
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
