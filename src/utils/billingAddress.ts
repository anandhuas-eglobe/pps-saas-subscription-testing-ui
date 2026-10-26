import type {
  BillingAddress,
  InitiateManualRenewalPayload,
  InitiatePlanPurchasePayload,
  ManualRenewalResponse,
} from '../types/subscription'
import { SubscriptionAction, type SubscriptionActionValue } from '../types/subscription'

export const defaultBillingAddress: BillingAddress = {
  street: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  country: 'US',
  zipCode: '94102',
}

/**
 * Normalizes invoice/API billing address JSON into the current TaxAddress shape.
 * Accepts legacy keys (stateProvince, zipPostalCode) for older stored invoices.
 */
export function normalizeBillingAddress(address: unknown): BillingAddress | null {
  if (!address || typeof address !== 'object') {
    return null
  }

  const raw = address as Record<string, unknown>
  const street = typeof raw.street === 'string' ? raw.street : ''
  const city = typeof raw.city === 'string' ? raw.city : ''
  const country = typeof raw.country === 'string' ? raw.country : ''
  const state =
    (typeof raw.state === 'string' ? raw.state : '') ||
    (typeof raw.stateProvince === 'string' ? raw.stateProvince : '')
  const zipCode =
    (typeof raw.zipCode === 'string' ? raw.zipCode : '') ||
    (typeof raw.zipPostalCode === 'string' ? raw.zipPostalCode : '')

  if (!street && !city && !state && !country && !zipCode) {
    return null
  }

  return { street, city, state, country, zipCode }
}

export function formatBillingAddress(address: unknown): string {
  const billing = normalizeBillingAddress(address)
  if (!billing) {
    return '—'
  }

  const parts = [
    billing.street,
    billing.city,
    billing.state,
    billing.country,
    billing.zipCode,
  ].filter((part) => part.trim() !== '')

  return parts.length ? parts.join(', ') : '—'
}

/**
 * Whether checkout must include billingAddress in the purchase POST body.
 * Mirrors subscription MS rules:
 * - Trial checkout: omit address
 * - Plan/attribute downgrade scheduling: omit address (no invoice)
 * - All other paid checkouts create an invoice and require address, even at $0
 */
export function requiresBillingAddressForCheckout(options: {
  isTrial?: boolean
  subscriptionAction?: SubscriptionActionValue | string | null
}): boolean {
  if (options.isTrial) {
    return false
  }

  if (options.subscriptionAction === SubscriptionAction.DOWNGRADE) {
    return false
  }

  return true
}

export function isBillingAddressComplete(address: BillingAddress): boolean {
  return (
    address.street.trim() !== '' &&
    address.city.trim() !== '' &&
    address.state.trim() !== '' &&
    address.country.trim() !== '' &&
    address.zipCode.trim() !== ''
  )
}

export function toBillingAddressPayload(address: BillingAddress): BillingAddress {
  return {
    street: address.street.trim(),
    city: address.city.trim(),
    state: address.state.trim(),
    country: address.country.trim(),
    zipCode: address.zipCode.trim(),
  }
}

/** Paid plan cart with $0 base total (matches subscription MS `baseGrandTotal` zero checkout). */
export function isZeroAmountPlanCheckout(cart: {
  isTrial: boolean
  pricing: { grandTotal: number; baseGrandTotal?: number }
}): boolean {
  if (cart.isTrial) {
    return false
  }
  const baseTotal = cart.pricing.baseGrandTotal ?? cart.pricing.grandTotal
  return baseTotal === 0
}

export function buildInitiatePurchasePayload(
  billingAddress: BillingAddress | undefined,
  requiresBilling: boolean,
  options?: { agreedToTerms?: boolean },
): InitiatePlanPurchasePayload {
  const payload: InitiatePlanPurchasePayload = {}

  if (requiresBilling) {
    if (!billingAddress || !isBillingAddressComplete(billingAddress)) {
      throw new Error('Billing address is required for paid checkout')
    }
    payload.billingAddress = toBillingAddressPayload(billingAddress)
  }

  if (options?.agreedToTerms) {
    payload.agreedToTerms = true
  }

  return payload
}

export function buildAttributePurchasePayload(
  billingAddress: BillingAddress,
): { billingAddress: BillingAddress } {
  if (!isBillingAddressComplete(billingAddress)) {
    throw new Error('Billing address is required')
  }

  return { billingAddress: toBillingAddressPayload(billingAddress) }
}

export function isZeroAmountRenewalPricing(pricing: {
  grandTotal: number
  baseGrandTotal?: number
}): boolean {
  return isZeroAmountPlanCheckout({
    isTrial: false,
    pricing: {
      grandTotal: pricing.grandTotal,
      baseGrandTotal: pricing.baseGrandTotal,
    },
  })
}

export function buildInitiateManualRenewalPayload(
  billingAddress: BillingAddress | undefined,
  includeBillingAddress: boolean,
  options?: { agreedToTerms?: boolean },
): InitiateManualRenewalPayload {
  const payload: InitiateManualRenewalPayload = {}

  if (includeBillingAddress) {
    if (!billingAddress || !isBillingAddressComplete(billingAddress)) {
      throw new Error('Billing address is required when no prior completed invoice address exists')
    }
    payload.billingAddress = toBillingAddressPayload(billingAddress)
  }

  if (options?.agreedToTerms) {
    payload.agreedToTerms = true
  }

  return payload
}

/** True when manual renewal still needs a paid checkout or Redis payment simulation. */
export function manualRenewalNeedsPaidPaymentConfirmation(
  result: ManualRenewalResponse,
): boolean {
  if (result.subscriptionId) {
    return false
  }
  if (result.invoice.status === 'COMPLETED') {
    return false
  }
  if (result.setupUrl) {
    return false
  }
  return result.invoice.grandTotal > 0 && result.invoice.status === 'PENDING'
}
