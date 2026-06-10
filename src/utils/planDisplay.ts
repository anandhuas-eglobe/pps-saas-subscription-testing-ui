import { PlanStatus } from '../types/subscription'

export function planStatusColor(status: string): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case PlanStatus.ACTIVE:
      return 'success'
    case PlanStatus.DRAFT:
      return 'warning'
    case PlanStatus.INACTIVE:
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
