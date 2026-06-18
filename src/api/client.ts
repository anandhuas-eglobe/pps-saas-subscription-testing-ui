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

export async function apiDownloadBlob(path: string, fallbackFilename = 'download.pdf'): Promise<void> {
  const url = `${API_BASE}${path}`
  const response = await fetch(url)

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
