import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loginWithIam } from '../api/auth'
import { getApiErrorSummary } from '../utils/apiErrors'
import { getValidAccessToken, logoutSession } from './sessionManager'
import {
  AUTH_SESSION_CLEARED_EVENT,
  AUTH_SESSION_UPDATED_EVENT,
  getStoredUser,
  hasStoredSession,
  setSession,
  type AuthUser,
} from './tokenStorage'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isReady: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())
  const [isAuthenticated, setIsAuthenticated] = useState(() => hasStoredSession())
  const [isReady, setIsReady] = useState(false)

  const syncFromStorage = useCallback(() => {
    setUser(getStoredUser())
    setIsAuthenticated(hasStoredSession())
  }, [])

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      if (hasStoredSession()) {
        const token = await getValidAccessToken()
        if (cancelled) {
          return
        }
        if (!token) {
          setUser(null)
          setIsAuthenticated(false)
        } else {
          syncFromStorage()
        }
      }
      if (!cancelled) {
        setIsReady(true)
      }
    }

    void hydrate()

    const onCleared = () => {
      setUser(null)
      setIsAuthenticated(false)
    }
    const onUpdated = () => {
      syncFromStorage()
    }

    window.addEventListener(AUTH_SESSION_CLEARED_EVENT, onCleared)
    window.addEventListener(AUTH_SESSION_UPDATED_EVENT, onUpdated)

    return () => {
      cancelled = true
      window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, onCleared)
      window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, onUpdated)
    }
  }, [syncFromStorage])

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const data = await loginWithIam({ email, password, rememberMe })

    if (data.requiresTwoFactor) {
      throw new Error('Two-factor authentication is required. Complete 2FA outside this test UI.')
    }

    if (data.requiresPasswordChange) {
      throw new Error(
        data.reason ?? 'Password change is required before this account can use the test UI.',
      )
    }

    if (!data.refreshToken) {
      throw new Error('Login succeeded but no refresh token was returned.')
    }

    setSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      tokenType: data.tokenType,
      user: data.user,
    })
    setUser(data.user)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(async () => {
    await logoutSession()
    setUser(null)
    setIsAuthenticated(false)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      isReady,
      login,
      logout,
    }),
    [user, isAuthenticated, isReady, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function formatAuthError(error: unknown): string {
  return getApiErrorSummary(error)
}
