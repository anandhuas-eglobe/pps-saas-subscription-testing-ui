import type { AuthUser } from '../auth/tokenStorage'
import { getApiBaseUrl } from '../config/api'
import { apiRequestErrorFromBody, ApiNetworkError, ApiRequestError } from './errors'
import { snapshotFromResponse } from './gatewaySnapshot'
import { fetchWithRateLimitRetry } from './rateLimitRetry'

export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface LoginSuccessData {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: AuthUser
  requiresTwoFactor?: boolean
  requiresPasswordChange?: boolean
  reason?: string
  userId?: string
  sessionId?: string
}

export interface RefreshTokenData {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

interface IamEnvelope<T> {
  data?: T
  message?: string
  success?: boolean
  statusCode?: number
  errorCode?: string
  errors?: Array<{ message: string; field?: string }>
}

async function iamRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<{ response: Response; body: IamEnvelope<T> }> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}${path}`
  const method = (init?.method ?? 'GET').toUpperCase()
  let response: Response
  try {
    response = await fetchWithRateLimitRetry(() =>
      fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      }),
    )
  } catch (error) {
    throw new ApiNetworkError(url, method, error)
  }

  const snapshot = await snapshotFromResponse(response, url, method)
  const body = snapshot.body as IamEnvelope<T>

  if (!response.ok || body.success === false) {
    throw new ApiRequestError(snapshot)
  }

  return { response, body }
}

export async function loginWithIam(payload: LoginRequest): Promise<LoginSuccessData> {
  const { body } = await iamRequest<LoginSuccessData>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      rememberMe: payload.rememberMe ?? false,
    }),
  })

  if (!body.data?.accessToken) {
    throw apiRequestErrorFromBody(
      200,
      {
        success: false,
        timestamp: new Date().toISOString(),
        message: body.message ?? 'Login response did not include an access token',
        data: body.data,
      },
      `${getApiBaseUrl()}/api/v1/auth/login`,
      'POST',
    )
  }

  return body.data
}

export async function refreshTokenWithIam(refreshToken: string): Promise<RefreshTokenData> {
  const { body } = await iamRequest<RefreshTokenData>('/api/v1/auth/refresh-token', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })

  if (!body.data?.accessToken || !body.data.refreshToken) {
    throw apiRequestErrorFromBody(
      200,
      {
        success: false,
        timestamp: new Date().toISOString(),
        message: body.message ?? 'Refresh response did not include tokens',
        data: body.data,
      },
      `${getApiBaseUrl()}/api/v1/auth/refresh-token`,
      'POST',
    )
  }

  return body.data
}

export async function logoutWithIam(accessToken: string, tokenType = 'Bearer'): Promise<void> {
  try {
    await iamRequest<null>('/api/v1/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `${tokenType} ${accessToken}`,
      },
    })
  } catch {
    // Local session clear still proceeds even if IAM logout fails.
  }
}
