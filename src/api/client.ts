import type { ApiResponse } from '../types/subscription'
import { getAuthorizationHeader, getValidAccessToken, refreshSession } from '../auth/sessionManager'
import { clearSession, getAccessToken } from '../auth/tokenStorage'
import { ApiRequestError } from './errors'

export { ApiRequestError } from './errors'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function parseJson<T>(response: Response): Promise<ApiResponse<T>> {
  const text = await response.text()
  if (!text) {
    return {
      success: response.ok,
      timestamp: new Date().toISOString(),
      message: response.statusText,
    }
  }

  return JSON.parse(text) as ApiResponse<T>
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

async function executeRequest(
  path: string,
  init: RequestInit | undefined,
  headers: HeadersInit,
  baseUrl = API_BASE,
): Promise<Response> {
  const url = `${baseUrl}${path}`
  return fetch(url, {
    ...init,
    headers,
  })
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  options?: { baseUrl?: string },
): Promise<{ response: Response; body: ApiResponse<T> }> {
  const baseUrl = options?.baseUrl ?? API_BASE
  const headers = await buildAuthHeaders(init)
  let response = await executeRequest(path, init, headers, baseUrl)
  let body = await parseJson<T>(response)

  if (response.status === 401 && getAccessToken()) {
    const refreshed = await refreshSession()
    if (refreshed) {
      const retryHeaders = await buildAuthHeaders(init)
      response = await executeRequest(path, init, retryHeaders, baseUrl)
      body = await parseJson<T>(response)
    } else {
      clearSession()
    }
  }

  if (!response.ok || body.success === false) {
    throw new ApiRequestError(response.status, body)
  }

  return { response, body }
}

export async function apiDownloadBlob(path: string, fallbackFilename = 'download.pdf'): Promise<void> {
  const headers = await buildAuthHeaders()
  let response = await fetch(`${API_BASE}${path}`, { headers })

  if (response.status === 401 && getAccessToken()) {
    const refreshed = await refreshSession()
    if (refreshed) {
      const retryHeaders = await buildAuthHeaders()
      response = await fetch(`${API_BASE}${path}`, { headers: retryHeaders })
    } else {
      clearSession()
    }
  }

  if (!response.ok) {
    const text = await response.text()
    if (text) {
      try {
        const body = JSON.parse(text) as ApiResponse<unknown>
        throw new ApiRequestError(response.status, body)
      } catch (error) {
        if (error instanceof ApiRequestError) {
          throw error
        }
      }
    }
    throw new Error(`Download failed with status ${response.status}`)
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
