export type OverageScenarioCategory =
  | 'usage'
  | 'auto-charge'
  | 'manual-payment'
  | 'reseller'
  | 'renewal'

export interface OverageTestScenario {
  id: string
  category: OverageScenarioCategory
  title: string
  description: string
  prepSteps: string[]
  expectedOutcome: string
  apiEndpoints: string[]
}

export const overageTestScenarios: OverageTestScenario[] = [
  {
    id: 'usage-record',
    category: 'usage',
    title: 'Record subscription usage overage',
    description:
      'Confirm usage beyond the plan limit on an overage-enabled attribute. Creates a pending overage row.',
    prepSteps: [
      'Active subscription on a plan with overage enabled on at least one attribute',
      'Use usage at or above the attribute limit',
      'Run validate → log → confirm (or Run full flow)',
    ],
    expectedOutcome:
      'Pending overage row created; overage history may appear after auto-charge settlement threshold',
    apiEndpoints: ['POST /merchant/usage-tracking/log', 'PUT /merchant/usage-tracking/confirm'],
  },
  {
    id: 'usage-blocked',
    category: 'usage',
    title: 'Overage blocked when not enabled on attribute',
    description: 'Usage beyond limit on an attribute without overage pricing is rejected.',
    prepSteps: ['Select attribute with overage disabled', 'Exceed usage limit and attempt log/confirm'],
    expectedOutcome: 'Validation or log failure — no overage row created',
    apiEndpoints: ['GET /merchant/usage-tracking/validate'],
  },
  {
    id: 'auto-charge-settle',
    category: 'auto-charge',
    title: 'Auto-charge settlement threshold',
    description:
      'When total pending overage reaches plan overageAutoChargeAmount, pending rows move to overage history.',
    prepSteps: [
      'Note plan overageAutoChargeAmount (e.g. $50)',
      'Generate enough confirmed overage units to meet or exceed that total',
      'Refresh overage history',
    ],
    expectedOutcome: 'PROCESSING history rows created; auto-charge invoice may be created (check Invoices)',
    apiEndpoints: ['Usage confirm → internal overage handler', 'GET /merchant/overage-tracking'],
  },
  {
    id: 'threshold-max',
    category: 'auto-charge',
    title: 'Overage max threshold flag',
    description:
      'When combined pending + unsettled overage exceeds overageMaxAllowedAmount, subscription isThresholdReached is set.',
    prepSteps: [
      'Accumulate overage history and pending amounts toward plan overageMaxAllowedAmount',
      'Refresh active subscription',
    ],
    expectedOutcome: 'isThresholdReached=true on active subscription',
    apiEndpoints: ['GET /merchant/subscription/active'],
  },
  {
    id: 'manual-payment',
    category: 'manual-payment',
    title: 'Manual overage payment (FAILED records)',
    description: 'Pay outstanding failed overage via manual payment checkout.',
    prepSteps: [
      'Have FAILED overage history rows (e.g. after failed payment simulation)',
      'POST manual-payment',
    ],
    expectedOutcome: '200 with paymentHandoff; confirm via Redis to mark PAID',
    apiEndpoints: [
      'POST /merchant/overage-tracking/manual-payment',
      'Redis payment.invoice.status.updated',
    ],
  },
  {
    id: 'reseller-overage',
    category: 'reseller',
    title: 'Reseller overage event',
    description: 'External order service publishes reseller overage to Redis stream.',
    prepSteps: [
      'MESSAGING_PROVIDER=redis on subscription service',
      'Publish ResellerOverageRequested with merchantId and overageAmount',
    ],
    expectedOutcome: 'RESELLER overage history row and invoice created',
    apiEndpoints: ['Redis order.reseller.overage.requested'],
  },
  {
    id: 'renewal-merge',
    category: 'renewal',
    title: 'Pending overage merged into renewal',
    description: 'Failed/pending overage charges are merged into the renewal invoice at checkout.',
    prepSteps: [
      'Accumulate pending or failed overage',
      'Trigger subscription renewal (auto or manual recovery)',
      'Complete renewal payment',
    ],
    expectedOutcome: 'Renewal invoice includes overage line items; overage rows settled',
    apiEndpoints: ['POST /merchant/subscription/renew', 'Scheduler auto-renew'],
  },
]

export const overageScenarioCategoryLabels: Record<OverageScenarioCategory, string> = {
  usage: 'Usage tracking',
  'auto-charge': 'Auto-charge & threshold',
  'manual-payment': 'Manual payment',
  reseller: 'Reseller overage',
  renewal: 'Renewal merge',
}
