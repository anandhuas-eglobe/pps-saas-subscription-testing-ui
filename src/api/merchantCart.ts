import type {
  CartTypeValue,
  MerchantAddonCartPreview,
  MerchantAttributeCartPreview,
  MerchantCartPreview,
  MerchantUnifiedCartPreview,
} from '../types/subscription'
import { CartType } from '../types/subscription'
import { apiRequest } from './client'

export const MERCHANT_CART_GET_PATH = '/api/v1/merchant/cart'

export async function getMerchantUnifiedCart(): Promise<MerchantUnifiedCartPreview> {
  const { body } = await apiRequest<MerchantUnifiedCartPreview>(MERCHANT_CART_GET_PATH)
  return body.data!
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
    throw new Error(`Expected cart type ${expectedType} but received ${cart.cartType}`)
  }
  return cart as T extends typeof CartType.PLAN
    ? MerchantCartPreview
    : T extends typeof CartType.ADDON
      ? MerchantAddonCartPreview
      : MerchantAttributeCartPreview
}
