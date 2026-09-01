import { PlanStatus } from '../types/subscription'

export function isDraftPlan(status: string | null | undefined): boolean {
  return status?.toUpperCase() === PlanStatus.DRAFT
}

export function planStatusColor(status: string): 'default' | 'success' | 'warning' | 'error' {
  switch (status.toUpperCase()) {
    case PlanStatus.ACTIVE:
      return 'success'
    case PlanStatus.DRAFT:
      return 'warning'
    case PlanStatus.INACTIVE:
    case PlanStatus.DISCONTINUED:
      return 'error'
    default:
      return 'default'
  }
}

export function formatMoney(currency: string, amount: number | null | undefined): string {
  if (amount == null) {
    return '—'
  }
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

export function formatTrialGrace(enabled: boolean, days: number | null): string {
  if (!enabled) {
    return 'Disabled'
  }
  if (days == null) {
    return 'Enabled (days not set)'
  }
  return `${days} day${days === 1 ? '' : 's'}`
}

export function subscriptionStatusColor(
  status: string,
): 'default' | 'success' | 'warning' | 'error' {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return 'success'
    case 'TRIAL':
    case 'PENDING':
      return 'warning'
    case 'CANCELLED':
    case 'EXPIRED':
    case 'INACTIVE':
      return 'error'
    default:
      return 'default'
  }
}

export function addonSubscriptionStatusColor(
  status: string,
): 'default' | 'success' | 'warning' | 'error' {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return 'success'
    case 'TRIAL_EXPIRED':
      return 'warning'
    case 'MERCHANT_CANCELLED':
    case 'RENEWAL_FAILED':
      return 'error'
    default:
      return 'default'
  }
}

export function formatUsageLimit(
  usageType: string,
  usedCount: number,
  usageLimit: number | null,
  scheduledUsageLimit?: number | null,
): string {
  if (usageType.toUpperCase() === 'UNLIMITED') {
    return `${usedCount.toLocaleString()} used · Unlimited`
  }

  const limit = usageLimit ?? scheduledUsageLimit
  if (limit == null) {
    return `${usedCount.toLocaleString()} used`
  }

  return `${usedCount.toLocaleString()} / ${limit.toLocaleString()}`
}

export function formatDateOnly(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString()
}

/** Format an ISO timestamp for `<input type="datetime-local" />`. */
export function toDatetimeLocalInputValue(value: string | null | undefined): string {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Parse a datetime-local input value to ISO 8601 for API payloads. */
export function datetimeLocalInputToIso(value: string): string {
  return new Date(value).toISOString()
}

export function invoiceStatusColor(
  status: string,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'success'
    case 'PENDING':
      return 'warning'
    case 'PROCESSING':
      return 'info'
    case 'FAILED':
      return 'error'
    default:
      return 'default'
  }
}
