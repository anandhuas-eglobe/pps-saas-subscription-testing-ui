import type {
  ActivePlanAddonsResponse,
  ActiveSubscriptionResponse,
  CancelAddonSubscriptionResult,
  CancelAttributeDowngradeScheduleResult,
  CancelMessageResult,
  InitiateAttributePurchasePayload,
  InitiatePlanPurchasePayload,
  InvoiceDetail,
  InvoiceListResponse,
  InvoiceReceipt,
  ListInvoicesParams,
  ListSubscriptionHistoryParams,
  InitiateManualRenewalPayload,
  ManualRenewalResponse,
  ManualSubscriptionRenewalPreviewResponse,
  MerchantAddonCartPreview,
  MerchantAddonPurchaseResult,
  MerchantAttributeCartPreview,
  MerchantAttributePurchaseResult,
  MerchantCartPreview,
  MerchantPlanListResponse,
  MerchantPlanPurchaseResult,
  PaginatedListResponse,
  ScheduledSubscriptionDowngradeResponse,
  SubscriptionHistoryListItem,
  UpsertAddonCartPayload,
  UpsertAttributeCartPayload,
  UpsertMerchantCartPayload,
} from '../types/subscription'
import type { PlanDetail } from '../types/subscription'
import { apiDownloadBlob, apiRequest } from './client'

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

export async function getActivePlanAddons(): Promise<ActivePlanAddonsResponse> {
  const { body } = await apiRequest<ActivePlanAddonsResponse>(
    '/api/v1/merchant/subscription/active-plan/addons',
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

export async function listGuestPlans(): Promise<PlanDetail[]> {
  const { body } = await apiRequest<PlanDetail[]>('/api/v1/merchant/subscription/guest-plans')
  return body.data ?? []
}

export async function getScheduledSubscriptionDowngrade(): Promise<ScheduledSubscriptionDowngradeResponse> {
  const { body } = await apiRequest<ScheduledSubscriptionDowngradeResponse>(
    '/api/v1/merchant/subscription/downgrade/schedule',
  )
  return body.data!
}

export async function cancelScheduledSubscriptionDowngrade(): Promise<CancelMessageResult> {
  const { body } = await apiRequest<CancelMessageResult>(
    '/api/v1/merchant/subscription/downgrade/schedule/cancel',
    { method: 'POST' },
  )
  return body.data ?? { message: body.message ?? 'Scheduled downgrade cancelled' }
}

export async function getManualSubscriptionRenewalPreview(): Promise<ManualSubscriptionRenewalPreviewResponse> {
  const { body } = await apiRequest<ManualSubscriptionRenewalPreviewResponse>(
    '/api/v1/merchant/subscription/renewal/preview',
  )
  return body.data!
}

export async function cancelSubscriptionAutoRenew(): Promise<CancelMessageResult> {
  const { body } = await apiRequest<CancelMessageResult>(
    '/api/v1/merchant/subscription/auto-renew/cancel',
    { method: 'PUT' },
  )
  return body.data ?? { message: body.message ?? 'Auto-renew disabled' }
}

export async function initiateManualRenewal(
  payload: InitiateManualRenewalPayload = {},
): Promise<ManualRenewalResponse> {
  const { body } = await apiRequest<ManualRenewalResponse>(
    '/api/v1/merchant/subscription/renew',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return body.data!
}

export async function listSubscriptionHistory(
  params: ListSubscriptionHistoryParams = {},
): Promise<PaginatedListResponse<SubscriptionHistoryListItem>> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.startDateFrom) searchParams.set('startDateFrom', params.startDateFrom)
  if (params.startDateTo) searchParams.set('startDateTo', params.startDateTo)
  if (params.endDateFrom) searchParams.set('endDateFrom', params.endDateFrom)
  if (params.endDateTo) searchParams.set('endDateTo', params.endDateTo)
  if (params.invoiceAmountFrom != null) {
    searchParams.set('invoiceAmountFrom', String(params.invoiceAmountFrom))
  }
  if (params.invoiceAmountTo != null) {
    searchParams.set('invoiceAmountTo', String(params.invoiceAmountTo))
  }
  if (params.invoiceNumber) searchParams.set('invoiceNumber', params.invoiceNumber)
  if (params.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)

  const query = searchParams.toString()
  const path = `/api/v1/merchant/subscription/history${query ? `?${query}` : ''}`
  const { body } = await apiRequest<PaginatedListResponse<SubscriptionHistoryListItem>>(path)
  return body.data!
}

export async function cancelAddonSubscription(
  addonSubscriptionId: string,
): Promise<CancelAddonSubscriptionResult> {
  const { body } = await apiRequest<CancelAddonSubscriptionResult>(
    '/api/v1/merchant/subscription/addon/cancel',
    {
      method: 'POST',
      body: JSON.stringify({ addonSubscriptionId }),
    },
  )
  return body.data!
}

export async function cancelAttributeDowngradeSchedule(
  planFeatureAttributeId: string,
): Promise<CancelAttributeDowngradeScheduleResult> {
  const { body } = await apiRequest<CancelAttributeDowngradeScheduleResult>(
    '/api/v1/merchant/subscription/attribute/downgrade/schedule/cancel',
    {
      method: 'POST',
      body: JSON.stringify({ planFeatureAttributeId }),
    },
  )
  return body.data!
}

export async function downloadInvoicePdf(invoiceId: string): Promise<void> {
  await apiDownloadBlob(
    `/api/v1/merchant/subscription/invoices/${invoiceId}/download`,
    `invoice-${invoiceId}.pdf`,
  )
}

export async function getReceiptById(receiptId: string): Promise<InvoiceReceipt> {
  const { body } = await apiRequest<InvoiceReceipt>(
    `/api/v1/merchant/subscription/receipts/${receiptId}`,
  )
  return body.data!
}

export async function downloadReceiptPdf(receiptId: string): Promise<void> {
  await apiDownloadBlob(
    `/api/v1/merchant/subscription/receipts/${receiptId}/download`,
    `receipt-${receiptId}.pdf`,
  )
}
