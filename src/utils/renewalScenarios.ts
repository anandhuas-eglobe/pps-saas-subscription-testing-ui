export type RenewalScenarioCategory = 'auto' | 'manual-preview' | 'manual-recovery' | 'validation'

export interface RenewalTestScenario {
  id: string
  category: RenewalScenarioCategory
  title: string
  description: string
  prepSteps: string[]
  expectedOutcome: string
  apiEndpoints: string[]
}

export const renewalTestScenarios: RenewalTestScenario[] = [
  {
    id: 'auto-normal',
    category: 'auto',
    title: 'Normal auto-renew (autoRenew=true)',
    description: 'Active subscription past end date renews on the current plan with renewing add-ons.',
    prepSteps: [
      'Purchase an active paid subscription with auto-renew enabled',
      'Expire subscription (set end_date <= now via DB or wait for natural expiry)',
      'Ensure no grace period is active',
    ],
    expectedOutcome: 'Scheduler creates SUBSCRIPTION_RENEWAL invoice and publishes payment request',
    apiEndpoints: ['Scheduler (every 10s)', 'GET /merchant/subscription/invoices'],
  },
  {
    id: 'auto-skip',
    category: 'auto',
    title: 'Auto-renew skip (autoRenew=false, no downgrade)',
    description: 'When auto-renew is off and no plan change is scheduled, the job unlocks and skips checkout.',
    prepSteps: [
      'Disable auto-renew on active subscription',
      'Expire subscription end date',
      'Do not schedule a plan downgrade',
    ],
    expectedOutcome: 'Job outcome skipped — no renewal invoice created',
    apiEndpoints: ['PUT /merchant/subscription/auto-renew/cancel'],
  },
  {
    id: 'auto-downgrade',
    category: 'auto',
    title: 'Auto-renew with scheduled downgrade',
    description: 'Expired subscription with auto-renew off but a scheduled plan change at end date triggers downgrade renewal.',
    prepSteps: [
      'Disable auto-renew',
      'Schedule a plan downgrade at end of cycle (purchase DOWNGRADE cart)',
      'Expire subscription end date',
    ],
    expectedOutcome: 'Downgrade renewal checkout with SUBSCRIPTION_DOWNGRADE invoice',
    apiEndpoints: ['POST /merchant/subscription/plan/purchase', 'Scheduler'],
  },
  {
    id: 'auto-migration',
    category: 'auto',
    title: 'Plan migration renewal',
    description: 'Inactive plan with migrationPlanId renews onto the migration target plan.',
    prepSteps: [
      'Have subscription on a plan that becomes INACTIVE with a migration plan configured',
      'Expire subscription end date with auto-renew on',
    ],
    expectedOutcome: 'MIGRATION renewal type checkout on target plan',
    apiEndpoints: ['Scheduler', 'Admin plan status update'],
  },
  {
    id: 'validation-downgrade-usage',
    category: 'validation',
    title: 'Downgrade blocked by usage',
    description: 'Scheduled downgrade fails when effective usage exceeds target plan limits.',
    prepSteps: [
      'Schedule downgrade to a plan with lower limits',
      'Log usage above target limits via Usage Simulation',
      'Trigger renewal (auto or manual recovery)',
    ],
    expectedOutcome: 'RENEWAL_FAILED status, failureCode PLAN_DOWNGRADE_USAGE_EXCEEDED',
    apiEndpoints: ['POST /merchant/subscription/renew', 'Scheduler'],
  },
  {
    id: 'validation-addon-retain',
    category: 'validation',
    title: 'Non-renewing add-on retained due to usage',
    description: 'Add-on with autoRenew=false and active usage is retained at renewal.',
    prepSteps: [
      'Purchase add-on and disable its auto-renew',
      'Log usage on add-on attribute',
      'Trigger renewal',
    ],
    expectedOutcome: 'Addon autoRenew set true, subscription.addon.cancellation.rejected event',
    apiEndpoints: ['Scheduler', 'POST /merchant/subscription/addon/cancel'],
  },
  {
    id: 'preview-available',
    category: 'manual-preview',
    title: 'Manual renewal preview — available',
    description: 'Pricing estimate when auto-renew is off and no downgrade is scheduled.',
    prepSteps: [
      'Active subscription with auto-renew disabled',
      'No scheduled plan downgrade',
    ],
    expectedOutcome: 'GET preview returns available:true with plan and pricing',
    apiEndpoints: ['GET /merchant/subscription/renewal/preview'],
  },
  {
    id: 'preview-auto-renew',
    category: 'manual-preview',
    title: 'Manual renewal preview — auto-renew enabled',
    description: 'Preview unavailable when auto-renew is still on.',
    prepSteps: ['Keep auto-renew enabled on active subscription'],
    expectedOutcome: 'available:false, reason AUTO_RENEW_ENABLED',
    apiEndpoints: ['GET /merchant/subscription/renewal/preview'],
  },
  {
    id: 'preview-scheduled-change',
    category: 'manual-preview',
    title: 'Manual renewal preview — scheduled plan change',
    description: 'Preview blocked when a downgrade is scheduled.',
    prepSteps: ['Schedule a plan downgrade at end of cycle'],
    expectedOutcome: 'available:false, reason SCHEDULED_PLAN_CHANGE',
    apiEndpoints: ['GET /merchant/subscription/renewal/preview'],
  },
  {
    id: 'recovery-grace',
    category: 'manual-recovery',
    title: 'Manual recovery — grace period',
    description: 'POST /renew during grace period after failed auto-renew payment.',
    prepSteps: [
      'Let auto-renew create invoice but do not confirm payment (or fail payment)',
      'Subscription enters grace period (ACTIVE + gracePeriodDate set)',
    ],
    expectedOutcome: '200 with renewal invoice and paymentHandoff',
    apiEndpoints: ['POST /merchant/subscription/renew'],
  },
  {
    id: 'recovery-failed',
    category: 'manual-recovery',
    title: 'Manual recovery — RENEWAL_FAILED',
    description: 'Recovery checkout after grace period expires or validation blocks renewal.',
    prepSteps: ['Subscription status RENEWAL_FAILED'],
    expectedOutcome: '200 processed or 422 with failure details',
    apiEndpoints: ['POST /merchant/subscription/renew'],
  },
  {
    id: 'recovery-cancelled',
    category: 'manual-recovery',
    title: 'Manual recovery — MERCHANT_CANCELLED',
    description: 'Merchant-cancelled subscription can still recover via manual renewal.',
    prepSteps: ['Subscription status MERCHANT_CANCELLED'],
    expectedOutcome: '200 with renewal checkout',
    apiEndpoints: ['POST /merchant/subscription/renew'],
  },
  {
    id: 'recovery-not-eligible',
    category: 'manual-recovery',
    title: 'Manual recovery — not eligible',
    description: 'Active subscription without grace period cannot use POST /renew.',
    prepSteps: ['ACTIVE subscription, no grace period, not RENEWAL_FAILED'],
    expectedOutcome: '400 SUBSCRIPTION_NOT_ELIGIBLE',
    apiEndpoints: ['POST /merchant/subscription/renew'],
  },
  {
    id: 'recovery-idempotent',
    category: 'manual-recovery',
    title: 'Manual recovery — existing invoice',
    description: 'Duplicate renewal request returns existing pending invoice.',
    prepSteps: [
      'Initiate manual renewal successfully',
      'Call POST /renew again before payment completes',
    ],
    expectedOutcome: '200 outcome:existing_invoice',
    apiEndpoints: ['POST /merchant/subscription/renew'],
  },
  {
    id: 'recovery-payment',
    category: 'manual-recovery',
    title: 'Complete renewal payment',
    description: 'Confirm payment for renewal invoice via Redis stream.',
    prepSteps: [
      'Initiate renewal (auto or manual) to get paymentHandoff',
      'Publish PAYMENT_SUCCEEDED to payment.invoice.status.updated',
    ],
    expectedOutcome: 'Invoice COMPLETED, subscription extended, new billing cycle in history',
    apiEndpoints: ['Redis payment.invoice.status.updated', 'GET /merchant/subscription/history'],
  },
]

export const renewalScenarioCategoryLabels: Record<RenewalScenarioCategory, string> = {
  auto: 'Auto-renew (scheduler)',
  'manual-preview': 'Manual renewal preview',
  'manual-recovery': 'Manual recovery (POST /renew)',
  validation: 'Validation & edge cases',
}
