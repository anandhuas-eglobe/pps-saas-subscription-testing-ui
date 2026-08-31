const MAX_RATE_LIMIT_RETRIES = 10
const BASE_DELAY_MS = 1_000
const MAX_DELAY_MS = 30_000

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function getRateLimitDelayMs(response: Response, attempt: number): number {
  const retryAfter = response.headers.get('Retry-After')
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds * 1_000
    }
  }

  return Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS) + Math.floor(Math.random() * 500)
}

export async function fetchWithRateLimitRetry(
  request: () => Promise<Response>,
): Promise<Response> {
  let response = await request()

  for (let attempt = 0; response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES; attempt++) {
    await sleep(getRateLimitDelayMs(response, attempt))
    response = await request()
  }

  return response
}
