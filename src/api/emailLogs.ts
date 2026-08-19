import type { EmailLogsResult } from '../types/merchantSignup'
import { apiRequest } from './client'

const NOTIFICATIONS_BASE = import.meta.env.VITE_NOTIFICATIONS_BASE_URL ?? ''

export interface FetchEmailLogsParams {
  page?: number
  limit?: number
  toEmail?: string
  eventType?: string
  internalStatus?: string
}

function buildQuery(params: FetchEmailLogsParams = {}): string {
  const search = new URLSearchParams()
  if (params.page != null) {
    search.set('page', String(params.page))
  }
  if (params.limit != null) {
    search.set('limit', String(params.limit))
  }
  if (params.toEmail) {
    search.set('toEmail', params.toEmail)
  }
  if (params.eventType) {
    search.set('eventType', params.eventType)
  }
  if (params.internalStatus) {
    search.set('internalStatus', params.internalStatus)
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

export async function fetchEmailLogs(params: FetchEmailLogsParams = {}): Promise<EmailLogsResult> {
  const { body } = await apiRequest<EmailLogsResult>(
    `/api/v1/email-logs${buildQuery(params)}`,
    undefined,
    { baseUrl: NOTIFICATIONS_BASE },
  )
  return body.data!
}
