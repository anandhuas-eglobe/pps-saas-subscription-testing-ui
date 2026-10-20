import type {
  AdminCatalogFeature,
  AdminCatalogFeatureAttribute,
  AdminCatalogFeatureListResult,
  ApiResponse,
} from '../types/subscription'
import { getAuthorizationHeader, getValidAccessToken, refreshSession } from '../auth/sessionManager'
import { clearSession, getAccessToken } from '../auth/tokenStorage'
import { getApiBaseUrl } from '../config/api'
import { ApiNetworkError, ApiRequestError } from './errors'
import { snapshotFromResponse } from './gatewaySnapshot'
import { fetchWithRateLimitRetry } from './rateLimitRetry'

export interface ListAdminCatalogFeaturesQuery {
  page?: number
  limit?: number
  search?: string
  sortBy?: 'createdAt' | 'name' | 'code'
  sortOrder?: 'asc' | 'desc'
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

async function adminRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<{ body: ApiResponse<T> }> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}${path}`
  const method = (init?.method ?? 'GET').toUpperCase()

  const run = async (): Promise<Response> => {
    await getValidAccessToken()
    const authorization = getAuthorizationHeader()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
      ...(init?.headers ?? {}),
    }
    try {
      return await fetchWithRateLimitRetry(() => fetch(url, { ...init, headers }))
    } catch (error) {
      throw new ApiNetworkError(url, method, error)
    }
  }

  let response = await run()
  let snapshot = await snapshotFromResponse(response, url, method)
  let body = snapshot.body as ApiResponse<T>

  if (response.status === 401 && getAccessToken()) {
    const refreshed = await refreshSession()
    if (refreshed) {
      response = await run()
      snapshot = await snapshotFromResponse(response, url, method)
      body = snapshot.body as ApiResponse<T>
    } else {
      clearSession()
    }
  }

  if (!response.ok || body.success === false) {
    throw new ApiRequestError(snapshot)
  }

  return { body }
}

async function adminMultipartRequest<T>(path: string, formData: FormData): Promise<{ body: ApiResponse<T> }> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}${path}`
  const method = 'POST'

  const run = async (): Promise<Response> => {
    await getValidAccessToken()
    const authorization = getAuthorizationHeader()
    const headers: HeadersInit = authorization ? { Authorization: authorization } : {}
    try {
      return await fetchWithRateLimitRetry(() => fetch(url, { method, body: formData, headers }))
    } catch (error) {
      throw new ApiNetworkError(url, method, error)
    }
  }

  let response = await run()
  let snapshot = await snapshotFromResponse(response, url, method)
  let body = snapshot.body as ApiResponse<T>

  if (response.status === 401 && getAccessToken()) {
    const refreshed = await refreshSession()
    if (refreshed) {
      response = await run()
      snapshot = await snapshotFromResponse(response, url, method)
      body = snapshot.body as ApiResponse<T>
    } else {
      clearSession()
    }
  }

  if (!response.ok || body.success === false) {
    throw new ApiRequestError(snapshot)
  }

  return { body }
}

export async function listAdminCatalogFeatures(
  query: ListAdminCatalogFeaturesQuery,
): Promise<AdminCatalogFeatureListResult> {
  const path = `/api/v1/admin/features${buildQuery({
    page: query.page,
    limit: query.limit,
    search: query.search,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  })}`
  const { body } = await adminRequest<AdminCatalogFeatureListResult>(path)
  return body.data!
}

export async function getAdminCatalogFeature(featureId: string): Promise<AdminCatalogFeature> {
  const { body } = await adminRequest<AdminCatalogFeature>(`/api/v1/admin/features/${featureId}`)
  return body.data!
}

export async function patchAdminCatalogFeature(
  featureId: string,
  patch: { name?: string; description?: string },
): Promise<AdminCatalogFeature> {
  const { body } = await adminRequest<AdminCatalogFeature>(`/api/v1/admin/features/${featureId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return body.data!
}

export async function listAdminCatalogFeatureAttributes(
  featureId: string,
): Promise<AdminCatalogFeatureAttribute[]> {
  const { body } = await adminRequest<AdminCatalogFeatureAttribute[]>(
    `/api/v1/admin/features/${featureId}/attributes`,
  )
  return body.data ?? []
}

export async function getAdminCatalogFeatureAttribute(
  featureId: string,
  attributeId: string,
): Promise<AdminCatalogFeatureAttribute> {
  const { body } = await adminRequest<AdminCatalogFeatureAttribute>(
    `/api/v1/admin/features/${featureId}/attributes/${attributeId}`,
  )
  return body.data!
}

export async function patchAdminCatalogFeatureAttribute(
  featureId: string,
  attributeId: string,
  patch: { name?: string; description?: string },
): Promise<AdminCatalogFeatureAttribute> {
  const { body } = await adminRequest<AdminCatalogFeatureAttribute>(
    `/api/v1/admin/features/${featureId}/attributes/${attributeId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  )
  return body.data!
}

export async function uploadAdminCatalogFeatureIcon(
  featureId: string,
  file: File,
): Promise<{ iconUrl: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const { body } = await adminMultipartRequest<{ iconUrl: string }>(
    `/api/v1/admin/features/${featureId}/icon`,
    formData,
  )
  return body.data!
}

export async function deleteAdminCatalogFeatureIcon(featureId: string): Promise<{ message: string }> {
  const { body } = await adminRequest<{ message: string }>(
    `/api/v1/admin/features/${featureId}/icon`,
    { method: 'DELETE' },
  )
  return body.data!
}

export async function uploadAdminCatalogAttributeIcon(
  featureId: string,
  attributeId: string,
  file: File,
): Promise<{ iconUrl: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const { body } = await adminMultipartRequest<{ iconUrl: string }>(
    `/api/v1/admin/features/${featureId}/attributes/${attributeId}/icon`,
    formData,
  )
  return body.data!
}

export async function deleteAdminCatalogAttributeIcon(
  featureId: string,
  attributeId: string,
): Promise<{ message: string }> {
  const { body } = await adminRequest<{ message: string }>(
    `/api/v1/admin/features/${featureId}/attributes/${attributeId}/icon`,
    { method: 'DELETE' },
  )
  return body.data!
}
