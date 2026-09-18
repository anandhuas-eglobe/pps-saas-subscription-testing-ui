import { getSelectedApiBaseUrl, getSelectedNotificationsWsUrl } from './apiServersStorage'

/**
 * Base URL prepended to API paths.
 * Resolved from the API server selected in Settings (localStorage).
 */
export function getApiBaseUrl(): string {
  return getSelectedApiBaseUrl()
}

/**
 * Socket.IO namespace URL for live notifications.
 * Uses the notifications WS URL configured on the selected API server.
 */
export function getNotificationsWsUrl(): string {
  const notificationsBase = getSelectedNotificationsWsUrl().replace(/\/$/, '')
  if (!notificationsBase) {
    return '/notifications'
  }
  return `${notificationsBase}/notifications`
}

/** Host-only notifications service URL (without /notifications namespace). */
export function getNotificationsServiceUrl(): string {
  return getSelectedNotificationsWsUrl().replace(/\/$/, '')
}
