import { DEFAULT_REDIS_CONNECTION, type RedisConnectionSettings } from './redisDevTools'

export const SUBSCRIPTION_AUTO_RENEW_CRON_QUEUE = 'subscription-cron-auto-renew'
export const SUBSCRIPTION_MERCHANT_USAGE_RESET_CRON_QUEUE =
  'subscription-cron-merchant-usage-reset'
export const PAYMENT_STRIPE_WEBHOOK_PROCESS_CRON_QUEUE = 'payment-cron-stripe-webhook-process'

export interface DevCronJobDefinition {
  id: string
  queue: string
  label: string
  description: string
  service: 'subscription' | 'payment'
}

export const DEV_CRON_JOBS: DevCronJobDefinition[] = [
  {
    id: 'subscription-auto-renew',
    queue: SUBSCRIPTION_AUTO_RENEW_CRON_QUEUE,
    label: 'Subscription auto-renew',
    description: 'Process eligible subscription auto-renewals in batches',
    service: 'subscription',
  },
  {
    id: 'subscription-merchant-usage-reset',
    queue: SUBSCRIPTION_MERCHANT_USAGE_RESET_CRON_QUEUE,
    label: 'Merchant usage reset',
    description: 'Reset monthly usage limits for eligible yearly subscriptions',
    service: 'subscription',
  },
  {
    id: 'stripe-webhook-process',
    queue: PAYMENT_STRIPE_WEBHOOK_PROCESS_CRON_QUEUE,
    label: 'Stripe webhook process',
    description: 'Process RECEIVED Stripe webhook events in the payment service',
    service: 'payment',
  },
]

export interface EnqueueCronJobResult {
  success: boolean
  queue: string
  jobName: string
  jobId?: string
  message: string
}

export interface CronDevToolsHealth {
  success: boolean
  available: boolean
  message: string
  endpoints?: string[]
  defaultQueue?: string
}

function devToolsUrl(path: string): string {
  return new URL(path, window.location.origin).toString()
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text()

  if (!text.trim()) {
    if (response.status === 404) {
      throw new Error(
        'Cron dev middleware is not available. Start the UI with `npm run dev` (not preview/build) and restart after pulling changes.',
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

export async function checkCronDevToolsHealth(): Promise<CronDevToolsHealth> {
  const response = await fetch(devToolsUrl('/dev-tools/cron/health'))
  return parseJsonResponse<CronDevToolsHealth>(response)
}

export async function enqueueCronJob(
  queue: string,
  options: {
    redis?: RedisConnectionSettings
    jobName?: string
    data?: Record<string, unknown>
  } = {},
): Promise<EnqueueCronJobResult> {
  const jobName = options.jobName ?? queue

  const response = await fetch(devToolsUrl('/dev-tools/cron/enqueue'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queue,
      jobName,
      data: options.data ?? {},
      redis: options.redis ?? DEFAULT_REDIS_CONNECTION,
    }),
  })

  const body = await parseJsonResponse<EnqueueCronJobResult>(response)

  if (!response.ok || body.success === false) {
    throw new Error(body.message ?? `Enqueue failed with status ${response.status}`)
  }

  return body
}

export async function enqueueSubscriptionAutoRenewCronJob(
  options: {
    redis?: RedisConnectionSettings
  } = {},
): Promise<EnqueueCronJobResult> {
  return enqueueCronJob(SUBSCRIPTION_AUTO_RENEW_CRON_QUEUE, options)
}

export async function enqueueStripeWebhookProcessCronJob(
  options: {
    redis?: RedisConnectionSettings
  } = {},
): Promise<EnqueueCronJobResult> {
  return enqueueCronJob(PAYMENT_STRIPE_WEBHOOK_PROCESS_CRON_QUEUE, options)
}

export async function enqueueMerchantUsageResetCronJob(
  options: {
    redis?: RedisConnectionSettings
  } = {},
): Promise<EnqueueCronJobResult> {
  return enqueueCronJob(SUBSCRIPTION_MERCHANT_USAGE_RESET_CRON_QUEUE, options)
}
