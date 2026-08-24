import { getStoredUser } from '../auth/tokenStorage'
import type {
  CouponRead,
  CreateCouponPayload,
  CreateDiscountPrivilegePayload,
  ListCouponRedemptionsResponse,
  ListCouponsParams,
  ListCouponsResponse,
  ListDiscountPrivilegesParams,
  ListDiscountPrivilegesResponse,
  ListPrivilegeAssignmentsResponse,
  MerchantCommercialOffersResponse,
  PreviewCouponPayload,
  PreviewCouponResponse,
  PrivilegeAssignmentRead,
  PrivilegeRead,
  UpdateCouponPayload,
  UpdateDiscountPrivilegePayload,
} from '../types/commercial'
import { apiRequest } from './client'

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') {
      continue
    }
    search.set(key, String(value))
  }
  return search.toString()
}

export async function listCoupons(params: ListCouponsParams = {}): Promise<ListCouponsResponse> {
  const query = toQuery({
    page: params.page,
    limit: params.limit,
    search: params.search,
    status: params.status,
    isAutoApply: params.isAutoApply,
    applicableOn: params.applicableOn,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  })
  const path = query ? `/api/v1/admin/coupons?${query}` : '/api/v1/admin/coupons'
  const { body } = await apiRequest<ListCouponsResponse>(path)
  return body.data!
}

export async function getCouponById(id: string): Promise<CouponRead> {
  const { body } = await apiRequest<CouponRead>(`/api/v1/admin/coupons/${id}`)
  return body.data!
}

export async function createCoupon(payload: CreateCouponPayload): Promise<CouponRead> {
  const { body } = await apiRequest<CouponRead>('/api/v1/admin/coupons', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return body.data!
}

export async function updateCoupon(id: string, payload: UpdateCouponPayload): Promise<CouponRead> {
  const { body } = await apiRequest<CouponRead>(`/api/v1/admin/coupons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return body.data!
}

export async function updateCouponStatus(
  id: string,
  status: CouponRead['status'],
): Promise<CouponRead> {
  const { body } = await apiRequest<CouponRead>(`/api/v1/admin/coupons/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return body.data!
}

export async function listCouponRedemptions(
  id: string,
  params: { page?: number; limit?: number } = {},
): Promise<ListCouponRedemptionsResponse> {
  const query = toQuery({ page: params.page, limit: params.limit })
  const path = query
    ? `/api/v1/admin/coupons/${id}/redemptions?${query}`
    : `/api/v1/admin/coupons/${id}/redemptions`
  const { body } = await apiRequest<ListCouponRedemptionsResponse>(path)
  return body.data!
}

export async function listDiscountPrivileges(
  params: ListDiscountPrivilegesParams = {},
): Promise<ListDiscountPrivilegesResponse> {
  const query = toQuery({
    page: params.page,
    limit: params.limit,
    search: params.search,
    status: params.status,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  })
  const path = query
    ? `/api/v1/admin/discount-privileges?${query}`
    : '/api/v1/admin/discount-privileges'
  const { body } = await apiRequest<ListDiscountPrivilegesResponse>(path)
  return body.data!
}

export async function getDiscountPrivilegeById(id: string): Promise<PrivilegeRead> {
  const { body } = await apiRequest<PrivilegeRead>(`/api/v1/admin/discount-privileges/${id}`)
  return body.data!
}

export async function createDiscountPrivilege(
  payload: CreateDiscountPrivilegePayload,
): Promise<PrivilegeRead> {
  const { body } = await apiRequest<PrivilegeRead>('/api/v1/admin/discount-privileges', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return body.data!
}

export async function updateDiscountPrivilege(
  id: string,
  payload: UpdateDiscountPrivilegePayload,
): Promise<PrivilegeRead> {
  const { body } = await apiRequest<PrivilegeRead>(`/api/v1/admin/discount-privileges/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return body.data!
}

export async function updateDiscountPrivilegeStatus(
  id: string,
  status: PrivilegeRead['status'],
): Promise<PrivilegeRead> {
  const { body } = await apiRequest<PrivilegeRead>(`/api/v1/admin/discount-privileges/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return body.data!
}

export async function listPrivilegeAssignments(
  id: string,
): Promise<ListPrivilegeAssignmentsResponse> {
  const { body } = await apiRequest<ListPrivilegeAssignmentsResponse>(
    `/api/v1/admin/discount-privileges/${id}/assignments`,
  )
  return body.data!
}

export async function assignDiscountPrivilege(
  id: string,
  merchantId: string,
): Promise<PrivilegeAssignmentRead> {
  const userId = getStoredUser()?.id
  const { body } = await apiRequest<PrivilegeAssignmentRead>(
    `/api/v1/admin/discount-privileges/${id}/assignments`,
    {
      method: 'POST',
      body: JSON.stringify({ merchantId }),
      headers: userId ? { 'x-user-id': userId } : undefined,
    },
  )
  return body.data!
}

export async function unassignDiscountPrivilege(
  id: string,
  merchantId: string,
): Promise<{ unassigned: true }> {
  const { body } = await apiRequest<{ unassigned: true }>(
    `/api/v1/admin/discount-privileges/${id}/assignments/${merchantId}`,
    { method: 'DELETE' },
  )
  return body.data ?? { unassigned: true }
}

export async function listMerchantCommercialOffers(): Promise<MerchantCommercialOffersResponse> {
  const { body } = await apiRequest<MerchantCommercialOffersResponse>(
    '/api/v1/merchant/commercial/offers',
  )
  return body.data!
}

export async function previewMerchantCoupon(
  payload: PreviewCouponPayload,
): Promise<PreviewCouponResponse> {
  const { body } = await apiRequest<PreviewCouponResponse>(
    '/api/v1/merchant/commercial/coupons/preview',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return body.data!
}
