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

export async function publishToRedisStream(
  event: PaymentInvoiceStatusEvent,
  options: {
    stream?: string
    redis: RedisConnectionSettings
  },
): Promise<PublishRedisStreamResult> {
  const response = await fetch(devToolsUrl('/dev-tools/redis/publish'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stream: options.stream ?? 'payment.invoice.status.updated',
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
