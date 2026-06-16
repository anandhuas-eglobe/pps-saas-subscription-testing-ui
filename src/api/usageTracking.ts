import type {
  ConfirmMerchantUsagePayload,
  ConfirmMerchantUsageResponse,
  LogMerchantUsagePayload,
  LogMerchantUsageResponse,
  RemoveMerchantUsagePayload,
  ValidateMerchantUsageResponse,
} from '../types/subscription'
import { resolveApiBoolean } from '../utils/apiBoolean'
import { apiRequest } from './client'

const BASE_PATH = '/api/v1/merchant/usage-tracking'

export async function validateMerchantUsage(
  attributeCode: string,
): Promise<ValidateMerchantUsageResponse> {
  const params = new URLSearchParams({ attributeCode })
  const { body } = await apiRequest<ValidateMerchantUsageResponse>(
    `${BASE_PATH}/validate?${params.toString()}`,
  )
  return body.data!
}

export async function logMerchantUsage(
  payload: LogMerchantUsagePayload,
  options?: { fallbackIsOverage?: boolean },
): Promise<LogMerchantUsageResponse> {
  const { body } = await apiRequest<LogMerchantUsageResponse>(`${BASE_PATH}/log`, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      isOverageAllowed: resolveApiBoolean(payload.isOverageAllowed),
    }),
  })
  const data = body.data!

  return {
    id: data.id,
    isOverage: resolveApiBoolean(data.isOverage, options?.fallbackIsOverage ?? false),
  }
}

export async function confirmMerchantUsage(
  payload: ConfirmMerchantUsagePayload,
): Promise<ConfirmMerchantUsageResponse> {
  const requestBody = {
    entityReferenceId: payload.entityReferenceId,
    attributeCode: payload.attributeCode,
    usageId: payload.usageId,
    isOverage: resolveApiBoolean(payload.isOverage),
  }
  const { body } = await apiRequest<ConfirmMerchantUsageResponse>(`${BASE_PATH}/confirm`, {
    method: 'PUT',
    body: JSON.stringify(requestBody),
  })
  return body.data!
}

export async function removeMerchantUsage(payload: RemoveMerchantUsagePayload): Promise<void> {
  await apiRequest<null>(`${BASE_PATH}/remove`, {
    method: 'DELETE',
    body: JSON.stringify(payload),
  })
}
