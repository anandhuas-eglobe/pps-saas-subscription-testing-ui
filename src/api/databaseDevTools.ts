export interface DatabaseDevToolsHealth {
  success: boolean
  available: boolean
  containerName?: string
  containerRunning?: boolean
  dockerAvailable?: boolean
  message: string
  endpoints?: string[]
}

export interface ResetSubscriptionDatabaseResult {
  success: boolean
  containerName: string
  command: string
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
        'Database dev middleware is not available. Start the UI with `npm run dev` (not `npm run preview` or a static build) and restart the dev server after pulling changes.',
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

export async function checkDatabaseDevToolsHealth(): Promise<DatabaseDevToolsHealth> {
  const response = await fetch(devToolsUrl('/dev-tools/database/health'))
  return parseJsonResponse<DatabaseDevToolsHealth>(response)
}

export async function resetSubscriptionDatabase(): Promise<ResetSubscriptionDatabaseResult> {
  const response = await fetch(devToolsUrl('/dev-tools/database/reset'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })

  const body = await parseJsonResponse<ResetSubscriptionDatabaseResult>(response)

  if (!response.ok || body.success === false) {
    throw new Error(body.message ?? `Reset failed with status ${response.status}`)
  }

  return body
}
