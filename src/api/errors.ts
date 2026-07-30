import type { ApiResponse } from '../types/subscription'

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
