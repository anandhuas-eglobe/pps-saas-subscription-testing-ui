import type {
  CreatePlanPayload,
  CreatePlanResponse,
  ListPlansResponse,
  PlanDetail,
  PlanFiltersResponse,
  UpdatePlanStatusPayload,
} from '../types/subscription'
import { apiRequest } from './client'

export async function fetchPlanFilters(): Promise<PlanFiltersResponse> {
  const { body } = await apiRequest<PlanFiltersResponse>('/api/v1/admin/plans/filters')
  return body.data!
}

export async function listPlans(params?: {
  page?: number
  limit?: number
  search?: string
  planName?: string
  planType?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}): Promise<ListPlansResponse> {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.limit) search.set('limit', String(params.limit))
  if (params?.search) search.set('search', params.search)
  if (params?.planName) search.set('planName', params.planName)
  if (params?.planType) search.set('planType', params.planType)
  if (params?.status) search.set('status', params.status)
  if (params?.sortBy) search.set('sortBy', params.sortBy)
  if (params?.sortOrder) search.set('sortOrder', params.sortOrder)

  const query = search.toString()
  const path = query ? `/api/v1/admin/plans?${query}` : '/api/v1/admin/plans'
  const { body } = await apiRequest<ListPlansResponse>(path)
  return body.data!
}

export async function getPlanById(planId: string): Promise<PlanDetail> {
  const { body } = await apiRequest<PlanDetail>(`/api/v1/admin/plans/${planId}`)
  return body.data!
}

export async function createPlan(payload: CreatePlanPayload): Promise<CreatePlanResponse> {
  const { body } = await apiRequest<CreatePlanResponse>('/api/v1/admin/plans/create-plan', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return body.data!
}

export async function updatePlanStatus(
  planId: string,
  payload: UpdatePlanStatusPayload,
): Promise<{ message: string }> {
  const { body } = await apiRequest<{ message: string }>(`/api/v1/admin/plans/${planId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return body.data ?? { message: body.message ?? 'Updated' }
}
