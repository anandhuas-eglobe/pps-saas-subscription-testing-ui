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
import type { CatalogFeature, MerchantCartPreview, MerchantPlanPurchaseResult } from '../types/subscription'
import { BillingCycle, FeatureType, PlanStatus, SubscriptionAction } from '../types/subscription'
import {
  defaultAddonAttributeValue,
  extractAddonCatalogItems,
  type AddonCatalogItem,
} from './addonBuilder'
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
  /** Optional second phase after manual payment (e.g. plan checkout before add-on steps). */
  continueRun?: (onStepUpdate: EmailTemplateTestStepUpdater) => Promise<EmailTemplateTestFlowResult>
}

export interface EmailTemplateTestFlowResult {
  summary: string
  details?: Record<string, string | boolean | number>
  /** When set, the user should complete payment manually in checkout. */
  checkoutUrl?: string
  checkoutPopupBlocked?: boolean
  /** When true, show a continue button to run {@link EmailTemplateTestFlowDefinition.continueRun}. */
  awaitingContinue?: boolean
  continueLabel?: string
}

interface PurchaseWithOptionalConfirmResult {
  message: string
  paymentConfirmed: boolean
}

const PLAN_TRIAL_TIER = NITRO_PLAN_TIERS[0]
/** Growth tier includes paid add-ons (e.g. barcode scanning). */
const ADDON_PURCHASE_TEST_TIER = NITRO_PLAN_TIERS[1]
const ADDON_TRIAL_TEST_TIER = NITRO_PLAN_TIERS[1]
/** Higher-tier plan used as the upgrade target. */
const PLAN_UPGRADE_PREMIUM_TIER = NITRO_PLAN_TIERS[4]

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

const PLAN_UPGRADE_EMAIL_TEST_STEPS: EmailTemplateTestStepState[] = [
  { id: 'create-premium-plan', label: 'Create premium plan', status: 'pending' },
  { id: 'activate-premium-plan', label: 'Activate premium plan', status: 'pending' },
  { id: 'add-upgrade-cart', label: 'Add premium plan to cart (upgrade)', status: 'pending' },
  { id: 'confirm-upgrade-payment', label: 'Initiate upgrade checkout / open payment page', status: 'pending' },
]

const ADDON_PURCHASE_EMAIL_TEST_STEPS: EmailTemplateTestStepState[] = [
  { id: 'flush-cache', label: 'Flush Redis cache', status: 'pending' },
  { id: 'create-plan', label: 'Create plan with add-ons', status: 'pending' },
  { id: 'activate-plan', label: 'Activate plan', status: 'pending' },
  { id: 'add-plan-cart', label: 'Add plan to cart', status: 'pending' },
  { id: 'confirm-plan-payment', label: 'Initiate plan checkout / open payment page', status: 'pending' },
  { id: 'add-addon-cart', label: 'Add paid add-on to cart', status: 'pending' },
  { id: 'confirm-addon-payment', label: 'Initiate add-on checkout / open payment page', status: 'pending' },
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
  options: {
    trialEnabled: boolean
    createDetailSuffix?: string
    createStepId?: string
    activateStepId?: string
  },
): Promise<{ planId: string; planName: string }> {
  const createStepId = options.createStepId ?? 'create-plan'
  const activateStepId = options.activateStepId ?? 'activate-plan'

  onStepUpdate(createStepId, { status: 'running' })
  const catalog = await loadValidatedCatalog()
  const payload = buildNitroTestPlanPayload(catalog, tier, { trialEnabled: options.trialEnabled })
  const createResult = await createPlan(payload)
  onStepUpdate(createStepId, {
    status: 'done',
    detail: `${payload.planName} (${createResult.planId})${options.createDetailSuffix ?? ''}`,
  })

  onStepUpdate(activateStepId, { status: 'running' })
  await updatePlanStatus(createResult.planId, { status: PlanStatus.ACTIVE })
  onStepUpdate(activateStepId, {
    status: 'done',
    detail: `Plan ${createResult.planId} is active`,
  })

  return { planId: createResult.planId, planName: payload.planName }
}

async function upsertPaidPlanCart(planId: string): Promise<MerchantCartPreview> {
  const plan = await getPlanById(planId)
  await upsertMerchantCart({
    planId,
    billingCycle: BillingCycle.MONTHLY,
    features: buildDefaultCartSelections(plan),
  })
  return getMerchantCart()
}

