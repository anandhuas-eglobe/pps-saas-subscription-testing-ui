export const NotificationType = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const

export type NotificationTypeValue = (typeof NotificationType)[keyof typeof NotificationType]

export type NotificationReadStatus = 'read' | 'unread'

export interface InAppNotification {
  id: string
  title: string
  message: string
  type: NotificationTypeValue
  createdAt: string
  readAt: string | null
  metadata: Record<string, unknown> | null
}

export interface NotificationPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface FetchNotificationsParams {
  page?: number
  limit?: number
  status?: NotificationReadStatus
  type?: NotificationTypeValue
}

export interface FetchNotificationsResult {
  data: InAppNotification[]
  pagination: NotificationPagination
  unreadCount: number
  filters?: {
    status?: NotificationReadStatus
    type?: NotificationTypeValue
  }
}

export interface MarkNotificationReadResult {
  id: string
  readAt: string
}

export interface BulkMarkNotificationsReadResult {
  userId: string
  successCount: number
  failedCount: number
  readAt: string
  failedIds?: string[]
}
