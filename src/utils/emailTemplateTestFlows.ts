import { fetchFeatures } from '../api/features'
import {
  getInvoiceById,
  getMerchantCart,
  purchasePlanCart,
  upsertMerchantCart,
} from '../api/merchant'
import { createPlan, updatePlanStatus } from '../api/plans'
import { DEFAULT_REDIS_CONNECTION, flushRedisCache, publishToRedisStream } from '../api/redisDevTools'
import type { CatalogFeature } from '../types/subscription'
import { PlanStatus } from '../types/subscription'
import { buildInitiatePurchasePayload, requiresBillingAddressForCheckout } from './billingAddress'
import {
  buildNitroTestPlanPayload,
  NITRO_PLAN_TIERS,
  validateNitroCatalog,
} from './nitroTestPlanBuilder'
import { buildSucceededPaymentEventFromHandoff } from './paymentEventBuilder'

export type TrialAllocatedEmailTestStepId =
  | 'flush-cache'
  | 'create-plan'
  | 'activate-plan'
  | 'add-to-cart'
  | 'confirm-payment'

export type EmailTemplateTestStepStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error'

export interface EmailTemplateTestStepState {
  id: TrialAllocatedEmailTestStepId
  label: string
  status: EmailTemplateTestStepStatus
  detail?: string
}

export const TRIAL_ALLOCATED_EMAIL_TEST_STEPS: EmailTemplateTestStepState[] = [
  { id: 'flush-cache', label: 'Flush Redis cache', status: 'pending' },
  { id: 'create-plan', label: 'Create plan with trial', status: 'pending' },
  { id: 'activate-plan', label: 'Activate plan', status: 'pending' },
  { id: 'add-to-cart', label: 'Add trial plan to cart', status: 'pending' },
  { id: 'confirm-payment', label: 'Confirm payment / complete checkout', status: 'pending' },
]

export interface TrialAllocatedEmailTestResult {
  planId: string
  planName: string
  purchaseMessage: string
  trialCheckout: boolean
  paymentConfirmed: boolean
}

export type TrialAllocatedEmailTestStepUpdater = (
  stepId: TrialAllocatedEmailTestStepId,
  update: Partial<Pick<EmailTemplateTestStepState, 'status' | 'detail'>>,
) => void

async function loadValidatedCatalog(): Promise<CatalogFeature[]> {
  const catalog = await fetchFeatures()
  const issues = validateNitroCatalog(catalog)
  if (issues.length > 0) {
    throw new Error(`Feature catalog incomplete: ${issues.join('; ')}`)
  }
  return catalog
}

export async function runTrialAllocatedEmailTestFlow(
  onStepUpdate: TrialAllocatedEmailTestStepUpdater,
): Promise<TrialAllocatedEmailTestResult> {
  const tier = NITRO_PLAN_TIERS[0]

  onStepUpdate('flush-cache', { status: 'running' })
  const flushResult = await flushRedisCache()
  onStepUpdate('flush-cache', {
    status: 'done',
    detail: flushResult.message,
  })

  onStepUpdate('create-plan', { status: 'running' })
  const catalog = await loadValidatedCatalog()
  const payload = buildNitroTestPlanPayload(catalog, tier, { trialEnabled: true })
  const createResult = await createPlan(payload)
  onStepUpdate('create-plan', {
    status: 'done',
    detail: `${payload.planName} (${createResult.planId})`,
  })

  onStepUpdate('activate-plan', { status: 'running' })
  await updatePlanStatus(createResult.planId, { status: PlanStatus.ACTIVE })
  onStepUpdate('activate-plan', {
    status: 'done',
    detail: `Plan ${createResult.planId} is active`,
  })

  onStepUpdate('add-to-cart', { status: 'running' })
  await upsertMerchantCart({ planId: createResult.planId, isTrial: true })
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

  let paymentConfirmed = false
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
    paymentConfirmed = true
    onStepUpdate('confirm-payment', {
      status: 'done',
      detail: `${purchaseResult.message} · Payment confirmed via Redis`,
    })
  } else {
    onStepUpdate('confirm-payment', {
      status: 'done',
      detail: `${purchaseResult.message} · Trial activated (no payment handoff)`,
    })
  }

  return {
    planId: createResult.planId,
    planName: payload.planName,
    purchaseMessage: purchaseResult.message,
    trialCheckout: cartPreview.isTrial,
    paymentConfirmed,
  }
}
