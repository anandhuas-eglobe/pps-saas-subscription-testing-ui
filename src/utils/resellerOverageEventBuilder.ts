export const RESELLER_OVERAGE_REQUESTED_STREAM = 'order.reseller.overage.requested'

export interface ResellerOveragePublishFormValues {
  eventId: string
  merchantId: string
  overageAmount: number
  correlationId: string
  entityId: string
  entityName: string
  redisContainer: string
  redisPassword: string
  redisHost: string
  redisPort: number
}

export interface ResellerOverageRequestedEvent {
  eventId: string
  eventType: 'ResellerOverageRequested'
  eventVersion: '1.0'
  payload: {
    merchantId: string
    overageAmount: number
  }
  metadata: {
    timestamp: string
    environment: string
    correlationId?: string
    context: {
      source: 'order-service'
      entityType: 'order'
      entityId: string
      entityName?: string
    }
  }
}

const DEFAULT_MERCHANT_ID = '5f3a2d19-8a4b-4a8d-9d6a-0c1e2f3a4b5c'

export function createDefaultResellerOveragePublishForm(): ResellerOveragePublishFormValues {
  const orderId = crypto.randomUUID()

  return {
    eventId: crypto.randomUUID(),
    merchantId: DEFAULT_MERCHANT_ID,
    overageAmount: 25,
    correlationId: 'reseller-overage-test-001',
    entityId: orderId,
    entityName: 'TEST-ORDER-001',
    redisContainer: 'pps-redis',
    redisPassword: 'bitnami',
    redisHost: 'localhost',
    redisPort: 6790,
  }
}

export function buildResellerOverageRequestedEvent(
  form: ResellerOveragePublishFormValues,
): ResellerOverageRequestedEvent {
  return {
    eventId: form.eventId,
    eventType: 'ResellerOverageRequested',
    eventVersion: '1.0',
    payload: {
      merchantId: form.merchantId,
      overageAmount: Number(form.overageAmount),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      environment: 'development',
      correlationId: form.correlationId || undefined,
      context: {
        source: 'order-service',
        entityType: 'order',
        entityId: form.entityId,
        entityName: form.entityName || undefined,
      },
    },
  }
}

export function buildResellerOverageRedisStreamPayloadJson(
  event: ResellerOverageRequestedEvent,
): string {
  return JSON.stringify(event)
}

export function buildResellerOverageDockerRedisXAddCommand(
  event: ResellerOverageRequestedEvent,
  options: { containerName: string; password: string; streamName?: string },
): string {
  const payload = buildResellerOverageRedisStreamPayloadJson(event).replace(/'/g, `'\\''`)
  const streamName = options.streamName ?? RESELLER_OVERAGE_REQUESTED_STREAM

  return `docker exec -it ${options.containerName} redis-cli -a ${options.password} XADD ${streamName} '*' payload '${payload}'`
}
