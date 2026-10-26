import type { ApiResponse } from '../types/subscription'
import { getAuthorizationHeader, getValidAccessToken, refreshSession } from '../auth/sessionManager'
import { clearSession, getAccessToken } from '../auth/tokenStorage'
import { getApiBaseUrl } from '../config/api'
import { ApiNetworkError, ApiRequestError } from './errors'
import type { GatewayResponseSnapshot } from './gatewaySnapshot'
import { snapshotFromResponse } from './gatewaySnapshot'
import { fetchWithRateLimitRetry } from './rateLimitRetry'

export { ApiRequestError, ApiNetworkError } from './errors'
export { GatewayCallResult, type GatewayResponseSnapshot } from './gatewaySnapshot'

async function executeRequest(
  path: string,
  init: RequestInit | undefined,
  headers: HeadersInit,
  baseUrl = getApiBaseUrl(),
): Promise<Response> {
  const url = `${baseUrl}${path}`
  const method = (init?.method ?? 'GET').toUpperCase()
  try {
    return await fetchWithRateLimitRetry(() =>
      fetch(url, {
        ...init,
        headers,
      }),
    )
  } catch (error) {
    throw new ApiNetworkError(url, method, error)
  }
}

async function buildAuthHeaders(init?: RequestInit): Promise<HeadersInit> {
  await getValidAccessToken()
  const authorization = getAuthorizationHeader()

  return {
    'Content-Type': 'application/json',
    ...(authorization ? { Authorization: authorization } : {}),
    ...(init?.headers ?? {}),
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  options?: { baseUrl?: string },
): Promise<{ response: Response; body: ApiResponse<T>; snapshot: GatewayResponseSnapshot }> {
  const baseUrl = options?.baseUrl ?? getApiBaseUrl()
  const method = (init?.method ?? 'GET').toUpperCase()
  const url = `${baseUrl}${path}`
  const headers = await buildAuthHeaders(init)
  let response = await executeRequest(path, init, headers, baseUrl)
  let snapshot = await snapshotFromResponse(response, url, method)
  let body = snapshot.body as ApiResponse<T>

  if (response.status === 401 && getAccessToken()) {
    const refreshed = await refreshSession()
    if (refreshed) {
      const retryHeaders = await buildAuthHeaders(init)
      response = await executeRequest(path, init, retryHeaders, baseUrl)
      snapshot = await snapshotFromResponse(response, url, method)
      body = snapshot.body as ApiResponse<T>
    } else {
      clearSession()
    }
  }

  if (!response.ok || body.success === false) {
    throw new ApiRequestError(snapshot)
  }

  return { response, body, snapshot }
}

export async function apiDownloadBlob(path: string, fallbackFilename = 'download.pdf'): Promise<void> {
  const baseUrl = getApiBaseUrl()
  const headers = await buildAuthHeaders()
  const url = `${baseUrl}${path}`
  let response: Response
  try {
    response = await fetchWithRateLimitRetry(() =>
      fetch(url, { headers }),
    )
  } catch (error) {
    throw new ApiNetworkError(url, 'GET', error)
  }

  if (response.status === 401 && getAccessToken()) {
    const refreshed = await refreshSession()
    if (refreshed) {
      const retryHeaders = await buildAuthHeaders()
      try {
        response = await fetchWithRateLimitRetry(() =>
          fetch(url, { headers: retryHeaders }),
        )
      } catch (error) {
        throw new ApiNetworkError(url, 'GET', error)
      }
    } else {
      clearSession()
    }
  }

  if (!response.ok) {
    const snapshot = await snapshotFromResponse(response, url, 'GET')
    throw new ApiRequestError(snapshot)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition')
  const filename =
    disposition?.match(/filename="([^"]+)"/)?.[1] ??
    disposition?.match(/filename=([^;]+)/)?.[1]?.trim() ??
    fallbackFilename

  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}
