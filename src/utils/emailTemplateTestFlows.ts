import { fetchFeatures } from '../api/features'
import {
  getActiveSubscription,
  getInvoiceById,
  getMerchantAddonCart,
  getMerchantCart,
  purchaseAddonCart,
  purchasePlanCart,
  upsertAddonCart,
  upsertMerchantCart,
} from '../api/merchant'
import { createPlan, getPlanById, updatePlanStatus } from '../api/plans'
import { DEFAULT_REDIS_CONNECTION, flushRedisCache, publishToRedisStream } from '../api/redisDevTools'
import type { CatalogFeature, MerchantPlanPurchaseResult } from '../types/subscription'
import { BillingCycle, PlanStatus } from '../types/subscription'
import { extractAddonCatalogItems, type AddonCatalogItem } from './addonBuilder'
import {
  buildInitiatePurchasePayload,
  defaultBillingAddress,
  requiresBillingAddressForCheckout,
} from './billingAddress'
import { buildDefaultCartSelections } from './cartBuilder'
import { handlePurchaseCheckoutResult } from './checkoutSession'
import {
  buildNitroTestPlanPayload,
  NITRO_PLAN_TIERS,
  validateNitroCatalog,
  type NitroPlanTier,
} from './nitroTestPlanBuilder'
import { buildSucceededPaymentEventFromHandoff } from './paymentEventBuilder'

export type EmailTemplateTestStepStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error'

export interface EmailTemplateTestStepState {
  id: string
  label: string
  status: EmailTemplateTestStepStatus
  detail?: string
}

export type EmailTemplateTestStepUpdater = (
  stepId: string,
  update: Partial<Pick<EmailTemplateTestStepState, 'status' | 'detail'>>,
) => void

export interface EmailTemplateTestFlowDefinition {
  steps: EmailTemplateTestStepState[]
  run: (onStepUpdate: EmailTemplateTestStepUpdater) => Promise<EmailTemplateTestFlowResult>
}

export interface EmailTemplateTestFlowResult {
  summary: string
  details?: Record<string, string | boolean | number>
  /** When set, the user should complete payment manually in checkout. */
  checkoutUrl?: string
  checkoutPopupBlocked?: boolean
}

interface PurchaseWithOptionalConfirmResult {
  message: string
  paymentConfirmed: boolean
}

const PLAN_TRIAL_TIER = NITRO_PLAN_TIERS[0]
/** Growth tier includes add-ons with trial enabled (e.g. barcode scanning). */
const ADDON_TRIAL_TEST_TIER = NITRO_PLAN_TIERS[1]

const TRIAL_ALLOCATED_EMAIL_TEST_STEPS: EmailTemplateTestStepState[] = [
  { id: 'flush-cache', label: 'Flush Redis cache', status: 'pending' },
  { id: 'create-plan', label: 'Create plan with trial', status: 'pending' },
  { id: 'activate-plan', label: 'Activate plan', status: 'pending' },
  { id: 'add-to-cart', label: 'Add trial plan to cart', status: 'pending' },
  { id: 'confirm-payment', label: 'Confirm payment / complete checkout', status: 'pending' },
]

const PLAN_PURCHASE_EMAIL_TEST_STEPS: EmailTemplateTestStepState[] = [
  { id: 'flush-cache', label: 'Flush Redis cache', status: 'pending' },
  { id: 'create-plan', label: 'Create plan', status: 'pending' },
  { id: 'activate-plan', label: 'Activate plan', status: 'pending' },
  { id: 'add-to-cart', label: 'Add plan to cart', status: 'pending' },
  { id: 'confirm-payment', label: 'Initiate checkout / open payment page', status: 'pending' },
]

