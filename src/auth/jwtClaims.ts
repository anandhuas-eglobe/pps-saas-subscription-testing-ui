import { getAccessToken } from './tokenStorage'

/**
 * IAM merchant tokens expose the merchant UUID as `tenantId`.
 * Legacy tokens may still use `merchantId`.
 */
export function getMerchantIdFromAccessToken(token: string | null = getAccessToken()): string | null {
  const claims = decodeJwtPayload(token)
  if (!claims) {
    return null
  }

  const merchantId = firstNonEmptyString(claims.tenantId, claims.merchantId)
  return merchantId
}

function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return null
}

function decodeJwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token) {
    return null
  }

  const parts = token.split('.')
  if (parts.length < 2) {
    return null
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}
