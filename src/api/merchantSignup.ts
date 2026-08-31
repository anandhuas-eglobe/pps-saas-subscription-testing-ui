import type {
  CompleteMerchantProfilePayload,
  CompleteMerchantProfileResult,
  IndustryDropdownItem,
  InitiateMerchantSignupPayload,
  InitiateMerchantSignupResult,
} from '../types/merchantSignup'
import { apiRequest } from './client'

export async function initiateMerchantSignup(
  payload: InitiateMerchantSignupPayload,
): Promise<InitiateMerchantSignupResult> {
  const { body } = await apiRequest<null>(
    '/api/v1/merchants/signup/initiate',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )

  return {
    message: body.message ?? 'Email verification sent.',
  }
}

export async function completeMerchantProfile(
  payload: CompleteMerchantProfilePayload,
): Promise<CompleteMerchantProfileResult> {
  const { body } = await apiRequest<CompleteMerchantProfileResult>(
    '/api/v1/merchants/complete-your-profile',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return body.data!
}

export async function listIndustryDropdown(): Promise<IndustryDropdownItem[]> {
  const { body } = await apiRequest<IndustryDropdownItem[]>(
    '/api/v1/industries/dropdown',
  )
  return body.data ?? []
}
