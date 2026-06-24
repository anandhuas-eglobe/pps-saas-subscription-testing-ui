export const RENEWAL_INTEGRATION_STREAMS = [
  'subscription.renewal.failed',
  'subscription.attribute.downgrade.rejected',
  'subscription.addon.cancellation.rejected',
  'subscription.addon.cancelled',
  'subscription.checkout.payment.requested',
] as const

export type RenewalIntegrationStream = (typeof RENEWAL_INTEGRATION_STREAMS)[number]

export const RENEWAL_STREAM_LABELS: Record<RenewalIntegrationStream, string> = {
  'subscription.renewal.failed': 'Renewal failed',
  'subscription.attribute.downgrade.rejected': 'Attribute downgrade rejected',
  'subscription.addon.cancellation.rejected': 'Add-on cancellation rejected',
  'subscription.addon.cancelled': 'Add-on cancelled',
  'subscription.checkout.payment.requested': 'Checkout payment requested',
}

export function getRenewalEventSummary(stream: string, payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return '—'
  }

  const data = payload as Record<string, unknown>

  switch (stream) {
    case 'subscription.renewal.failed':
      return [data.failureCode, data.failureReason].filter(Boolean).join(' — ') || 'Renewal failed'
    case 'subscription.attribute.downgrade.rejected':
      return `Attribute ${data.attributeCode}: usage ${data.currentUsage} exceeds scheduled limit ${data.requestedLimit}`
    case 'subscription.addon.cancellation.rejected':
      return `Add-on ${data.addonSubscriptionId} retained — ${data.reason ?? 'active usage'}`
    case 'subscription.addon.cancelled':
      return `Add-on ${data.addonSubscriptionId} cancelled`
    case 'subscription.checkout.payment.requested':
      return `Invoice ${data.invoiceNumber ?? data.invoiceId} — ${data.grandTotal ?? ''} ${data.currency ?? ''}`.trim()
    default:
      return JSON.stringify(payload).slice(0, 120)
  }
}

export function renewalStreamSeverity(
  stream: string,
): 'error' | 'warning' | 'info' | 'success' {
  if (stream === 'subscription.renewal.failed') return 'error'
  if (
    stream === 'subscription.attribute.downgrade.rejected' ||
    stream === 'subscription.addon.cancellation.rejected'
  ) {
    return 'warning'
  }
  if (stream === 'subscription.checkout.payment.requested') return 'success'
  return 'info'
}

export function eventMatchesMerchant(
  payload: unknown,
  merchantId: string,
): boolean {
  if (!payload || typeof payload !== 'object') return true
  const data = payload as Record<string, unknown>
  if (typeof data.merchantId !== 'string') return true
  return data.merchantId === merchantId
}
