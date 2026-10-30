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

export interface VerifyResetTokenResult {
  email: string
  valid: boolean
}

export async function forgotPasswordWithIam(email: string): Promise<string> {
  const { body } = await iamRequest<void>('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  })

  return (
    body.message ??
    'Password reset instructions have been sent to your email. Check your inbox and spam folder.'
  )
}

export async function verifyResetTokenWithIam(token: string): Promise<VerifyResetTokenResult> {
  const { body } = await iamRequest<VerifyResetTokenResult>('/api/v1/auth/verify-reset-token', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })

  const nested = body.data
  if (nested?.email) {
    return { email: nested.email, valid: nested.valid ?? true }
  }

  const flat = body as unknown as VerifyResetTokenResult
  if (flat.email) {
    return { email: flat.email, valid: flat.valid ?? true }
  }

  throw apiRequestErrorFromBody(
    200,
    {
      success: false,
      timestamp: new Date().toISOString(),
      message: 'Reset token verification did not return an email address',
      data: body,
    },
    `${getApiBaseUrl()}/api/v1/auth/verify-reset-token`,
    'POST',
  )
}

export async function resetPasswordWithIam(token: string, password: string): Promise<string> {
  const { body } = await iamRequest<void>('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })

  return body.message ?? 'Password has been reset successfully. Sign in with your new password.'
}

export interface ChangePasswordResult {
  message: string
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
  tokenType?: string
}

export async function changePasswordWithIam(options: {
  newPassword: string
  currentPassword?: string
  accessToken: string
  tokenType?: string
}): Promise<ChangePasswordResult> {
  const payload: { newPassword: string; currentPassword?: string } = {
    newPassword: options.newPassword,
  }
  if (options.currentPassword) {
    payload.currentPassword = options.currentPassword
  }

  const tokenType = options.tokenType ?? 'Bearer'
  const { body } = await iamRequest<{
    passwordChangedAt?: string
    accessToken?: string
    refreshToken?: string
    tokenType?: string
    expiresIn?: number
  }>('/api/v1/auth/change-password', {
    method: 'POST',
    headers: {
      Authorization: `${tokenType} ${options.accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  return {
    message: body.message ?? 'Password changed successfully.',
    accessToken: body.data?.accessToken,
    refreshToken: body.data?.refreshToken,
    expiresIn: body.data?.expiresIn,
    tokenType: body.data?.tokenType,
  }
}
