export type PaymentInvoiceStatusAction =
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_SUCCEEDED'
  | 'PAYMENT_FAILED'

export type InvoiceStatusValue =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REASSIGNED'

export interface PaymentReceiptDetails {
  transactionId: string
  paymentReference: string | null
  paymentGateway: string | null
  paymentMethod: string
  cardLast4Digit: string | null
  paidAt: string
}

export interface PaymentFailureDetails {
  failureCode: string | null
  failureReason: string | null
  failedAt: string
}

export interface PaymentConfirmationFormValues {
  eventId: string
  action: PaymentInvoiceStatusAction
  invoiceId: string
  invoiceNumber: string
  merchantId: string
  newStatus: InvoiceStatusValue
  currency: string
  grandTotal: number
  checkoutCorrelationId: string
  transactionId: string
  paymentReference: string
  paymentGateway: string
  paymentMethod: string
  cardLast4Digit: string
  paidAt: string
  failureCode: string
  failureReason: string
  failedAt: string
  correlationId: string
  metadataSource: string
  metadataEntityType: string
  entityId: string
  entityName: string
  redisContainer: string
  redisPassword: string
  redisHost: string
  redisPort: number
}

export interface PaymentInvoiceStatusEvent {
  eventId: string
  eventType: 'PaymentInvoiceStatusUpdated'
  eventVersion: '1.0'
  action: PaymentInvoiceStatusAction
  payload: {
    invoiceId: string
    invoiceNumber: string
    merchantId: string
    newStatus: InvoiceStatusValue
    currency: string
    grandTotal: number
    checkoutCorrelationId: string | null
    payment?: PaymentReceiptDetails
    failure?: PaymentFailureDetails
  }
  metadata: {
    timestamp: string
    environment: string
    correlationId?: string
    context: {
      source: string
      entityType: string
      entityId: string
      entityName?: string
    }
  }
}

const DEFAULT_MERCHANT_ID = '5f3a2d19-8a4b-4a8d-9d6a-0c1e2f3a4b5c'

export function defaultNewStatusForAction(
  action: PaymentInvoiceStatusAction,
): InvoiceStatusValue {
  switch (action) {
    case 'PAYMENT_PROCESSING':
      return 'PROCESSING'
    case 'PAYMENT_SUCCEEDED':
      return 'COMPLETED'
    case 'PAYMENT_FAILED':
      return 'FAILED'
  }
}

export function createDefaultPaymentConfirmationForm(): PaymentConfirmationFormValues {
  return {
    eventId: crypto.randomUUID(),
    action: 'PAYMENT_SUCCEEDED',
    invoiceId: '71ba7a89-4e4d-4bb6-9bef-7c50353482d6',
    invoiceNumber: 'INV-2026-0001',
    merchantId: DEFAULT_MERCHANT_ID,
    newStatus: 'COMPLETED',
    currency: 'USD',
    grandTotal: 99.99,
    checkoutCorrelationId: 'checkout-correlation-001',
    transactionId: 'txn_9f3a2b1c8d7e6f5a',
    paymentReference: 'ref_stripe_pi_123',
    paymentGateway: 'stripe',
    paymentMethod: 'CREDIT_CARD',
    cardLast4Digit: '4242',
    paidAt: new Date().toISOString(),
    failureCode: 'card_declined',
    failureReason: 'Your card was declined.',
    failedAt: new Date().toISOString(),
    correlationId: 'payment-test-correlation-002',
    metadataSource: 'payment-service',
    metadataEntityType: 'invoice',
    entityId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    entityName: 'INV-2026-0001',
    redisContainer: 'pps-redis',
    redisPassword: 'bitnami',
    redisHost: 'localhost',
    redisPort: 6790,
  }
}

export function buildPaymentInvoiceStatusEvent(
  form: PaymentConfirmationFormValues,
): PaymentInvoiceStatusEvent {
  const includePayment =
    form.action === 'PAYMENT_SUCCEEDED' || form.action === 'PAYMENT_PROCESSING'
  const includeFailure = form.action === 'PAYMENT_FAILED'

  return {
    eventId: form.eventId,
    eventType: 'PaymentInvoiceStatusUpdated',
    eventVersion: '1.0',
    action: form.action,
    payload: {
      invoiceId: form.invoiceId,
      invoiceNumber: form.invoiceNumber,
      merchantId: form.merchantId,
      newStatus: form.newStatus,
      currency: form.currency,
      grandTotal: Number(form.grandTotal),
      checkoutCorrelationId: form.checkoutCorrelationId || null,
      ...(includePayment
        ? {
            payment: {
              transactionId: form.transactionId,
              paymentReference: form.paymentReference || null,
              paymentGateway: form.paymentGateway || null,
              paymentMethod: form.paymentMethod,
              cardLast4Digit: form.cardLast4Digit || null,
              paidAt: form.paidAt,
            },
          }
        : {}),
      ...(includeFailure
        ? {
            failure: {
              failureCode: form.failureCode || null,
              failureReason: form.failureReason || null,
              failedAt: form.failedAt,
            },
          }
        : {}),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      environment: 'development',
      correlationId: form.correlationId || undefined,
      context: {
        source: form.metadataSource || 'payment-service',
        entityType: form.metadataEntityType || 'invoice',
        entityId: form.entityId,
        entityName: form.entityName || form.invoiceNumber,
      },
    },
  }
}

