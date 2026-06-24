import type {
  ActiveSubscriptionDetail,
  ManualRenewalEligibleState,
  ManualSubscriptionRenewalPreviewResponse,
} from '../types/subscription'

export interface AutoRenewEligibilityCheck {
  eligible: boolean
  reasons: string[]
  notes: string[]
}

export interface ManualRenewalEligibilityCheck {
  eligible: boolean
  eligibleState: ManualRenewalEligibleState | null
  reasons: string[]
}

export function isInGracePeriod(
  subscription: Pick<ActiveSubscriptionDetail, 'gracePeriodDate' | 'status'>,
  asOf = new Date(),
): boolean {
  if (subscription.gracePeriodDate == null) {
    return false
  }

  const allowedStatus = subscription.status === 'ACTIVE' || subscription.status === 'RENEWAL_FAILED'
  if (!allowedStatus) {
    return false
  }

  const graceEnd = new Date(subscription.gracePeriodDate)
  graceEnd.setHours(23, 59, 59, 999)
  return asOf.getTime() <= graceEnd.getTime()
}

export function resolveManualRenewalEligibleState(
  subscription: ActiveSubscriptionDetail,
  asOf = new Date(),
): ManualRenewalEligibleState | null {
  if (subscription.status === 'RENEWAL_FAILED') {
    return 'RENEWAL_FAILED'
  }

  if (subscription.status === 'MERCHANT_CANCELLED') {
    return 'CANCELLED'
  }

  if (isInGracePeriod(subscription, asOf)) {
    return 'GRACE_PERIOD'
  }

  return null
}

export function checkAutoRenewEligibility(
  subscription: ActiveSubscriptionDetail,
  asOf = new Date(),
): AutoRenewEligibilityCheck {
  const reasons: string[] = []
  const notes: string[] = []

  if (subscription.status !== 'ACTIVE') {
    reasons.push(`Status must be ACTIVE (current: ${subscription.status})`)
  }

  if (subscription.isTrial) {
    reasons.push('Trial subscriptions are excluded from auto-renew')
  }

  if (subscription.gracePeriodDate != null) {
    reasons.push('Subscriptions in grace period are excluded from auto-renew batch')
  }

  const endDate = new Date(subscription.endDate)
  if (endDate.getTime() > asOf.getTime()) {
    reasons.push(`End date is in the future (${subscription.endDate})`)
    notes.push('Use Extend Subscription or set end_date in DB to expire the subscription')
  }

  if (!subscription.autoRenew) {
    notes.push('autoRenew=false: job will skip unless a plan downgrade is scheduled at end date')
  }

  notes.push('Auto-renew scheduler runs every 10 seconds when SUBSCRIPTION_RENEWAL_ENABLED is true')

  return {
    eligible: reasons.length === 0,
    reasons,
    notes,
  }
}

export function checkManualRenewalEligibility(
  subscription: ActiveSubscriptionDetail,
  asOf = new Date(),
): ManualRenewalEligibilityCheck {
  const eligibleState = resolveManualRenewalEligibleState(subscription, asOf)

  if (eligibleState) {
    return { eligible: true, eligibleState, reasons: [] }
  }

  const reasons = [
    `POST /renew requires RENEWAL_FAILED, MERCHANT_CANCELLED, or grace period (status: ${subscription.status})`,
  ]

  if (subscription.gracePeriodDate == null) {
    reasons.push('No grace period date set on subscription')
  } else if (!isInGracePeriod(subscription, asOf)) {
    reasons.push('Grace period has expired')
  }

  return { eligible: false, eligibleState: null, reasons }
}

export function describePreviewAvailability(
  preview: ManualSubscriptionRenewalPreviewResponse,
): { available: boolean; summary: string } {
  if (preview.available) {
    return {
      available: true,
      summary: `Preview available — estimated ${preview.pricing.grandTotal} ${preview.pricing.currency}`,
    }
  }

  return {
    available: false,
    summary: `${preview.reason}: ${preview.message}`,
  }
}
