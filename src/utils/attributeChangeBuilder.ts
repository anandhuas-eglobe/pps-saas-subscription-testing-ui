import type {
  CartFeatureSelection,
  FeatureTypeValue,
  InclusionTypeValue,
  PlanDetail,
  PlanDetailFeature,
  PlanDetailFeatureAttribute,
} from '../types/subscription'
import { FeatureType, InclusionType, PriceType } from '../types/subscription'
import { defaultAddonAttributeValue, validateAddonAttributeValue } from './addonBuilder'

export interface SubscribedPlanAttributeItem {
  key: string
  planFeatureId: string
  planFeatureAttributeId: string
  featureName: string
  attributeName: string
  attributeCode: string | null
  inclusionType: InclusionTypeValue
  feature: PlanDetailFeature
  attribute: PlanDetailFeatureAttribute
}

export interface AttributeChangeDraft {
  selected: boolean
  newValue: number
  previousValue: number | null
}

export function extractSubscribedPlanAttributes(plan: PlanDetail): SubscribedPlanAttributeItem[] {
  const items: SubscribedPlanAttributeItem[] = []

  for (const feature of plan.features) {
    if (feature.featureType !== FeatureType.ATTRIBUTE) {
      continue
    }

    for (const attribute of feature.attributes) {
      items.push({
        key: attribute.planFeatureAttributeId,
        planFeatureId: feature.planFeatureId,
        planFeatureAttributeId: attribute.planFeatureAttributeId,
        featureName: feature.featureName ?? feature.featureCode ?? 'Feature',
        attributeName: attribute.attributeName ?? attribute.attributeCode ?? 'Attribute',
        attributeCode: attribute.attributeCode,
        inclusionType: attribute.attributeConfig.inclusionType,
        feature,
        attribute,
      })
    }
  }

  return items
}

export function createDefaultAttributeDrafts(
  items: SubscribedPlanAttributeItem[],
): Record<string, AttributeChangeDraft> {
  const drafts: Record<string, AttributeChangeDraft> = {}
  for (const item of items) {
    drafts[item.planFeatureAttributeId] = {
      selected: false,
      newValue: defaultAddonAttributeValue(item.attribute),
      previousValue: null,
    }
  }
  return drafts
}

export function buildAttributeCartPayload(
  items: SubscribedPlanAttributeItem[],
  drafts: Record<string, AttributeChangeDraft>,
): CartFeatureSelection[] {
  const byFeature = new Map<string, CartFeatureSelection>()

  for (const item of items) {
    const draft = drafts[item.planFeatureAttributeId]
    if (!draft?.selected) {
      continue
    }

    let selection = byFeature.get(item.planFeatureId)
    if (!selection) {
      selection = { planFeatureId: item.planFeatureId, attributes: [] }
      byFeature.set(item.planFeatureId, selection)
    }

    selection.attributes.push({
      planFeatureAttributeId: item.planFeatureAttributeId,
      value: draft.newValue,
    })
  }

  return [...byFeature.values()]
}

export function validateAttributeCartDrafts(
  items: SubscribedPlanAttributeItem[],
  drafts: Record<string, AttributeChangeDraft>,
): string[] {
  const errors: string[] = []
  const selectedItems = items.filter((item) => drafts[item.planFeatureAttributeId]?.selected)

  if (selectedItems.length === 0) {
    errors.push('Select at least one attribute to change.')
    return errors
  }

  for (const item of selectedItems) {
    const draft = drafts[item.planFeatureAttributeId]
    errors.push(...validateAddonAttributeValue(item.attribute, draft.newValue))

    if (draft.previousValue != null && draft.newValue === draft.previousValue) {
      errors.push(
        `${item.attributeName}: new value must differ from the current limit (${draft.previousValue}).`,
      )
    }
  }

  return errors
}

export function inclusionLabel(type: InclusionTypeValue): string {
  return type === InclusionType.INCLUDED ? 'Included' : 'Add-on'
}

export function inclusionColor(
  type: InclusionTypeValue,
): 'primary' | 'secondary' | 'default' {
  return type === InclusionType.INCLUDED ? 'primary' : 'secondary'
}

export function priceTypeLabel(attribute: PlanDetailFeatureAttribute): string {
  return attribute.attributeConfig.priceType === PriceType.VOLUME_PRICE
    ? 'Volume tiers'
    : 'Per count'
}

export function featureTypeLabel(type: FeatureTypeValue): string {
  return type
}
