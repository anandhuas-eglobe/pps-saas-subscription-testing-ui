import { useCallback, useState } from 'react'
import { ApiRequestError } from '../api/client'
import { gatewaySnapshotFromError } from '../api/errors'
import { GatewayCallResult, type GatewayResponseSnapshot } from '../api/gatewaySnapshot'
import type { ApiResponse } from '../types/subscription'

export type ExecuteResult<T> = T extends GatewayCallResult<infer V> ? V : T

export interface ApiTransactionRecord {
  endpoint?: string
  lastPayload: unknown
  lastResponse: ApiResponse<unknown> | null
  lastGatewaySnapshot: GatewayResponseSnapshot | null
  lastError: unknown
}

export function useApiTransaction() {
  const [transaction, setTransaction] = useState<ApiTransactionRecord | null>(null)

  const recordRequest = useCallback((payload: unknown, endpoint?: string) => {
    setTransaction({
      endpoint,
      lastPayload: payload,
      lastResponse: null,
      lastGatewaySnapshot: null,
      lastError: null,
    })
  }, [])

  const recordGatewaySuccess = useCallback(
    (payload: unknown, snapshot: GatewayResponseSnapshot, endpoint?: string) => {
      setTransaction({
        endpoint,
        lastPayload: payload,
        lastResponse: snapshot.body,
        lastGatewaySnapshot: snapshot,
        lastError: null,
      })
    },
    [],
  )

  const recordSuccess = useCallback((payload: unknown, data: unknown, endpoint?: string) => {
    setTransaction({
      endpoint,
      lastPayload: payload,
      lastResponse: {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      },
      lastGatewaySnapshot: null,
      lastError: null,
    })
  }, [])

  const recordError = useCallback((payload: unknown, error: unknown, endpoint?: string) => {
    const snapshot = gatewaySnapshotFromError(error)
    setTransaction({
      endpoint,
      lastPayload: payload,
      lastResponse: snapshot?.body ?? (error instanceof ApiRequestError ? error.body : null),
      lastGatewaySnapshot: snapshot,
      lastError: error,
    })
  }, [])

  const execute = useCallback(
    async <T>(
      payload: unknown,
      fn: () => Promise<T>,
      endpoint?: string,
    ): Promise<ExecuteResult<T>> => {
      recordRequest(payload, endpoint)
      try {
        const data = await fn()
        if (data instanceof GatewayCallResult) {
          recordGatewaySuccess(payload, data.snapshot, endpoint)
          return data.value as ExecuteResult<T>
        }
        recordSuccess(payload, data, endpoint)
        return data as ExecuteResult<T>
      } catch (error) {
        recordError(payload, error, endpoint)
        throw error
      }
    },
    [recordRequest, recordGatewaySuccess, recordSuccess, recordError],
  )

  const clear = useCallback(() => {
    setTransaction(null)
  }, [])

  return {
    transaction,
    recordRequest,
    recordGatewaySuccess,
    recordSuccess,
    recordError,
    execute,
    clear,
  }
}
