export const CLEANUP_PENDING_INVOICES_REQUESTED_STREAM =
  'payment.pending.invoice.cleanup.requested'

export interface CleanupPendingInvoicePublishFormValues {
  eventId: string
  invoiceId: string
  invoiceNumber: string
  correlationId: string
  entityId: string
  entityName: string
  redisContainer: string
  redisPassword: string
  redisHost: string
  redisPort: number
}

export interface CleanupPendingInvoicesRequestedEvent {
  eventId: string
  eventType: 'CleanupPendingInvoicesRequested'
  eventVersion: '1.0'
  payload: {
    invoiceId: string
    invoiceNumber: string
  }
  metadata: {
    timestamp: string
    environment: string
    correlationId?: string
    context: {
      source: 'payment-service'
      entityType: 'invoice'
      entityId: string
      entityName?: string
    }
  }
}

export function createDefaultCleanupPendingInvoicePublishForm(): CleanupPendingInvoicePublishFormValues {
  const invoiceId = crypto.randomUUID()

  return {
    eventId: crypto.randomUUID(),
    invoiceId,
    invoiceNumber: 'INV-2026-0001',
    correlationId: 'pending-invoice-cleanup-test-001',
    entityId: invoiceId,
    entityName: 'INV-2026-0001',
    redisContainer: 'pps-redis',
    redisPassword: 'bitnami',
    redisHost: 'localhost',
    redisPort: 6790,
  }
}

export function buildCleanupPendingInvoicesRequestedEvent(
  form: CleanupPendingInvoicePublishFormValues,
): CleanupPendingInvoicesRequestedEvent {
  return {
    eventId: form.eventId,
    eventType: 'CleanupPendingInvoicesRequested',
    eventVersion: '1.0',
    payload: {
      invoiceId: form.invoiceId,
      invoiceNumber: form.invoiceNumber,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      environment: 'development',
      correlationId: form.correlationId || undefined,
      context: {
        source: 'payment-service',
        entityType: 'invoice',
        entityId: form.entityId || form.invoiceId,
        entityName: form.entityName || form.invoiceNumber,
      },
    },
  }
}

export function applyInvoiceToCleanupForm(
  form: CleanupPendingInvoicePublishFormValues,
  invoice: { id: string; invoiceNumber: string },
): CleanupPendingInvoicePublishFormValues {
  return {
    ...form,
    eventId: crypto.randomUUID(),
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    entityId: invoice.id,
    entityName: invoice.invoiceNumber,
  }
}

export function buildCleanupPendingInvoiceRedisStreamPayloadJson(
  event: CleanupPendingInvoicesRequestedEvent,
): string {
  return JSON.stringify(event)
}

export function buildCleanupPendingInvoiceDockerRedisXAddCommand(
  event: CleanupPendingInvoicesRequestedEvent,
  options: { containerName: string; password: string; streamName?: string },
): string {
  const payload = buildCleanupPendingInvoiceRedisStreamPayloadJson(event).replace(/'/g, `'\\''`)
  const streamName = options.streamName ?? CLEANUP_PENDING_INVOICES_REQUESTED_STREAM

  return `docker exec -it ${options.containerName} redis-cli -a ${options.password} XADD ${streamName} '*' payload '${payload}'`
}
