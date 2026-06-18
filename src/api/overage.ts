import type {
  ListOverageHistoryParams,
  ManualOveragePaymentResult,
  OverageHistoryListItem,
  PaginatedListResponse,
} from '../types/subscription'
import { apiRequest } from './client'

export async function listOverageHistory(
  params: ListOverageHistoryParams = {},
): Promise<PaginatedListResponse<OverageHistoryListItem>> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.status) searchParams.set('status', params.status)
  if (params.overageType) searchParams.set('overageType', params.overageType)
  if (params.invoiceId) searchParams.set('invoiceId', params.invoiceId)
  if (params.planFeatureAttributeId) {
    searchParams.set('planFeatureAttributeId', params.planFeatureAttributeId)
  }
  if (params.attributeCode) searchParams.set('attributeCode', params.attributeCode)
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom)
  if (params.dateTo) searchParams.set('dateTo', params.dateTo)
  if (params.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)

  const query = searchParams.toString()
  const path = `/api/v1/merchant/overage-tracking${query ? `?${query}` : ''}`
  const { body } = await apiRequest<PaginatedListResponse<OverageHistoryListItem>>(path)
  return body.data!
}

export async function initiateManualOveragePayment(): Promise<ManualOveragePaymentResult> {
  const { body } = await apiRequest<ManualOveragePaymentResult>(
    '/api/v1/merchant/overage-tracking/manual-payment',
    { method: 'POST' },
  )
  return body.data!
}
