import { spawn } from 'node:child_process'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect } from 'vite'
import type { Plugin } from 'vite'

const HEALTH_PATH = '/dev-tools/database/health'
const RESET_PATH = '/dev-tools/database/reset'
const DEFAULT_CONTAINER_NAME = 'pps-saas-subscription'
const RESET_COMMAND = 'npx prisma migrate reset --force'

interface ResetRequestBody {
  containerName?: string
}

function getPathname(url: string | undefined): string {
  if (!url) return ''
  return url.split('?')[0]?.split('#')[0] ?? ''
}

function readJsonBody(request: IncomingMessage): Promise<ResetRequestBody> {
  return new Promise((resolve, reject) => {
    let data = ''

    request.on('data', (chunk) => {
      data += chunk
    })

    request.on('end', () => {
      try {
        resolve(data ? (JSON.parse(data) as ResetRequestBody) : {})
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

function resolveContainerName(containerName?: string): string {
  return containerName?.trim() || process.env.SUBSCRIPTION_DOCKER_CONTAINER || DEFAULT_CONTAINER_NAME
}

function execCommand(
  command: string,
  args: string[],
): Promise<{ success: boolean; output?: string; error?: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let output = ''
    let error = ''

    child.stdout?.on('data', (data) => {
      output += data.toString()
    })

    child.stderr?.on('data', (data) => {
      error += data.toString()
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output })
        return
      }

      resolve({
        success: false,
        error: (error || output || `Command exited with code ${code}`).trim(),
      })
    })

    child.on('error', (err) => {
      resolve({ success: false, error: err.message })
    })
  })
}

async function isDockerAvailable(): Promise<boolean> {
  const result = await execCommand('docker', ['version', '--format', '{{.Server.Version}}'])
  return result.success
}

async function isContainerRunning(containerName: string): Promise<boolean> {
  const result = await execCommand('docker', [
    'inspect',
    '-f',
    '{{.State.Running}}',
    containerName,
  ])

  return result.success && result.output?.trim() === 'true'
}

async function getDatabaseDevToolsHealth(containerName?: string): Promise<{
  available: boolean
  containerName: string
  containerRunning: boolean
  dockerAvailable: boolean
  message: string
}> {
  const resolvedContainerName = resolveContainerName(containerName)
  const dockerAvailable = await isDockerAvailable()

  if (!dockerAvailable) {
    return {
      available: false,
      containerName: resolvedContainerName,
      containerRunning: false,
      dockerAvailable: false,
      message: 'Docker CLI is not available on the host running the Vite dev server.',
    }
  }

  const containerRunning = await isContainerRunning(resolvedContainerName)

  if (!containerRunning) {
    return {
      available: false,
      containerName: resolvedContainerName,
      containerRunning: false,
      dockerAvailable: true,
      message: `Subscription Docker container "${resolvedContainerName}" is not running.`,
    }
  }

  return {
    available: true,
    containerName: resolvedContainerName,
    containerRunning: true,
    dockerAvailable: true,
    message: `Database reset is available for container "${resolvedContainerName}".`,
  }
}

async function resetSubscriptionDatabase(body: ResetRequestBody): Promise<{
  containerName: string
  command: string
  message: string
}> {
  const containerName = resolveContainerName(body.containerName)
  const health = await getDatabaseDevToolsHealth(containerName)

  if (!health.available) {
    throw new Error(health.message)
  }

  const result = await execCommand('docker', [
    'exec',
    containerName,
    'sh',
    '-lc',
    RESET_COMMAND,
  ])

  if (!result.success) {
    throw new Error(result.error ?? 'Failed to reset subscription database.')
  }

  return {
    containerName,
    command: `docker exec ${containerName} ${RESET_COMMAND}`,
    message: `Subscription database reset completed in container "${containerName}".`,
  }
}

/**
 * Dev-only Vite middleware for resetting the subscription Docker database.
 * Used by the testing UI — not included in production builds.
 */
export function databaseDevToolsPlugin(): Plugin {
  return {
    name: 'database-dev-tools',
    apply: 'serve',
    configureServer(server) {
      const handler: Connect.NextHandleFunction = async (request, response, next) => {
        const pathname = getPathname(request.url)

        if (pathname === HEALTH_PATH) {
          try {
            const health = await getDatabaseDevToolsHealth()
            sendJson(response, 200, {
              success: true,
              ...health,
              endpoints: [RESET_PATH],
            })
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Failed to check database dev tools health.'
            sendJson(response, 500, {
              success: false,
              available: false,
              message,
            })
          }
          return
        }

        if (pathname !== RESET_PATH) {
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
          const result = await resetSubscriptionDatabase(body)
          sendJson(response, 200, {
            success: true,
            ...result,
          })
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to reset subscription database.'
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