export function applyPaymentHandoffToForm(
  form: PaymentConfirmationFormValues,
  handoff: {
    invoiceId: string
    invoiceNumber: string
    merchantId?: string
    currency: string
    grandTotal: number
    correlationId?: string
  },
): PaymentConfirmationFormValues {
  return {
    ...form,
    eventId: crypto.randomUUID(),
    invoiceId: handoff.invoiceId,
    invoiceNumber: handoff.invoiceNumber,
    merchantId: handoff.merchantId ?? form.merchantId,
    currency: handoff.currency,
    grandTotal: handoff.grandTotal,
    entityName: handoff.invoiceNumber,
    entityId: handoff.invoiceId,
    checkoutCorrelationId: handoff.correlationId ?? form.checkoutCorrelationId,
    correlationId: handoff.correlationId ?? form.correlationId,
  }
}

export function applyInvoiceToPaymentForm(
  form: PaymentConfirmationFormValues,
  invoice: {
    id: string
    invoiceNumber: string
    merchantId: string
    currency: string
    grandTotal: number
  },
): PaymentConfirmationFormValues {
  return {
    ...form,
    eventId: crypto.randomUUID(),
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    merchantId: invoice.merchantId,
    currency: invoice.currency,
    grandTotal: invoice.grandTotal,
    entityId: invoice.id,
    entityName: invoice.invoiceNumber,
  }
}

export function buildSucceededPaymentEventFromHandoff(handoff: {
  invoiceId: string
  invoiceNumber: string
  merchantId?: string
  currency: string
  grandTotal: number
  correlationId?: string
}): PaymentInvoiceStatusEvent {
  const form = applyPaymentHandoffToForm(createDefaultPaymentConfirmationForm(), handoff)
  return buildPaymentInvoiceStatusEvent({
    ...form,
    action: 'PAYMENT_SUCCEEDED',
    newStatus: defaultNewStatusForAction('PAYMENT_SUCCEEDED'),
  })
}

export function buildFailedPaymentEventFromHandoff(handoff: {
  invoiceId: string
  invoiceNumber: string
  merchantId?: string
  currency: string
  grandTotal: number
  correlationId?: string
  failureCode?: string
  failureReason?: string
}): PaymentInvoiceStatusEvent {
  const form = applyPaymentHandoffToForm(createDefaultPaymentConfirmationForm(), handoff)
  return buildPaymentInvoiceStatusEvent({
    ...form,
    action: 'PAYMENT_FAILED',
    newStatus: defaultNewStatusForAction('PAYMENT_FAILED'),
    failureCode: handoff.failureCode ?? form.failureCode,
    failureReason: handoff.failureReason ?? form.failureReason,
    failedAt: new Date().toISOString(),
  })
}

export function getInvoiceLineItemCategory(invoice: {
  lineItems: Array<{ lineItemCategory?: string }>
}): string {
  return invoice.lineItems[0]?.lineItemCategory ?? '—'
}

export const LAST_PAYMENT_HANDOFF_KEY = 'subscription-tester:last-payment-handoff'

export function saveLastPaymentHandoff(handoff: {
  invoiceId: string
  invoiceNumber: string
  currency: string
  grandTotal: number
  correlationId?: string
}): void {
  sessionStorage.setItem(LAST_PAYMENT_HANDOFF_KEY, JSON.stringify(handoff))
}

export function loadLastPaymentHandoff():
  | {
      invoiceId: string
      invoiceNumber: string
      currency: string
      grandTotal: number
      correlationId?: string
    }
  | null {
  const raw = sessionStorage.getItem(LAST_PAYMENT_HANDOFF_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as {
      invoiceId: string
      invoiceNumber: string
      currency: string
      grandTotal: number
      correlationId?: string
    }
  } catch {
    return null
  }
}

const PAYMENT_INVOICE_STATUS_STREAM = 'payment.invoice.status.updated'

export function buildRedisStreamPayloadJson(event: PaymentInvoiceStatusEvent): string {
  return JSON.stringify(event)
}

export function buildDockerRedisXAddCommand(
  event: PaymentInvoiceStatusEvent,
  options: { containerName: string; password: string; streamName?: string },
): string {
  const payload = buildRedisStreamPayloadJson(event).replace(/'/g, `'\\''`)
  const streamName = options.streamName ?? PAYMENT_INVOICE_STATUS_STREAM

  return `docker exec -it ${options.containerName} redis-cli -a ${options.password} XADD ${streamName} '*' payload '${payload}'`
}
