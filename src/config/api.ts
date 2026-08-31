/** Upstream API gateway URL (used for production builds; dev traffic is proxied via Vite). */
export function getApiGatewayUrl(): string {
  return (import.meta.env.VITE_API_GATEWAY_URL ?? '').replace(/\/$/, '')
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

/** Socket.IO namespace for live notifications (routed via the API gateway). */
export function getNotificationsWsUrl(): string {
  if (import.meta.env.DEV) {
    return '/notifications'
  }
  const gateway = getApiGatewayUrl()
  return gateway ? `${gateway}/notifications` : '/notifications'
}
