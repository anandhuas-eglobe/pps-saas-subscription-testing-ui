export const RESELLER_OVERAGE_REQUESTED_STREAM = 'order.reseller.overage.requested'

export interface ResellerOveragePublishFormValues {
  eventId: string
  merchantId: string
  overageAmount: number
  /** ISO-8601 usage window start (required by subscription consumer). */
  billingPeriodFrom: string
  /** ISO-8601 usage window end (required by subscription consumer). */
  billingPeriodTo: string
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
    billingPeriodFrom: string
    billingPeriodTo: string
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

/** Default reseller usage window: last 14 days through now. */
export function createDefaultResellerOverageBillingPeriod(): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to.getTime())
  from.setDate(from.getDate() - 14)

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

/** Converts ISO timestamp to `datetime-local` input value (local timezone). */
export function isoToDatetimeLocalInput(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Parses `datetime-local` value to ISO-8601 UTC string. */
export function datetimeLocalInputToIso(value: string): string {
  if (!value.trim()) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString()
}

export function createDefaultResellerOveragePublishForm(): ResellerOveragePublishFormValues {
  const orderId = crypto.randomUUID()
  const billingPeriod = createDefaultResellerOverageBillingPeriod()

  return {
    eventId: crypto.randomUUID(),
    merchantId: DEFAULT_MERCHANT_ID,
    overageAmount: 25,
    billingPeriodFrom: billingPeriod.from,
    billingPeriodTo: billingPeriod.to,
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
      billingPeriodFrom: form.billingPeriodFrom,
      billingPeriodTo: form.billingPeriodTo,
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