const ADDON_TRIAL_ALLOCATED_EMAIL_TEST_STEPS: EmailTemplateTestStepState[] = [
  { id: 'flush-cache', label: 'Flush Redis cache', status: 'pending' },
  { id: 'create-plan', label: 'Create plan with add-on trial', status: 'pending' },
  { id: 'activate-plan', label: 'Activate plan', status: 'pending' },
  { id: 'add-plan-trial-cart', label: 'Add plan trial to cart', status: 'pending' },
  { id: 'confirm-plan-payment', label: 'Confirm plan trial checkout', status: 'pending' },
  { id: 'add-addon-trial-cart', label: 'Add add-on trial to cart', status: 'pending' },
  { id: 'confirm-addon-payment', label: 'Confirm add-on trial checkout', status: 'pending' },
]

async function loadValidatedCatalog(): Promise<CatalogFeature[]> {
  const catalog = await fetchFeatures()
  const issues = validateNitroCatalog(catalog)
  if (issues.length > 0) {
    throw new Error(`Feature catalog incomplete: ${issues.join('; ')}`)
  }
  return catalog
}

async function flushCacheStep(onStepUpdate: EmailTemplateTestStepUpdater): Promise<void> {
  onStepUpdate('flush-cache', { status: 'running' })
  const flushResult = await flushRedisCache()
  onStepUpdate('flush-cache', {
    status: 'done',
    detail: flushResult.message,
  })
}

async function createAndActivatePlanStep(
  onStepUpdate: EmailTemplateTestStepUpdater,
  tier: NitroPlanTier,
  options: { trialEnabled: boolean; createDetailSuffix?: string },
): Promise<{ planId: string; planName: string }> {
  onStepUpdate('create-plan', { status: 'running' })
  const catalog = await loadValidatedCatalog()
  const payload = buildNitroTestPlanPayload(catalog, tier, { trialEnabled: options.trialEnabled })
  const createResult = await createPlan(payload)
  onStepUpdate('create-plan', {
    status: 'done',
    detail: `${payload.planName} (${createResult.planId})${options.createDetailSuffix ?? ''}`,
  })

  onStepUpdate('activate-plan', { status: 'running' })
  await updatePlanStatus(createResult.planId, { status: PlanStatus.ACTIVE })
  onStepUpdate('activate-plan', {
    status: 'done',
    detail: `Plan ${createResult.planId} is active`,
  })

  return { planId: createResult.planId, planName: payload.planName }
}

async function confirmPurchaseWithOptionalRedis(
  purchaseResult: MerchantPlanPurchaseResult,
  onStepUpdate: EmailTemplateTestStepUpdater,
  stepId: string,
  trialLabel: string,
): Promise<PurchaseWithOptionalConfirmResult> {
  if (purchaseResult.paymentHandoff) {
    let merchantId: string | undefined
    try {
      const invoice = await getInvoiceById(purchaseResult.paymentHandoff.invoiceId)
      merchantId = invoice.merchantId
    } catch {
      // Fall back to default merchant id in payment event builder.
    }

    const event = buildSucceededPaymentEventFromHandoff({
      ...purchaseResult.paymentHandoff,
      merchantId,
    })
    await publishToRedisStream(event, { redis: DEFAULT_REDIS_CONNECTION })
    onStepUpdate(stepId, {
      status: 'done',
      detail: `${purchaseResult.message} · Payment confirmed via Redis`,
    })
    return { message: purchaseResult.message, paymentConfirmed: true }
  }

  onStepUpdate(stepId, {
    status: 'done',
    detail: `${purchaseResult.message} · ${trialLabel}`,
  })
  return { message: purchaseResult.message, paymentConfirmed: false }
}

async function purchasePlanTrialCheckout(
  planId: string,
  onStepUpdate: EmailTemplateTestStepUpdater,
  addCartStepId: string,
  confirmStepId: string,
): Promise<PurchaseWithOptionalConfirmResult> {
  onStepUpdate(addCartStepId, { status: 'running' })
  await upsertMerchantCart({ planId, isTrial: true })
  const cartPreview = await getMerchantCart()
  onStepUpdate(addCartStepId, {
    status: 'done',
    detail: cartPreview.isTrial ? 'Plan trial cart ready' : 'Plan cart updated',
  })

  onStepUpdate(confirmStepId, { status: 'running' })
  const requiresBilling = requiresBillingAddressForCheckout({
    isTrial: cartPreview.isTrial,
    subscriptionAction: cartPreview.subscriptionAction,
  })
  const purchaseResult = await purchasePlanCart(
    buildInitiatePurchasePayload(undefined, requiresBilling),
  )

  return confirmPurchaseWithOptionalRedis(
    purchaseResult,
    onStepUpdate,
    confirmStepId,
    'Plan trial activated (no payment handoff)',
  )
}

