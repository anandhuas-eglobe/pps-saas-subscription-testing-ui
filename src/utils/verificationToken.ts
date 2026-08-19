import { fetchEmailLogs } from '../api/emailLogs'

export function extractVerificationTokenFromUrl(verificationUrl: string): string | null {
  try {
    const url = new URL(verificationUrl)
    return url.searchParams.get('token')
  } catch {
    return null
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export async function waitForRegistrationVerificationToken(
  email: string,
  options?: { maxAttempts?: number; intervalMs?: number },
): Promise<string> {
  const maxAttempts = options?.maxAttempts ?? 15
  const intervalMs = options?.intervalMs ?? 2000

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const logs = await fetchEmailLogs({ toEmail: email, limit: 10, page: 1 })
    const match = logs.data.find((event) => {
      const verificationUrl = event.variables?.verificationUrl
      return typeof verificationUrl === 'string' && verificationUrl.includes('token=')
    })

    if (match?.variables?.verificationUrl) {
      const token = extractVerificationTokenFromUrl(String(match.variables.verificationUrl))
      if (token) {
        return token
      }
    }

    if (attempt < maxAttempts - 1) {
      await sleep(intervalMs)
    }
  }

  throw new Error(
    'Timed out waiting for the registration verification email in notification service logs.',
  )
}
