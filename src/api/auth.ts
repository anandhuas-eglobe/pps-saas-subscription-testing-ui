import type { AuthUser } from '../auth/tokenStorage'
import { ApiRequestError } from './errors'

const IAM_BASE = import.meta.env.VITE_IAM_BASE_URL ?? ''

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

async function parseIamJson<T>(response: Response): Promise<IamEnvelope<T>> {
  const text = await response.text()
  if (!text) {
    return {
      message: response.statusText,
      success: response.ok,
    }
  }
  return JSON.parse(text) as IamEnvelope<T>
}

async function iamRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<{ response: Response; body: IamEnvelope<T> }> {
  const response = await fetch(`${IAM_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  const body = await parseIamJson<T>(response)

  if (!response.ok || body.success === false) {
    throw new ApiRequestError(response.status, {
      success: false,
      timestamp: new Date().toISOString(),
      message: body.message ?? `Request failed with status ${response.status}`,
      statusCode: body.statusCode ?? response.status,
      errorCode: body.errorCode,
      errors: body.errors,
      data: body.data as unknown,
    })
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
    throw new ApiRequestError(200, {
      success: false,
      timestamp: new Date().toISOString(),
      message: body.message ?? 'Login response did not include an access token',
      data: body.data,
    })
  }

  return body.data
}

export async function refreshTokenWithIam(refreshToken: string): Promise<RefreshTokenData> {
  const { body } = await iamRequest<RefreshTokenData>('/api/v1/auth/refresh-token', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })

  if (!body.data?.accessToken || !body.data.refreshToken) {
    throw new ApiRequestError(200, {
      success: false,
      timestamp: new Date().toISOString(),
      message: body.message ?? 'Refresh response did not include tokens',
      data: body.data,
    })
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