function pickTrialEnabledAddon(plan: Parameters<typeof extractAddonCatalogItems>[0]): AddonCatalogItem {
  const trialAddons = extractAddonCatalogItems(plan).filter((addon) => addon.addonTrialEnabled)
  if (trialAddons.length === 0) {
    throw new Error('Created plan has no add-ons with trial enabled. Use Nitro Growth tier or higher.')
  }
  return trialAddons[0]
}

async function runTrialAllocatedEmailTestFlow(
  onStepUpdate: EmailTemplateTestStepUpdater,
): Promise<EmailTemplateTestFlowResult> {
  await flushCacheStep(onStepUpdate)
  const { planId, planName } = await createAndActivatePlanStep(onStepUpdate, PLAN_TRIAL_TIER, {
    trialEnabled: true,
  })

  onStepUpdate('add-to-cart', { status: 'running' })
  await upsertMerchantCart({ planId, isTrial: true })
  const cartPreview = await getMerchantCart()
  onStepUpdate('add-to-cart', {
    status: 'done',
    detail: cartPreview.isTrial ? 'Trial cart ready' : 'Cart updated',
  })

  onStepUpdate('confirm-payment', { status: 'running' })
  const requiresBilling = requiresBillingAddressForCheckout({
    isTrial: cartPreview.isTrial,
    subscriptionAction: cartPreview.subscriptionAction,
  })
  const purchaseResult = await purchasePlanCart(
    buildInitiatePurchasePayload(undefined, requiresBilling),
  )
  const { paymentConfirmed } = await confirmPurchaseWithOptionalRedis(
    purchaseResult,
    onStepUpdate,
    'confirm-payment',
    'Trial activated (no payment handoff)',
  )

  return {
    summary: `Trial checkout completed for ${planName}. Notification should be sent to the signed-in merchant email.`,
    details: {
      planId,
      planName,
      purchaseMessage: purchaseResult.message,
      trialCheckout: cartPreview.isTrial,
      paymentConfirmed,
    },
  }
}

async function runPlanPurchaseEmailTestFlow(
  onStepUpdate: EmailTemplateTestStepUpdater,
): Promise<EmailTemplateTestFlowResult> {
  await flushCacheStep(onStepUpdate)
  const { planId, planName } = await createAndActivatePlanStep(onStepUpdate, PLAN_TRIAL_TIER, {
    trialEnabled: false,
  })

  onStepUpdate('add-to-cart', { status: 'running' })
  const plan = await getPlanById(planId)
  await upsertMerchantCart({
    planId,
    billingCycle: BillingCycle.MONTHLY,
    features: buildDefaultCartSelections(plan),
  })
  const cartPreview = await getMerchantCart()
  onStepUpdate('add-to-cart', {
    status: 'done',
    detail: `${cartPreview.billingCycle ?? BillingCycle.MONTHLY} · ${formatCartSummary(cartPreview)}`,
  })

  onStepUpdate('confirm-payment', { status: 'running' })
  const purchaseResult = await purchasePlanCart(
    buildInitiatePurchasePayload(defaultBillingAddress, true),
  )

  if (!purchaseResult.checkoutUrl) {
    throw new Error('Paid plan purchase did not return a checkout URL.')
  }

  const checkoutOpened = handlePurchaseCheckoutResult(purchaseResult)
  const invoiceLabel = purchaseResult.paymentHandoff?.invoiceNumber ?? 'pending invoice'
  onStepUpdate('confirm-payment', {
    status: 'done',
    detail: checkoutOpened
      ? `Checkout opened in new tab · ${invoiceLabel}`
      : `Checkout ready · ${invoiceLabel} (popup may be blocked)`,
  })

  return {
    summary: `Complete payment in checkout to trigger the plan purchase email for ${planName}.`,
    checkoutUrl: purchaseResult.checkoutUrl,
    checkoutPopupBlocked: !checkoutOpened,
    details: {
      planId,
      planName,
      purchaseMessage: purchaseResult.message,
      invoiceNumber: purchaseResult.paymentHandoff?.invoiceNumber ?? '',
    },
  }
}

