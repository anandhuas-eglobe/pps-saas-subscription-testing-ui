import type {
  ActiveSubscriptionResponse,
  InitiateAttributePurchasePayload,
  InitiatePlanPurchasePayload,
  InvoiceDetail,
  InvoiceListResponse,
  ListInvoicesParams,
  MerchantAddonCartPreview,
  MerchantAddonPurchaseResult,
  MerchantAttributeCartPreview,
  MerchantAttributePurchaseResult,
  MerchantCartPreview,
  MerchantPlanListResponse,
  MerchantPlanPurchaseResult,
  UpsertAddonCartPayload,
  UpsertAttributeCartPayload,
  UpsertMerchantCartPayload,
} from '../types/subscription'
import { apiRequest } from './client'

export async function listMerchantPlans(): Promise<MerchantPlanListResponse> {
  const { body } = await apiRequest<MerchantPlanListResponse>(
    '/api/v1/merchant/subscription/plans',
  )
  return body.data!
}

export async function upsertMerchantCart(
  payload: UpsertMerchantCartPayload,
): Promise<{ message: string }> {
  const { body } = await apiRequest<{ message: string }>('/api/v1/merchant/cart/plan', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return body.data ?? { message: body.message ?? 'Merchant cart upserted successfully' }
}

export async function getMerchantCart(): Promise<MerchantCartPreview> {
  const { body } = await apiRequest<MerchantCartPreview>('/api/v1/merchant/cart/plan')
  return body.data!
}

export async function purchasePlanCart(
  payload: InitiatePlanPurchasePayload = {},
): Promise<MerchantPlanPurchaseResult> {
  const { body } = await apiRequest<MerchantPlanPurchaseResult>(
    '/api/v1/merchant/subscription/plan/purchase',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return body.data!
}

export async function getActiveSubscription(): Promise<ActiveSubscriptionResponse> {
  const { body } = await apiRequest<ActiveSubscriptionResponse>(
    '/api/v1/merchant/subscription/active',
  )
  return body.data!
}

export async function upsertAddonCart(payload: UpsertAddonCartPayload): Promise<{ message: string }> {
  const { body } = await apiRequest<{ message: string }>('/api/v1/merchant/cart/addon', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return body.data ?? { message: body.message ?? 'Add-on cart upserted successfully' }
}

export async function getMerchantAddonCart(): Promise<MerchantAddonCartPreview> {
  const { body } = await apiRequest<MerchantAddonCartPreview>('/api/v1/merchant/cart/addon')
  return body.data!
}

export async function purchaseAddonCart(
  payload: InitiatePlanPurchasePayload = {},
): Promise<MerchantAddonPurchaseResult> {
  const { body } = await apiRequest<MerchantAddonPurchaseResult>(
    '/api/v1/merchant/subscription/addon/purchase',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return body.data!
}

export async function upsertAttributeCart(
  payload: UpsertAttributeCartPayload,
): Promise<{ message: string }> {
  const { body } = await apiRequest<{ message: string }>('/api/v1/merchant/cart/attribute', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return body.data ?? { message: body.message ?? 'Attribute cart upserted successfully' }
}

export async function getMerchantAttributeCart(): Promise<MerchantAttributeCartPreview> {
  const { body } = await apiRequest<MerchantAttributeCartPreview>(
    '/api/v1/merchant/cart/attribute',
  )
  return body.data!
}

export async function purchaseAttributeCart(
  payload: InitiateAttributePurchasePayload,
): Promise<MerchantAttributePurchaseResult> {
  const { body } = await apiRequest<MerchantAttributePurchaseResult>(
    '/api/v1/merchant/subscription/attribute/purchase',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return body.data!
}

export async function listInvoices(params: ListInvoicesParams = {}): Promise<InvoiceListResponse> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.subscriptionId) searchParams.set('subscriptionId', params.subscriptionId)
  if (params.status) searchParams.set('status', params.status)
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom)
  if (params.dateTo) searchParams.set('dateTo', params.dateTo)
  if (params.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)

  const query = searchParams.toString()
  const path = `/api/v1/merchant/subscription/invoices${query ? `?${query}` : ''}`
  const { body } = await apiRequest<InvoiceListResponse>(path)
  return body.data!
}

export async function getInvoiceById(invoiceId: string): Promise<InvoiceDetail> {
  const { body } = await apiRequest<InvoiceDetail>(
    `/api/v1/merchant/subscription/invoices/${invoiceId}`,
  )
  return body.data!
}
