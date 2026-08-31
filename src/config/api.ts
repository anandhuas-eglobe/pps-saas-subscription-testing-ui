/** Upstream API gateway URL (used for production builds; dev traffic is proxied via Vite). */
export function getApiGatewayUrl(): string {
  return (import.meta.env.VITE_API_GATEWAY_URL ?? '').replace(/\/$/, '')
}

/** Direct notifications service URL for Socket.io (gateway does not proxy WebSockets). */
export function getNotificationsServiceUrl(): string {
  return (import.meta.env.VITE_NOTIFICATIONS_WS_URL ?? 'http://localhost:3108').replace(/\/$/, '')
}

/**
 * Base URL prepended to API paths.
 * In dev, returns empty string so requests stay same-origin and Vite proxies to the gateway.
 */
export function getApiBaseUrl(): string {
  if (import.meta.env.DEV) {
    return ''
  }
  return getApiGatewayUrl()
}

/**
 * Socket.IO namespace URL for live notifications.
 * In dev, uses same-origin `/notifications`; Vite proxies `/socket.io` to the notifications service.
 */
export function getNotificationsWsUrl(): string {
  if (import.meta.env.DEV) {
    return '/notifications'
  }
  const notificationsBase = getNotificationsServiceUrl()
  return `${notificationsBase}/notifications`
}