async function requireActivePaidSubscription(): Promise<{
  planId: string
  planName: string
}> {
  const active = await getActiveSubscription()
  if (active.subscription.isTrial) {
    throw new Error(
      'Active subscription is still in trial. Complete the plan purchase test first with a paid checkout.',
    )
  }

  return {
    planId: active.plan.id,
    planName: active.plan.planName,
  }
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

function pickPurchasableAddon(plan: Parameters<typeof extractAddonCatalogItems>[0]): AddonCatalogItem {
  const addons = extractAddonCatalogItems(plan)
  if (addons.length === 0) {
    throw new Error('Active plan has no purchasable add-ons.')
  }

  return addons.find((addon) => addon.featureType === FeatureType.SIMPLE) ?? addons[0]
}

function buildPaidAddonCartPayload(addon: AddonCatalogItem) {
  return {
    planFeatureId: addon.planFeatureId,
    isAddonTrial: false,
    ...(addon.planFeatureAttributeId
      ? { planFeatureAttributeId: addon.planFeatureAttributeId }
      : {}),
    ...(addon.featureType !== FeatureType.SIMPLE && addon.attribute
      ? { value: defaultAddonAttributeValue(addon.attribute) }
      : {}),
  }
}

async function openPlanCheckout(
  onStepUpdate: EmailTemplateTestStepUpdater,
  confirmStepId: string,
): Promise<{ purchaseResult: MerchantPlanPurchaseResult; checkoutOpened: boolean }> {
  onStepUpdate(confirmStepId, { status: 'running' })
  const purchaseResult = await purchasePlanCart(
    buildInitiatePurchasePayload(defaultBillingAddress, true),
  )

  if (!purchaseResult.checkoutUrl) {
    throw new Error('Plan purchase did not return a checkout URL.')
  }

  const checkoutOpened = handlePurchaseCheckoutResult(purchaseResult)
  const invoiceLabel = purchaseResult.paymentHandoff?.invoiceNumber ?? 'pending invoice'
  onStepUpdate(confirmStepId, {
    status: 'done',
    detail: checkoutOpened
      ? `Checkout opened in new tab · ${invoiceLabel}`
      : `Checkout ready · ${invoiceLabel} (popup may be blocked)`,
  })

  return { purchaseResult, checkoutOpened }
}

async function openAddonCheckout(
  onStepUpdate: EmailTemplateTestStepUpdater,
  confirmStepId: string,
): Promise<{
  purchaseResult: Awaited<ReturnType<typeof purchaseAddonCart>>
  checkoutOpened: boolean
}> {
  onStepUpdate(confirmStepId, { status: 'running' })
  const addonCartPreview = await getMerchantAddonCart()
  const requiresBilling = requiresBillingAddressForCheckout({
    isTrial: addonCartPreview.isTrial,
  })
  const purchaseResult = await purchaseAddonCart(
    buildInitiatePurchasePayload(defaultBillingAddress, requiresBilling),
  )

  if (!purchaseResult.checkoutUrl) {
    throw new Error('Add-on purchase did not return a checkout URL.')
  }

  const checkoutOpened = handlePurchaseCheckoutResult(purchaseResult)
  const invoiceLabel = purchaseResult.paymentHandoff?.invoiceNumber ?? 'pending invoice'
  onStepUpdate(confirmStepId, {
    status: 'done',
    detail: checkoutOpened
      ? `Add-on checkout opened · ${invoiceLabel}`
      : `Add-on checkout ready · ${invoiceLabel} (popup may be blocked)`,
  })

  return { purchaseResult, checkoutOpened }
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
  const cartPreview = await upsertPaidPlanCart(planId)
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

async function runPlanUpgradeEmailTestFlow(
  onStepUpdate: EmailTemplateTestStepUpdater,
): Promise<EmailTemplateTestFlowResult> {
  const currentSubscription = await requireActivePaidSubscription()

  const premium = await createAndActivatePlanStep(onStepUpdate, PLAN_UPGRADE_PREMIUM_TIER, {
    trialEnabled: false,
    createStepId: 'create-premium-plan',
    activateStepId: 'activate-premium-plan',
    createDetailSuffix: ' · upgrade target',
  })

  onStepUpdate('add-upgrade-cart', { status: 'running' })
  const upgradeCart = await upsertPaidPlanCart(premium.planId)
  if (upgradeCart.subscriptionAction !== SubscriptionAction.UPGRADE) {
    throw new Error(
      `Expected upgrade cart but got subscriptionAction=${upgradeCart.subscriptionAction}. ` +
        `Complete the plan purchase test first and finish payment on ${currentSubscription.planName}.`,
    )
  }
  onStepUpdate('add-upgrade-cart', {
    status: 'done',
    detail: `${upgradeCart.subscriptionAction} · ${formatCartSummary(upgradeCart)}`,
  })

  onStepUpdate('confirm-upgrade-payment', { status: 'running' })
  const upgradePurchase = await purchasePlanCart(
    buildInitiatePurchasePayload(defaultBillingAddress, true),
  )

  if (!upgradePurchase.checkoutUrl) {
    throw new Error('Plan upgrade did not return a checkout URL.')
  }

  const checkoutOpened = handlePurchaseCheckoutResult(upgradePurchase)
  const invoiceLabel = upgradePurchase.paymentHandoff?.invoiceNumber ?? 'pending invoice'
  onStepUpdate('confirm-upgrade-payment', {
    status: 'done',
    detail: checkoutOpened
      ? `Upgrade checkout opened · ${invoiceLabel}`
      : `Upgrade checkout ready · ${invoiceLabel} (popup may be blocked)`,
  })

  return {
    summary: `Upgrading from ${currentSubscription.planName} to ${premium.planName}. Complete payment in checkout to trigger the plan upgrade email.`,
    checkoutUrl: upgradePurchase.checkoutUrl,
    checkoutPopupBlocked: !checkoutOpened,
    details: {
      currentPlanId: currentSubscription.planId,
      currentPlanName: currentSubscription.planName,
      premiumPlanId: premium.planId,
      premiumPlanName: premium.planName,
      upgradePurchaseMessage: upgradePurchase.message,
      upgradeInvoiceNumber: upgradePurchase.paymentHandoff?.invoiceNumber ?? '',
    },
  }
}

function formatAddonCartSummary(cart: Awaited<ReturnType<typeof getMerchantAddonCart>>): string {
  const total = cart.pricing?.grandTotal
  const currency = cart.pricing?.currency ?? cart.baseCurrency
  if (total == null) {
    return 'Add-on cart ready'
  }
  return `${currency} ${total}`
}

function formatCartSummary(cart: Awaited<ReturnType<typeof getMerchantCart>>): string {
  const total = cart.pricing?.grandTotal
  const currency = cart.pricing?.currency ?? cart.plan.baseCurrency
  if (total == null) {
    return 'Cart ready'
  }
  return `${currency} ${total}`
}

async function runAddonPurchaseEmailTestFlowPhase1(
  onStepUpdate: EmailTemplateTestStepUpdater,
): Promise<EmailTemplateTestFlowResult> {
  await flushCacheStep(onStepUpdate)
  const { planId, planName } = await createAndActivatePlanStep(onStepUpdate, ADDON_PURCHASE_TEST_TIER, {
    trialEnabled: false,
    createDetailSuffix: ' · includes paid add-ons',
  })

  onStepUpdate('add-plan-cart', { status: 'running' })
  const cartPreview = await upsertPaidPlanCart(planId)
  onStepUpdate('add-plan-cart', {
    status: 'done',
    detail: `${cartPreview.billingCycle ?? BillingCycle.MONTHLY} · ${formatCartSummary(cartPreview)}`,
  })

  const { purchaseResult, checkoutOpened } = await openPlanCheckout(onStepUpdate, 'confirm-plan-payment')

  return {
    summary: `Complete plan payment in checkout for ${planName}, then click Continue to purchase an add-on.`,
    checkoutUrl: purchaseResult.checkoutUrl,
    checkoutPopupBlocked: !checkoutOpened,
    awaitingContinue: true,
    continueLabel: 'Continue after plan payment',
    details: {
      planId,
      planName,
      planPurchaseMessage: purchaseResult.message,
      planInvoiceNumber: purchaseResult.paymentHandoff?.invoiceNumber ?? '',
    },
  }
}

async function runAddonPurchaseEmailTestFlowPhase2(
  onStepUpdate: EmailTemplateTestStepUpdater,
): Promise<EmailTemplateTestFlowResult> {
  const activeSubscription = await getActiveSubscription()
  if (activeSubscription.subscription.isTrial) {
    throw new Error(
      'Active subscription is still in trial. Finish the plan checkout payment first, then continue.',
    )
  }

  const addon = pickPurchasableAddon(activeSubscription.plan)

  onStepUpdate('add-addon-cart', { status: 'running' })
  await upsertAddonCart(buildPaidAddonCartPayload(addon))
  const addonCartPreview = await getMerchantAddonCart()
  onStepUpdate('add-addon-cart', {
    status: 'done',
    detail: `${addon.title} · ${formatAddonCartSummary(addonCartPreview)}`,
  })

  const { purchaseResult: addonPurchase, checkoutOpened } = await openAddonCheckout(
    onStepUpdate,
    'confirm-addon-payment',
  )

  return {
    summary: `Complete add-on payment in checkout to trigger the add-on purchase email for ${addon.title}.`,
    checkoutUrl: addonPurchase.checkoutUrl,
    checkoutPopupBlocked: !checkoutOpened,
    details: {
      planId: activeSubscription.plan.id,
      planName: activeSubscription.plan.planName,
      addonTitle: addon.title,
      addonPurchaseMessage: addonPurchase.message,
      addonInvoiceNumber: addonPurchase.paymentHandoff?.invoiceNumber ?? '',
    },
  }
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
  'payment-success-subscription-upgrade': {
    steps: PLAN_UPGRADE_EMAIL_TEST_STEPS,
    run: runPlanUpgradeEmailTestFlow,
  },
  'payment-success-addon-purchase': {
    steps: ADDON_PURCHASE_EMAIL_TEST_STEPS,
    run: runAddonPurchaseEmailTestFlowPhase1,
    continueRun: runAddonPurchaseEmailTestFlowPhase2,
  },
}
