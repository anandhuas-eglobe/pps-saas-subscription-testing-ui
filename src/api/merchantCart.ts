import type {
  CartTypeValue,
  MerchantAddonCartPreview,
  MerchantAttributeCartPreview,
  MerchantCartPreview,
  MerchantUnifiedCartPreview,
} from '../types/subscription'
import { CartType } from '../types/subscription'
import { apiRequest, ApiRequestError } from './client'

export const MERCHANT_CART_GET_PATH = '/api/v1/merchant/cart'

export async function getMerchantUnifiedCart(): Promise<MerchantUnifiedCartPreview> {
  const { body } = await apiRequest<MerchantUnifiedCartPreview>(MERCHANT_CART_GET_PATH)
  return body.data!
}

/** GET unified cart; returns null when no cart exists (404). */
export async function fetchMerchantUnifiedCartOrNull(): Promise<MerchantUnifiedCartPreview | null> {
  try {
    return await getMerchantUnifiedCart()
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null
    }
    throw error
  }
}

/** GET unified cart; returns null when missing or when persisted cartType does not match. */
export async function fetchMerchantCartPreviewForType(
  expectedType: typeof CartType.PLAN,
): Promise<MerchantCartPreview | null>
export async function fetchMerchantCartPreviewForType(
  expectedType: typeof CartType.ADDON,
): Promise<MerchantAddonCartPreview | null>
export async function fetchMerchantCartPreviewForType(
  expectedType: typeof CartType.ATTRIBUTE,
): Promise<MerchantAttributeCartPreview | null>
export async function fetchMerchantCartPreviewForType(
  expectedType: CartTypeValue,
): Promise<MerchantUnifiedCartPreview | null> {
  const cart = await fetchMerchantUnifiedCartOrNull()
  if (!cart || cart.cartType !== expectedType) {
    return null
  }
  return cart
}

export function isPlanCartPreview(
  cart: MerchantUnifiedCartPreview,
): cart is MerchantCartPreview {
  return cart.cartType === CartType.PLAN
}

export function isAddonCartPreview(
  cart: MerchantUnifiedCartPreview,
): cart is MerchantAddonCartPreview {
  return cart.cartType === CartType.ADDON
}

export function isAttributeCartPreview(
  cart: MerchantUnifiedCartPreview,
): cart is MerchantAttributeCartPreview {
  return cart.cartType === CartType.ATTRIBUTE
}

/** After upsert: unified GET and require the expected cart type. */
export async function getMerchantCartByType<T extends CartTypeValue>(
  expectedType: T,
): Promise<
  T extends typeof CartType.PLAN
    ? MerchantCartPreview
    : T extends typeof CartType.ADDON
      ? MerchantAddonCartPreview
      : MerchantAttributeCartPreview
> {
  const cart = await getMerchantUnifiedCart()
  if (cart.cartType !== expectedType) {
    throw new Error(
      `Expected cart type ${expectedType} but the merchant cart is ${cart.cartType}. ` +
        'Use GET /api/v1/merchant/cart and branch on cartType in the response.',
    )
  }
  return cart as T extends typeof CartType.PLAN
    ? MerchantCartPreview
    : T extends typeof CartType.ADDON
      ? MerchantAddonCartPreview
      : MerchantAttributeCartPreview
}
