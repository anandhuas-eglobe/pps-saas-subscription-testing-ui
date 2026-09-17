import { fetchZendeskMessagingJwt } from '../api/zendeskMessaging'

type ZeJwtCallback = (jwt: string) => void
type ZeLoginCallback = (error: unknown | null) => void

type ZeMessengerApi = (
  channel: 'messenger',
  command: 'loginUser' | 'logoutUser' | 'show' | 'hide' | 'open' | 'close',
  ...args: unknown[]
) => void

declare global {
  interface Window {
    zE?: ZeMessengerApi
  }
}

function getZe(): ZeMessengerApi | null {
  return typeof window !== 'undefined' && typeof window.zE === 'function' ? window.zE : null
}

/**
 * Authenticate the Zendesk Messaging Web Widget for the current IAM user.
 * Always fetches a fresh JWT inside the loginUser callback (required for expiring tokens).
 */
export function loginZendeskMessenger(): Promise<void> {
  const ze = getZe()
  if (!ze) {
    return Promise.reject(new Error('Zendesk Web Widget (zE) is not loaded yet.'))
  }

  return new Promise((resolve, reject) => {
    try {
      ze(
        'messenger',
        'loginUser',
        async (callback: ZeJwtCallback) => {
          try {
            const { jwt } = await fetchZendeskMessagingJwt()
            callback(jwt)
          } catch (error) {
            reject(error)
          }
        },
        (error: unknown | null) => {
          if (error) {
            reject(error instanceof Error ? error : new Error(String(error)))
            return
          }
          resolve()
        },
      )
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)))
    }
  })
}

/** Clear the authenticated Zendesk Messaging session (call on app logout). */
export function logoutZendeskMessenger(): void {
  const ze = getZe()
  if (!ze) {
    return
  }
  try {
    ze('messenger', 'logoutUser')
  } catch {
    // Widget may not be ready; ignore on logout.
  }
}

export function isZendeskMessengerAvailable(): boolean {
  return getZe() !== null
}
