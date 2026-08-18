import type {
  BulkMarkNotificationsReadResult,
  FetchNotificationsParams,
  FetchNotificationsResult,
  MarkNotificationReadResult,
} from '../types/notifications'
import { apiRequest } from './client'

const NOTIFICATIONS_BASE = import.meta.env.VITE_NOTIFICATIONS_BASE_URL ?? ''

function buildQuery(userId: string, params: FetchNotificationsParams = {}): string {
  const search = new URLSearchParams()
  search.set('userId', userId)
  if (params.page != null) {
    search.set('page', String(params.page))
  }
  if (params.limit != null) {
    search.set('limit', String(params.limit))
  }
  if (params.status) {
    search.set('status', params.status)
  }
  if (params.type) {
    search.set('type', params.type)
  }
  return search.toString()
}

function withUser(userId: string): { headers: Record<string, string> } {
  return {
    headers: {
      'x-user-id': userId,
    },
  }
}

export async function fetchNotifications(
  userId: string,
  params: FetchNotificationsParams = {},
): Promise<FetchNotificationsResult> {
  const query = buildQuery(userId, params)
  const { body } = await apiRequest<FetchNotificationsResult>(
    `/api/v1/notifications?${query}`,
    withUser(userId),
    { baseUrl: NOTIFICATIONS_BASE },
  )
  return body.data!
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<MarkNotificationReadResult> {
  const query = new URLSearchParams({ userId }).toString()
  const { body } = await apiRequest<MarkNotificationReadResult>(
    `/api/v1/notifications/${notificationId}?${query}`,
    {
      method: 'PATCH',
      ...withUser(userId),
    },
    { baseUrl: NOTIFICATIONS_BASE },
  )
  return body.data!
}

export async function bulkMarkNotificationsRead(
  userId: string,
  notificationIds: string[],
): Promise<BulkMarkNotificationsReadResult> {
  const query = new URLSearchParams({ userId }).toString()
  const { body } = await apiRequest<BulkMarkNotificationsReadResult>(
    `/api/v1/notifications/bulk/read?${query}`,
    {
      method: 'PATCH',
      ...withUser(userId),
      body: JSON.stringify({ notificationIds }),
    },
    { baseUrl: NOTIFICATIONS_BASE },
  )
  return body.data!
}
