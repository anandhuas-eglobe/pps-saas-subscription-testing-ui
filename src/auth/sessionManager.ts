import { logoutWithIam, refreshTokenWithIam } from '../api/auth'
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  getTokenType,
  isAccessTokenExpired,
  setSession,
} from './tokenStorage'

let refreshInFlight: Promise<string | null> | null = null

export async function refreshSession(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      clearSession()
      return null
    }

    try {
      const data = await refreshTokenWithIam(refreshToken)
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
        tokenType: data.tokenType,
        user: getStoredUser(),
      })
      return data.accessToken
    } catch {
      clearSession()
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

export async function getValidAccessToken(): Promise<string | null> {
  const accessToken = getAccessToken()
  if (accessToken && !isAccessTokenExpired()) {
    return accessToken
  }

  return refreshSession()
}

export function getAuthorizationHeader(): string | null {
  const accessToken = getAccessToken()
  if (!accessToken) {
    return null
  }
  return `${getTokenType()} ${accessToken}`
}

export async function logoutSession(): Promise<void> {
  const accessToken = getAccessToken()
  const tokenType = getTokenType()
  if (accessToken) {
    await logoutWithIam(accessToken, tokenType)
  }
  clearSession()
}
