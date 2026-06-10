import { ApiRequestError } from '../api/client'
import type { ApiErrorItem, ApiResponse } from '../types/subscription'

export function extractApiErrors(source: unknown): ApiErrorItem[] {
  if (source instanceof ApiRequestError) {
    return source.body.errors ?? []
  }

  if (source && typeof source === 'object') {
    if ('body' in source) {
      const body = (source as { body?: ApiResponse<unknown> }).body
      if (body?.errors?.length) {
        return body.errors
      }
    }

    if ('errors' in source) {
      const errors = (source as ApiResponse<unknown>).errors
      if (Array.isArray(errors) && errors.length > 0) {
        return errors
      }
    }
  }

  return []
}

export function getApiErrorTitle(source: unknown): string {
  if (source instanceof ApiRequestError) {
    return source.body.message ?? 'Request failed'
  }

  if (source && typeof source === 'object' && 'message' in source) {
    const message = (source as ApiResponse<unknown>).message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  }

  if (source instanceof Error) {
    return source.message
  }

  return 'Something went wrong'
}

export function getApiErrorSummary(source: unknown): string {
  const errors = extractApiErrors(source)
  const title = getApiErrorTitle(source)

  if (errors.length === 0) {
    return title
  }

  if (errors.length === 1) {
    return formatApiErrorLine(errors[0])
  }

  return `${title} — ${errors.length} validation issues found. See details below.`
}

export function formatApiErrorLine(error: ApiErrorItem): string {
  const fieldPrefix = error.field ? `${error.field}: ` : ''
  return `${fieldPrefix}${error.message}`
}

export function hasApiValidationErrors(source: unknown): boolean {
  return extractApiErrors(source).length > 0
}
