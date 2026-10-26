import type { BillingFromAddress, InvoiceBillingPeriodEntry } from '../types/subscription'
import { formatDateTime } from './planDisplay'

export function formatBillingFromAddress(address: BillingFromAddress | null | undefined): string {
  if (!address) {
    return '—'
  }

  const parts = [
    address.name,
    address.businessEmail,
    address.addressLine,
    address.city,
    address.stateProvince,
    address.postalZipCode,
    address.country,
  ].filter((part) => typeof part === 'string' && part.trim() !== '')

  return parts.length ? parts.join(', ') : '—'
}

export function formatInvoiceBillingPeriodRange(from: string, to: string): string {
  return `${formatDateTime(from)} → ${formatDateTime(to)}`
}

export function formatOverageHistoryBillingPeriod(
  from: string | null | undefined,
  to: string | null | undefined,
): string {
  if (!from || !to) {
    return '—'
  }

  return formatInvoiceBillingPeriodRange(from, to)
}

export function billingPeriodTypeLabel(type: InvoiceBillingPeriodEntry['type']): string {
  return type
}
