import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect } from 'vite'
import type { Plugin } from 'vite'
import Redis from 'ioredis'

const STREAM_MAX_LEN = 10_000
const PUBLISH_PATH = '/dev-tools/redis/publish'
const HEALTH_PATH = '/dev-tools/redis/health'

interface PublishRequestBody {
  stream?: string
  event?: unknown
  redis?: {
    host?: string
    port?: number
    password?: string
    db?: number
  }
}

function getPathname(url: string | undefined): string {
  if (!url) return ''
  return url.split('?')[0]?.split('#')[0] ?? ''
}

function readJsonBody(request: IncomingMessage): Promise<PublishRequestBody> {
  return new Promise((resolve, reject) => {
    let data = ''

    request.on('data', (chunk) => {
      data += chunk
    })

    request.on('end', () => {
      try {
        resolve(data ? (JSON.parse(data) as PublishRequestBody) : {})
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

async function publishToStream(body: PublishRequestBody): Promise<{
  stream: string
  messageId: string | null
  message: string
}> {
  const stream = body.stream ?? 'payment.invoice.status.updated'

  if (!body.event || typeof body.event !== 'object') {
    throw new Error('Request body must include an "event" object.')
  }

  const redisConfig = {
    host: body.redis?.host ?? 'localhost',
    port: body.redis?.port ?? 6790,
    password: body.redis?.password ?? 'bitnami',
    db: body.redis?.db ?? 0,
  }

  const client = new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
    maxRetriesPerRequest: 1,
    connectTimeout: 5_000,
  })

  try {
    const payload = JSON.stringify(body.event)
    const messageId = await client.xadd(
      stream,
      'MAXLEN',
      '~',
      STREAM_MAX_LEN,
      '*',
      'payload',
      payload,
      'timestamp',
      Date.now().toString(),
    )

    return {
      stream,
      messageId,
      message: `Published to Redis stream "${stream}"`,
    }
  } finally {
    client.disconnect()
  }
}

/**
 * Dev-only Vite middleware that publishes JSON payloads to a Redis stream.
 * Used by the testing UI — not included in production builds.
 */
export function redisDevToolsPlugin(): Plugin {
  return {
    name: 'redis-dev-tools',
    apply: 'serve',
    configureServer(server) {
      const handler: Connect.NextHandleFunction = async (request, response, next) => {
        const pathname = getPathname(request.url)

        if (pathname === HEALTH_PATH) {
          sendJson(response, 200, {
            success: true,
            available: true,
            message: 'Redis dev middleware is active. Use npm run dev.',
          })
          return
        }

        if (pathname !== PUBLISH_PATH) {
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
          const result = await publishToStream(body)

          sendJson(response, 200, {
            success: true,
            ...result,
          })
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to publish to Redis stream'
          const statusCode = message.includes('event') ? 400 : 500
          sendJson(response, statusCode, {
            success: false,
            message,
          })
        }
      }

      // Run before Vite's SPA/static handlers so POST requests are not dropped as empty 404s.
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
