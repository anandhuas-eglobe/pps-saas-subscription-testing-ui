import type { ApiResponse } from '../types/subscription'

export interface GatewayResponseSnapshot {
  url: string
  method: string
  status: number
  statusText: string
  headers: Record<string, string>
  rawBody: string
  body: ApiResponse<unknown>
  /** True when fetch failed before an HTTP response was received */
  networkError?: boolean
  /** Original error name when the browser aborted or blocked the request (e.g. TypeError, AbortError) */
  causeName?: string
  /** Hint for operators when the gateway may still have logged a 502 upstream error */
  diagnosticHint?: string
}

export class GatewayCallResult<T> {
  readonly value: T
  readonly snapshot: GatewayResponseSnapshot

  constructor(value: T, snapshot: GatewayResponseSnapshot) {
    this.value = value
    this.snapshot = snapshot
  }
}

export function headersFromResponse(response: Response): Record<string, string> {
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })
  return headers
}

export async function snapshotFromResponse(
  response: Response,
  url: string,
  method: string,
): Promise<GatewayResponseSnapshot> {
  const rawBody = await response.text()
  const headers = headersFromResponse(response)
  let body: ApiResponse<unknown>

  if (!rawBody) {
    body = {
      success: response.ok,
      timestamp: new Date().toISOString(),
      message: response.statusText || undefined,
      statusCode: response.status,
    }
  } else {
    try {
      body = JSON.parse(rawBody) as ApiResponse<unknown>
    } catch {
      body = {
        success: false,
        timestamp: new Date().toISOString(),
        message: 'Non-JSON response from API gateway',
        statusCode: response.status,
      }
    }
  }

  if (body.statusCode == null) {
    body = { ...body, statusCode: response.status }
  }

  return {
    url,
    method,
    status: response.status,
    statusText: response.statusText,
    headers,
    rawBody,
    body,
  }
}

export function snapshotForNetworkFailure(
  url: string,
  method: string,
  message: string,
  options?: { causeName?: string; aborted?: boolean },
): GatewayResponseSnapshot {
  const path = tryPathFromUrl(url)
  const aborted = options?.aborted === true || options?.causeName === 'AbortError'
  const diagnosticHint = aborted
    ? 'The browser cancelled this request (navigation, double-submit, or React Strict Mode). Check whether a later retry succeeded.'
    : 'No HTTP response reached the browser. At the same time, the API gateway often logs a 502 with "broken pipe" or "connection reset" to subscription-service (stale upstream TCP connection). Retry usually succeeds; rebuild/restart the gateway after proxy fixes.'

  return {
    url,
    method,
    status: 0,
    statusText: 'No HTTP response',
    headers: {},
    rawBody: '',
    networkError: true,
    causeName: options?.causeName,
    diagnosticHint,
    body: {
      success: false,
      timestamp: new Date().toISOString(),
      message: aborted ? 'Request was cancelled before the gateway response completed' : message,
      method,
      path,
      context: {
        causeName: options?.causeName,
        aborted,
        diagnosticHint,
      },
    },
  }
}

function tryPathFromUrl(url: string): string | undefined {
  try {
    return new URL(url).pathname
  } catch {
    return undefined
  }
}
