import type { ChipProps } from '@mui/material/Chip'
import { NotificationType, type InAppNotification, type NotificationTypeValue } from '../types/notifications'

const NOTIFICATION_TYPES = new Set<string>(Object.values(NotificationType))

export function notificationTypeColor(type: NotificationTypeValue): ChipProps['color'] {
  switch (type) {
    case NotificationType.CRITICAL:
      return 'error'
    case NotificationType.HIGH:
      return 'warning'
    case NotificationType.MEDIUM:
      return 'info'
    case NotificationType.LOW:
    default:
      return 'default'
  }
}

export function formatRelativeTime(value: string | Date | null | undefined): string {
  if (!value) {
    return '—'
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) {
    return date.toLocaleString()
  }

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) {
    return 'Just now'
  }
  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)
  if (days < 7) {
    return `${days}d ago`
  }

  return date.toLocaleDateString()
}

export function isNotificationUnread(notification: InAppNotification): boolean {
  return notification.readAt == null
}

export function normalizeNotification(raw: unknown): InAppNotification | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const value = raw as Record<string, unknown>
  const id = typeof value.id === 'string' ? value.id : null
  const title = typeof value.title === 'string' ? value.title : null
  const message = typeof value.message === 'string' ? value.message : ''
  const type = typeof value.type === 'string' && NOTIFICATION_TYPES.has(value.type)
    ? (value.type as NotificationTypeValue)
    : NotificationType.MEDIUM

  if (!id || !title) {
    return null
  }

  return {
    id,
    title,
    message,
    type,
    createdAt: toIsoString(value.createdAt) ?? new Date().toISOString(),
    readAt: toIsoString(value.readAt),
    metadata:
      value.metadata && typeof value.metadata === 'object'
        ? (value.metadata as Record<string, unknown>)
        : null,
  }
}

function toIsoString(value: unknown): string | null {
  if (value == null || value === '') {
    return null
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  return null
}
