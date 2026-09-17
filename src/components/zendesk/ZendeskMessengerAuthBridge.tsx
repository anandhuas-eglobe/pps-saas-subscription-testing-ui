import { useEffect, useRef } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { loginZendeskMessenger, logoutZendeskMessenger } from '../../utils/zendeskMessenger'

/**
 * Keeps the Zendesk Messaging Web Widget in sync with the Test UI IAM session.
 * On login (or session restore), fetches a Messaging JWT and calls zE loginUser.
 * On logout / session clear, calls zE logoutUser.
 */
export function ZendeskMessengerAuthBridge() {
  const { isAuthenticated, isReady } = useAuth()
  const lastAuthRef = useRef<boolean | null>(null)

  useEffect(() => {
    if (!isReady) {
      return
    }

    if (lastAuthRef.current === isAuthenticated) {
      return
    }
    lastAuthRef.current = isAuthenticated

    if (!isAuthenticated) {
      logoutZendeskMessenger()
      return
    }

    let cancelled = false

    async function authenticate() {
      // Widget snippet loads after React; retry briefly if zE is not ready yet.
      for (let attempt = 0; attempt < 10 && !cancelled; attempt += 1) {
        try {
          await loginZendeskMessenger()
          return
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (!message.includes('not loaded') || attempt === 9) {
            console.warn('[Zendesk] Messaging login failed:', error)
            return
          }
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }
    }

    void authenticate()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isReady])

  return null
}
