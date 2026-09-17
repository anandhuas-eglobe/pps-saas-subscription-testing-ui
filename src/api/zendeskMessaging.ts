import { apiRequest } from './client'

export interface ZendeskMessagingJwtResult {
  jwt: string
  expiresAt: string
  externalId: string
  expiresInSeconds?: number
}

/**
 * Fetch a short-lived Zendesk Messaging JWT from merchant-support.
 * Pass the token to zE('messenger', 'loginUser', callback).
 */
export async function fetchZendeskMessagingJwt(): Promise<ZendeskMessagingJwtResult> {
  const { body } = await apiRequest<ZendeskMessagingJwtResult>(
    '/api/v1/support/zendesk/messaging-jwt',
    { method: 'GET' },
  )

  if (!body.data?.jwt) {
    throw new Error(body.message ?? 'Messaging JWT was not returned by the support service.')
  }

  return body.data
}
