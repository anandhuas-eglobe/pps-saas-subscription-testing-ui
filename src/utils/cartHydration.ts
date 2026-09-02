import { ApiRequestError } from '../api/errors'
import {
  getMerchantAddonCart,
  getMerchantAttributeCart,
  getMerchantCart,
} from '../api/merchant'
import type {
  CartFeatureSelection,
  MerchantAddonCartPreview,
  MerchantAttributeCartPreview,
  MerchantCartPreview,
  PlanDetail,
} from '../types/subscription'
import { BillingCycle } from '../types/subscription'
import type { AddonCatalogItem } from './addonBuilder'
import type { AttributeChangeDraft } from './attributeChangeBuilder'
import { buildDefaultCartSelections } from './cartBuilder'

async function fetchCartOrNull<T>(fetcher: () => Promise<T>): Promise<T | null> {
  try {
    return await fetcher()
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null
    }
    throw error
  }
}

export async function fetchExistingPlanCart(): Promise<MerchantCartPreview | null> {
  return fetchCartOrNull(() => getMerchantCart())
}

export async function fetchExistingAddonCart(): Promise<MerchantAddonCartPreview | null> {
  return fetchCartOrNull(() => getMerchantAddonCart())
}

export async function fetchExistingAttributeCart(): Promise<MerchantAttributeCartPreview | null> {
  return fetchCartOrNull(() => getMerchantAttributeCart())
}

export function selectionsFromPlanCartPreview(cart: MerchantCartPreview): CartFeatureSelection[] {
  return cart.planDetails.selections.map((selection) => ({
    planFeatureId: selection.planFeatureId,
    attributes: selection.attributes.map((attribute) => ({
      planFeatureAttributeId: attribute.planFeatureAttributeId,
      value: attribute.value,
    })),
  }))
}

export function addonKeyFromCartPreview(cart: MerchantAddonCartPreview): string {
  const attributeId = cart.addon.attribute?.planFeatureAttributeId
  if (attributeId) {
    return `${cart.addon.planFeatureId}:${attributeId}`
  }
  return cart.addon.planFeatureId
}

export function hydratePlanCartFormState(
  cart: MerchantCartPreview,
  plan: PlanDetail,
): {
  billingCycle: typeof BillingCycle.MONTHLY | typeof BillingCycle.YEARLY
  isTrial: boolean
  selections: CartFeatureSelection[]
} {
  return {
    billingCycle: cart.billingCycle ?? BillingCycle.MONTHLY,
    isTrial: cart.isTrial,
    selections: cart.isTrial ? buildDefaultCartSelections(plan) : selectionsFromPlanCartPreview(cart),
  }
}

export function hydrateAddonCartFormState(cart: MerchantAddonCartPreview): {
  addonKey: string
  isAddonTrial: boolean
  attributeValue: number
} {
  return {
    addonKey: addonKeyFromCartPreview(cart),
    isAddonTrial: cart.isTrial,
    attributeValue: cart.addon.attribute?.value ?? 1,
  }
}

export function applyAttributeCartPreviewToDrafts(
  drafts: Record<string, AttributeChangeDraft>,
  cart: MerchantAttributeCartPreview,
): Record<string, AttributeChangeDraft> {
  const next = { ...drafts }

  for (const change of cart.attributeChanges) {
    const existing = next[change.planFeatureAttributeId]
    next[change.planFeatureAttributeId] = {
      selected: true,
      newValue: change.newValue,
      previousValue: change.previousValue ?? existing?.previousValue ?? null,
    }
  }

  return next
}

export function readShortTermPurchaseFromCart(
  cart: MerchantAttributeCartPreview | null | undefined,
): boolean {
  return cart?.isShortTermPurchase === true
}

export function findAddonCatalogItem(
  addonItems: AddonCatalogItem[],
  addonKey: string,
): AddonCatalogItem | undefined {
  return addonItems.find((item) => item.key === addonKey)
}
