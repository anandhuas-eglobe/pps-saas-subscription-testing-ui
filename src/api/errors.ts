import type { ApiResponse } from '../types/subscription'
import type { GatewayResponseSnapshot } from './gatewaySnapshot'
import { snapshotForNetworkFailure } from './gatewaySnapshot'

export class ApiRequestError extends Error {
  status: number
  body: ApiResponse<unknown>
  snapshot: GatewayResponseSnapshot

  constructor(snapshot: GatewayResponseSnapshot) {
    const body = snapshot.body
    super(body.message ?? `Request failed with status ${snapshot.status}`)
    this.name = 'ApiRequestError'
    this.status = snapshot.status
    this.body = body
    this.snapshot = snapshot
  }
}

export class ApiNetworkError extends Error {
  readonly url: string
  readonly method: string
  readonly causeError: unknown

  constructor(url: string, method: string, causeError: unknown) {
    const message =
      causeError instanceof Error ? causeError.message : 'Network request failed'
    super(message)
    this.name = 'ApiNetworkError'
    this.url = url
    this.method = method
    this.causeError = causeError
  }

  toSnapshot(): GatewayResponseSnapshot {
    const causeName = this.causeError instanceof Error ? this.causeError.name : undefined
    return snapshotForNetworkFailure(this.url, this.method, this.message, {
      causeName,
      aborted: causeName === 'AbortError',
    })
  }
}

export function gatewaySnapshotFromError(error: unknown): GatewayResponseSnapshot | null {
  if (error instanceof ApiRequestError) {
    return error.snapshot
  }
  if (error instanceof ApiNetworkError) {
    return error.toSnapshot()
  }
  return null
}

/** Build a gateway-shaped error when only status + parsed body are available (e.g. auth helpers). */
export function apiRequestErrorFromBody(
  status: number,
  body: ApiResponse<unknown>,
  url: string,
  method: string,
): ApiRequestError {
  return new ApiRequestError({
    url,
    method,
    status,
    statusText: String(status),
    headers: {},
    rawBody: JSON.stringify(body, null, 2),
    body,
  })
}
