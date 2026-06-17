import type { PaymentInvoiceStatusEvent } from '../utils/paymentEventBuilder'

export interface RedisConnectionSettings {
  host: string
  port: number
  password: string
  db: number
}

export interface PublishRedisStreamResult {
  success: boolean
  stream: string
  messageId?: string | null
  message: string
}

export interface RedisDevToolsHealth {
  success: boolean
  available: boolean
  message: string
  endpoints?: string[]
}

export interface FlushRedisCacheResult {
  success: boolean
  pattern: string
  keysDeleted: number
  message: string
}

export const DEFAULT_REDIS_CONNECTION: RedisConnectionSettings = {
  host: 'localhost',
  port: 6790,
  password: 'bitnami',
  db: 0,
}

function devToolsUrl(path: string): string {
  return new URL(path, window.location.origin).toString()
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text()

  if (!text.trim()) {
    if (response.status === 404) {
      throw new Error(
        'Redis dev middleware is not available. Start the UI with `npm run dev` (not `npm run preview` or a static build) and restart the dev server after pulling changes.',
      )
    }

    throw new Error(`Empty response from server (HTTP ${response.status}).`)
  }

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(
      `Unexpected response (HTTP ${response.status}): ${text.slice(0, 240)}`,
    )
  }
}

export async function checkRedisDevToolsHealth(): Promise<RedisDevToolsHealth> {
  const response = await fetch(devToolsUrl('/dev-tools/redis/health'))
  return parseJsonResponse<RedisDevToolsHealth>(response)
}

export async function publishEventToRedisStream(
  event: unknown,
  options: {
    stream: string
    redis: RedisConnectionSettings
  },
): Promise<PublishRedisStreamResult> {
  const response = await fetch(devToolsUrl('/dev-tools/redis/publish'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stream: options.stream,
      event,
      redis: options.redis,
    }),
  })

  const body = await parseJsonResponse<PublishRedisStreamResult>(response)

  if (!response.ok || body.success === false) {
    throw new Error(body.message ?? `Publish failed with status ${response.status}`)
  }

  return body
}

export async function publishToRedisStream(
  event: PaymentInvoiceStatusEvent,
  options: {
    stream?: string
    redis: RedisConnectionSettings
  },
): Promise<PublishRedisStreamResult> {
  return publishEventToRedisStream(event, {
    stream: options.stream ?? 'payment.invoice.status.updated',
    redis: options.redis,
  })
}

export async function flushRedisCache(
  options: {
    redis?: RedisConnectionSettings
    pattern?: string
  } = {},
): Promise<FlushRedisCacheResult> {
  const response = await fetch(devToolsUrl('/dev-tools/redis/flush-cache'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redis: options.redis ?? DEFAULT_REDIS_CONNECTION,
      pattern: options.pattern ?? 'subscription:*',
    }),
  })

  const body = await parseJsonResponse<FlushRedisCacheResult>(response)

  if (!response.ok || body.success === false) {
    throw new Error(body.message ?? `Flush failed with status ${response.status}`)
  }

  return body
}
