import { saveLastPaymentHandoff } from './paymentEventBuilder'

export interface PurchaseCheckoutResult {
  checkoutUrl?: string
  stripeCheckoutUrl?: string
  paymentHandoff?: {
    invoiceId: string
    invoiceNumber: string
    currency: string
    grandTotal: number
    status?: string
    correlationId?: string
  }
}

export function openCheckoutSession(checkoutUrl: string): boolean {
  const url = checkoutUrl.trim()
  if (!url) {
    return false
  }

  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  return opened != null
}

export function handlePurchaseCheckoutResult(result: PurchaseCheckoutResult): boolean {
  if (result.paymentHandoff) {
    saveLastPaymentHandoff(result.paymentHandoff)
  }

  const checkoutUrl = result.checkoutUrl ?? result.stripeCheckoutUrl
  if (checkoutUrl) {
    return openCheckoutSession(checkoutUrl)
  }

  return false
}
