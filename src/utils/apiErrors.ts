import { ApiRequestError } from '../api/client'
import type { ApiErrorItem, ApiErrorMeta, ApiResponse } from '../types/subscription'

export function extractApiErrorBody(source: unknown): ApiResponse<unknown> | null {
  if (source instanceof ApiRequestError) {
    return source.body
  }

  if (source && typeof source === 'object' && 'success' in source) {
    const body = source as ApiResponse<unknown>
    if (body.success === false) {
      return body
    }
  }

  return null
}

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

export function extractApiErrorMeta(source: unknown): ApiErrorMeta | null {
  const body = extractApiErrorBody(source)

  if (!body && !(source instanceof ApiRequestError)) {
    return null
  }

  const meta: ApiErrorMeta = {
    statusCode: body?.statusCode ?? (source instanceof ApiRequestError ? source.status : undefined),
    path: body?.path,
    method: body?.method,
    correlationId: body?.correlationId,
    errorCount: body?.errorCount ?? body?.errors?.length,
    context: body?.context,
  }

  if (
    meta.statusCode == null &&
    meta.path == null &&
    meta.method == null &&
    meta.correlationId == null &&
    meta.errorCount == null &&
    meta.context == null
  ) {
    return null
  }

  return meta
}

export function getApiErrorCode(source: unknown): string | undefined {
  return extractApiErrorBody(source)?.errorCode
}

export function getApiErrorTitle(source: unknown): string {
  if (typeof source === 'string') {
    return source
  }

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
