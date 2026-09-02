import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect } from 'vite'
import type { Plugin } from 'vite'
import { Queue } from 'bullmq'
import Redis from 'ioredis'

const ENQUEUE_PATH = '/dev-tools/cron/enqueue'
const HEALTH_PATH = '/dev-tools/cron/health'
export const SUBSCRIPTION_AUTO_RENEW_CRON_QUEUE = 'subscription-cron-auto-renew'
export const SUBSCRIPTION_MERCHANT_USAGE_RESET_CRON_QUEUE =
  'subscription-cron-merchant-usage-reset'
export const PAYMENT_STRIPE_WEBHOOK_PROCESS_CRON_QUEUE =
  'payment-cron-stripe-webhook-process'

interface RedisConnectionOptions {
  host?: string
  port?: number
  password?: string
  db?: number
}

interface EnqueueCronJobRequestBody {
  queue?: string
  jobName?: string
  data?: Record<string, unknown>
  redis?: RedisConnectionOptions
}

function getPathname(url: string | undefined): string {
  if (!url) return ''
  return url.split('?')[0]?.split('#')[0] ?? ''
}

function readJsonBody(request: IncomingMessage): Promise<EnqueueCronJobRequestBody> {
  return new Promise((resolve, reject) => {
    let data = ''

    request.on('data', (chunk) => {
      data += chunk
    })

    request.on('end', () => {
      try {
        resolve(data ? (JSON.parse(data) as EnqueueCronJobRequestBody) : {})
      } catch (error) {
        reject(error)
      }
    })

    request.on('error', reject)
  })
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  if (response.writableEnded) return
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(body))
}

function resolveRedisConfig(redis?: RedisConnectionOptions) {
  return {
    host: redis?.host ?? 'localhost',
    port: redis?.port ?? 6790,
    password: redis?.password ?? 'bitnami',
    db: redis?.db ?? 0,
  }
}

async function enqueueCronJob(body: EnqueueCronJobRequestBody): Promise<{
  queue: string
  jobName: string
  jobId: string | undefined
  message: string
}> {
  const queueName = body.queue?.trim() || SUBSCRIPTION_AUTO_RENEW_CRON_QUEUE
  const jobName = body.jobName?.trim() || queueName
  const connection = resolveRedisConfig(body.redis)

  const queue = new Queue(queueName, {
    connection: new Redis({
      ...connection,
      maxRetriesPerRequest: null,
    }),
  })

  try {
    const job = await queue.add(jobName, body.data ?? {}, {
      removeOnComplete: 100,
      removeOnFail: 50,
    })

    return {
      queue: queueName,
      jobName,
      jobId: job.id,
      message: `Enqueued BullMQ job "${jobName}" on queue "${queueName}" (id=${job.id ?? 'unknown'}).`,
    }
  } finally {
    await queue.close()
  }
}

/**
 * Dev-only Vite middleware to enqueue one-off BullMQ cron jobs for local testing.
 */
export function cronDevToolsPlugin(): Plugin {
  return {
    name: 'cron-dev-tools',
    apply: 'serve',
    configureServer(server) {
      const handler: Connect.NextHandleFunction = async (request, response, next) => {
        const pathname = getPathname(request.url)

        if (pathname === HEALTH_PATH) {
          sendJson(response, 200, {
            success: true,
            available: true,
            message:
              'Cron dev middleware is active. Use POST /dev-tools/cron/enqueue with npm run dev.',
            endpoints: [ENQUEUE_PATH],
            queues: [
              SUBSCRIPTION_AUTO_RENEW_CRON_QUEUE,
              SUBSCRIPTION_MERCHANT_USAGE_RESET_CRON_QUEUE,
              PAYMENT_STRIPE_WEBHOOK_PROCESS_CRON_QUEUE,
            ],
          })
          return
        }

        if (pathname !== ENQUEUE_PATH) {
          next()
          return
        }

        if (request.method !== 'POST') {
          sendJson(response, 405, {
            success: false,
            message: 'Method not allowed. Use POST.',
          })
          return
        }

        try {
          const body = await readJsonBody(request)
          const result = await enqueueCronJob(body)
          sendJson(response, 200, {
            success: true,
            ...result,
          })
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to enqueue BullMQ cron job'
          sendJson(response, 500, {
            success: false,
            message,
          })
        }
      }

      ;(
        server.middlewares as Connect.Server & {
          stack: Array<{ route: string; handle: Connect.NextHandleFunction }>
        }
      ).stack.unshift({
        route: '',
        handle: handler,
      })
    },
  }
}
