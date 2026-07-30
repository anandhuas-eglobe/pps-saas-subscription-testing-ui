export interface AuthUser {
  id: string
  email: string
  username?: string
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
  role?: string | null
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  tokenType: string
  user: AuthUser | null
}

const ACCESS_TOKEN_KEY = 'subscription-tester:accessToken'
const REFRESH_TOKEN_KEY = 'subscription-tester:refreshToken'
const EXPIRES_AT_KEY = 'subscription-tester:expiresAt'
const TOKEN_TYPE_KEY = 'subscription-tester:tokenType'
const USER_KEY = 'subscription-tester:user'

export const AUTH_SESSION_CLEARED_EVENT = 'subscription-tester:auth-session-cleared'
export const AUTH_SESSION_UPDATED_EVENT = 'subscription-tester:auth-session-updated'

function dispatchSessionEvent(name: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(name))
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getExpiresAt(): number | null {
  const raw = localStorage.getItem(EXPIRES_AT_KEY)
  if (!raw) {
    return null
  }
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export function getTokenType(): string {
  return localStorage.getItem(TOKEN_TYPE_KEY) ?? 'Bearer'
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function getSession(): AuthSession | null {
  const accessToken = getAccessToken()
  const refreshToken = getRefreshToken()
  if (!accessToken && !refreshToken) {
    return null
  }

  return {
    accessToken: accessToken ?? '',
    refreshToken: refreshToken ?? '',
    expiresAt: getExpiresAt() ?? 0,
    tokenType: getTokenType(),
    user: getStoredUser(),
  }
}

export function hasStoredSession(): boolean {
  return Boolean(getAccessToken() || getRefreshToken())
}

export function isAccessTokenExpired(skewMs = 60_000): boolean {
  const expiresAt = getExpiresAt()
  if (!expiresAt) {
    return true
  }
  return Date.now() >= expiresAt - skewMs
}

export function setSession(session: {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType?: string
  user?: AuthUser | null
}): void {
  const expiresAt = Date.now() + session.expiresIn * 1000
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken)
  localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt))
  localStorage.setItem(TOKEN_TYPE_KEY, session.tokenType ?? 'Bearer')

  if (session.user !== undefined) {
    if (session.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(session.user))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }

  dispatchSessionEvent(AUTH_SESSION_UPDATED_EVENT)
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(EXPIRES_AT_KEY)
  localStorage.removeItem(TOKEN_TYPE_KEY)
  localStorage.removeItem(USER_KEY)
  dispatchSessionEvent(AUTH_SESSION_CLEARED_EVENT)
}
