import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect } from 'vite'
import type { Plugin } from 'vite'
import Redis from 'ioredis'

const STREAM_MAX_LEN = 10_000
const PUBLISH_PATH = '/dev-tools/redis/publish'
const FLUSH_CACHE_PATH = '/dev-tools/redis/flush-cache'
const HEALTH_PATH = '/dev-tools/redis/health'
const SUBSCRIPTION_CACHE_KEY_PATTERN = 'subscription:*'

interface RedisConnectionOptions {
  host?: string
  port?: number
  password?: string
  db?: number
}

interface PublishRequestBody {
  stream?: string
  event?: unknown
  redis?: RedisConnectionOptions
}

interface FlushCacheRequestBody {
  redis?: RedisConnectionOptions
  pattern?: string
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

function resolveRedisConfig(redis?: RedisConnectionOptions) {
  return {
    host: redis?.host ?? 'localhost',
    port: redis?.port ?? 6790,
    password: redis?.password ?? 'bitnami',
    db: redis?.db ?? 0,
  }
}

function createRedisClient(redis?: RedisConnectionOptions): Redis {
  const redisConfig = resolveRedisConfig(redis)

  return new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
    maxRetriesPerRequest: 1,
    connectTimeout: 5_000,
  })
}

async function flushCacheByPattern(body: FlushCacheRequestBody): Promise<{
  pattern: string
  keysDeleted: number
  message: string
}> {
  const pattern = body.pattern ?? SUBSCRIPTION_CACHE_KEY_PATTERN
  const client = createRedisClient(body.redis)

  try {
    let cursor = '0'
    let keysDeleted = 0

    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 200)
      cursor = nextCursor

      if (keys.length > 0) {
        keysDeleted += await client.del(...keys)
      }
    } while (cursor !== '0')

    return {
      pattern,
      keysDeleted,
      message:
        keysDeleted > 0
          ? `Flushed ${keysDeleted} Redis cache key${keysDeleted === 1 ? '' : 's'} matching "${pattern}".`
          : `No Redis cache keys found matching "${pattern}".`,
    }
  } finally {
    client.disconnect()
  }
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

  const client = createRedisClient(body.redis)

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
 * Dev-only Vite middleware for Redis stream publish and subscription cache flush.
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
            message:
              'Redis dev middleware is active (publish + flush-cache). Use npm run dev.',
            endpoints: [PUBLISH_PATH, FLUSH_CACHE_PATH],
          })
          return
        }

        if (pathname !== PUBLISH_PATH && pathname !== FLUSH_CACHE_PATH) {
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

          if (pathname === FLUSH_CACHE_PATH) {
            const result = await flushCacheByPattern(body as FlushCacheRequestBody)
            sendJson(response, 200, {
              success: true,
              ...result,
            })
            return
          }

          const result = await publishToStream(body as PublishRequestBody)

          sendJson(response, 200, {
            success: true,
            ...result,
          })
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : pathname === FLUSH_CACHE_PATH
                ? 'Failed to flush Redis cache'
                : 'Failed to publish to Redis stream'
          const statusCode =
            pathname === PUBLISH_PATH && message.includes('event') ? 400 : 500
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
