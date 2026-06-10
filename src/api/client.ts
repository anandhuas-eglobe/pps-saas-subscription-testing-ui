import type { ApiResponse } from '../types/subscription'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiRequestError extends Error {
  status: number
  body: ApiResponse<unknown>

  constructor(status: number, body: ApiResponse<unknown>) {
    super(body.message ?? `Request failed with status ${status}`)
    this.name = 'ApiRequestError'
    this.status = status
    this.body = body
  }
}

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

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<{ response: Response; body: ApiResponse<T> }> {
  const url = `${API_BASE}${path}`
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  const body = await parseJson<T>(response)

  if (!response.ok || body.success === false) {
    throw new ApiRequestError(response.status, body)
  }

  return { response, body }
}