function formatCartSummary(cart: Awaited<ReturnType<typeof getMerchantCart>>): string {
  const total = cart.pricing?.grandTotal
  const currency = cart.pricing?.currency ?? cart.plan.baseCurrency
  if (total == null) {
    return 'Cart ready'
  }
  return `${currency} ${total}`
}

async function runAddonTrialAllocatedEmailTestFlow(
  onStepUpdate: EmailTemplateTestStepUpdater,
): Promise<EmailTemplateTestFlowResult> {
  await flushCacheStep(onStepUpdate)
  const { planId, planName } = await createAndActivatePlanStep(onStepUpdate, ADDON_TRIAL_TEST_TIER, {
    trialEnabled: true,
    createDetailSuffix: ' · includes trial-enabled add-ons',
  })

  await purchasePlanTrialCheckout(
    planId,
    onStepUpdate,
    'add-plan-trial-cart',
    'confirm-plan-payment',
  )

  const activeSubscription = await getActiveSubscription()
  const addon = pickTrialEnabledAddon(activeSubscription.plan)

  onStepUpdate('add-addon-trial-cart', { status: 'running' })
  await upsertAddonCart({
    planFeatureId: addon.planFeatureId,
    isAddonTrial: true,
    ...(addon.planFeatureAttributeId
      ? { planFeatureAttributeId: addon.planFeatureAttributeId }
      : {}),
  })
  const addonCartPreview = await getMerchantAddonCart()
  onStepUpdate('add-addon-trial-cart', {
    status: 'done',
    detail: `${addon.title} · ${addonCartPreview.isTrial ? 'Add-on trial cart ready' : 'Add-on cart updated'}`,
  })

  onStepUpdate('confirm-addon-payment', { status: 'running' })
  const addonRequiresBilling = requiresBillingAddressForCheckout({
    isTrial: addonCartPreview.isTrial,
  })
  const addonPurchaseResult = await purchaseAddonCart(
    buildInitiatePurchasePayload(undefined, addonRequiresBilling),
  )
  const { paymentConfirmed: addonPaymentConfirmed } = await confirmPurchaseWithOptionalRedis(
    addonPurchaseResult,
    onStepUpdate,
    'confirm-addon-payment',
    'Add-on trial activated (no payment handoff)',
  )

  return {
    summary: `Add-on trial checkout completed for ${addon.title} on ${planName}. Notification should be sent to the signed-in merchant email.`,
    details: {
      planId,
      planName,
      addonTitle: addon.title,
      addonSubscriptionId: addonPurchaseResult.addonSubscriptionId ?? '',
      addonPurchaseMessage: addonPurchaseResult.message,
      addonTrialCheckout: addonCartPreview.isTrial,
      addonPaymentConfirmed,
    },
  }
}

/** Registry of automated test flows keyed by template catalog id. */
export const EMAIL_TEMPLATE_TEST_FLOWS: Record<string, EmailTemplateTestFlowDefinition> = {
  'trial-allocated': {
    steps: TRIAL_ALLOCATED_EMAIL_TEST_STEPS,
    run: runTrialAllocatedEmailTestFlow,
  },
  'addon-trial-allocated': {
    steps: ADDON_TRIAL_ALLOCATED_EMAIL_TEST_STEPS,
    run: runAddonTrialAllocatedEmailTestFlow,
  },
  'payment-success-subscription-purchase': {
    steps: PLAN_PURCHASE_EMAIL_TEST_STEPS,
    run: runPlanPurchaseEmailTestFlow,
  },
}
