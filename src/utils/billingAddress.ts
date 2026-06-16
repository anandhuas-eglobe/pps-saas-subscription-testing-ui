import type { BillingAddress, InitiatePlanPurchasePayload } from '../types/subscription'

export const defaultBillingAddress: BillingAddress = {
  street: '123 Main St',
  city: 'San Francisco',
  stateProvince: 'CA',
  country: 'US',
  zipPostalCode: '94102',
}

export function requiresBillingAddressForCheckout(options: {
  isTrial?: boolean
  grandTotal: number
}): boolean {
  return !options.isTrial && options.grandTotal > 0
}

export function isBillingAddressComplete(address: BillingAddress): boolean {
  return (
    address.street.trim() !== '' &&
    address.city.trim() !== '' &&
    address.stateProvince.trim() !== '' &&
    address.country.trim() !== '' &&
    address.zipPostalCode.trim() !== ''
  )
}

export function buildInitiatePurchasePayload(
  billingAddress: BillingAddress | undefined,
  requiresBilling: boolean,
): InitiatePlanPurchasePayload {
  if (!requiresBilling) {
    return {}
  }

  if (!billingAddress || !isBillingAddressComplete(billingAddress)) {
    throw new Error('Billing address is required for paid checkout')
  }

  return { billingAddress }
}

export function buildAttributePurchasePayload(
  billingAddress: BillingAddress,
): { billingAddress: BillingAddress } {
  if (!isBillingAddressComplete(billingAddress)) {
    throw new Error('Billing address is required')
  }

  return { billingAddress }
}
