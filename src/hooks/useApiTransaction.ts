import { useCallback, useState } from 'react'
import { ApiRequestError } from '../api/client'
import type { ApiResponse } from '../types/subscription'

export interface ApiTransactionRecord {
  endpoint?: string
  lastPayload: unknown
  lastResponse: ApiResponse<unknown> | null
  lastError: unknown
}

export function useApiTransaction() {
  const [transaction, setTransaction] = useState<ApiTransactionRecord | null>(null)

  const recordRequest = useCallback((payload: unknown, endpoint?: string) => {
    setTransaction({
      endpoint,
      lastPayload: payload,
      lastResponse: null,
      lastError: null,
    })
  }, [])

  const recordSuccess = useCallback((payload: unknown, data: unknown, endpoint?: string) => {
    setTransaction({
      endpoint,
      lastPayload: payload,
      lastResponse: {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      },
      lastError: null,
    })
  }, [])

  const recordError = useCallback((payload: unknown, error: unknown, endpoint?: string) => {
    setTransaction({
      endpoint,
      lastPayload: payload,
      lastResponse: error instanceof ApiRequestError ? error.body : null,
      lastError: error,
    })
  }, [])

  const execute = useCallback(
    async <T>(payload: unknown, fn: () => Promise<T>, endpoint?: string): Promise<T> => {
      recordRequest(payload, endpoint)
      try {
        const data = await fn()
        recordSuccess(payload, data, endpoint)
        return data
      } catch (error) {
        recordError(payload, error, endpoint)
        throw error
      }
    },
    [recordRequest, recordSuccess, recordError],
  )

  const clear = useCallback(() => {
    setTransaction(null)
  }, [])

  return {
    transaction,
    recordRequest,
    recordSuccess,
    recordError,
    execute,
    clear,
  }
}
