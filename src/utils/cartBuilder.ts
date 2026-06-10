import type {
  CartFeatureSelection,
  PlanDetail,
  PlanDetailFeature,
  PlanDetailFeatureAttribute,
} from '../types/subscription'
import { FeatureType, InclusionType, PriceType } from '../types/subscription'

export function isIncludedPlanFeature(feature: PlanDetailFeature): boolean {
  if (feature.featureType === FeatureType.SIMPLE) {
    return feature.featureConfig?.inclusionType === InclusionType.INCLUDED
  }
  return feature.attributes.some(
    (attribute) => attribute.attributeConfig.inclusionType === InclusionType.INCLUDED,
  )
}

export function includedAttributesForFeature(
  feature: PlanDetailFeature,
): PlanDetailFeatureAttribute[] {
  return feature.attributes.filter(
    (attribute) => attribute.attributeConfig.inclusionType === InclusionType.INCLUDED,
  )
}

export function includedPlanFeatures(plan: PlanDetail): PlanDetailFeature[] {
  return plan.features.filter(isIncludedPlanFeature)
}

function defaultAttributeValue(attribute: PlanDetailFeatureAttribute): number {
  const config = attribute.attributeConfig

  if (config.priceType === PriceType.VOLUME_PRICE) {
    const tiers = config.volumePrice ?? []
    if (!tiers.length) {
      return 1
    }
    return Math.min(...tiers.map((tier) => tier.count))
  }

  return Math.max(config.minLimit ?? 1, 1)
}

export function buildDefaultCartSelections(plan: PlanDetail): CartFeatureSelection[] {
  return includedPlanFeatures(plan).map((feature) => {
    if (feature.featureType === FeatureType.SIMPLE) {
      return { planFeatureId: feature.planFeatureId, attributes: [] }
    }

    return {
      planFeatureId: feature.planFeatureId,
      attributes: includedAttributesForFeature(feature).map((attribute) => ({
        planFeatureAttributeId: attribute.planFeatureAttributeId,
        value: defaultAttributeValue(attribute),
      })),
    }
  })
}

export function updateAttributeValue(
  plan: PlanDetail,
  selections: CartFeatureSelection[],
  planFeatureAttributeId: string,
  value: number,
): CartFeatureSelection[] {
  const updated = selections.map((selection) => ({
    ...selection,
    attributes: selection.attributes.map((attribute) =>
      attribute.planFeatureAttributeId === planFeatureAttributeId
        ? { ...attribute, value }
        : attribute,
    ),
  }))

  return syncLinkedAttributeValues(plan, updated)
}

function syncLinkedAttributeValues(
  plan: PlanDetail,
  selections: CartFeatureSelection[],
): CartFeatureSelection[] {
  const valueByAttributeId = new Map<string, number>()
  for (const selection of selections) {
    for (const attribute of selection.attributes) {
      valueByAttributeId.set(attribute.planFeatureAttributeId, attribute.value)
    }
  }

  for (const feature of includedPlanFeatures(plan)) {
    if (feature.featureType !== FeatureType.ATTRIBUTE) {
      continue
    }

    const attrsByCatalogId = new Map(
      includedAttributesForFeature(feature).map((attribute) => [
        attribute.featureAttributeId,
        attribute,
      ]),
    )

    for (const attribute of includedAttributesForFeature(feature)) {
      if (!attribute.parentFeatureAttributeId) {
        continue
      }

      const parent = attrsByCatalogId.get(attribute.parentFeatureAttributeId)
      if (!parent) {
        continue
      }

      const parentValue = valueByAttributeId.get(parent.planFeatureAttributeId) ?? 0
      const currentValue = valueByAttributeId.get(attribute.planFeatureAttributeId) ?? 0
      if (currentValue < parentValue) {
        valueByAttributeId.set(attribute.planFeatureAttributeId, parentValue)
      }
    }
  }

  return selections.map((selection) => ({
    ...selection,
    attributes: selection.attributes.map((attribute) => ({
      ...attribute,
      value: valueByAttributeId.get(attribute.planFeatureAttributeId) ?? attribute.value,
    })),
  }))
}

export function getAttributeFromPlan(
  plan: PlanDetail,
  planFeatureAttributeId: string,
): PlanDetailFeatureAttribute | undefined {
  for (const feature of plan.features) {
    const attribute = feature.attributes.find(
      (item) => item.planFeatureAttributeId === planFeatureAttributeId,
    )
    if (attribute) {
      return attribute
    }
  }
  return undefined
}

export function validateCartSelections(plan: PlanDetail, selections: CartFeatureSelection[]): string[] {
  const errors: string[] = []
  const includedFeatures = includedPlanFeatures(plan)

  if (selections.length !== includedFeatures.length) {
    errors.push(
      `This plan requires ${includedFeatures.length} included feature row(s), but ${selections.length} were configured.`,
    )
  }

  for (const feature of includedFeatures) {
    const selection = selections.find((item) => item.planFeatureId === feature.planFeatureId)
    if (!selection) {
      errors.push(`Missing configuration for feature "${feature.featureName ?? feature.featureCode}".`)
      continue
    }

    if (feature.featureType === FeatureType.SIMPLE) {
      continue
    }

    const includedAttrs = includedAttributesForFeature(feature)
    for (const attribute of includedAttrs) {
      const row = selection.attributes.find(
        (item) => item.planFeatureAttributeId === attribute.planFeatureAttributeId,
      )
      if (!row) {
        errors.push(`Missing value for "${attribute.attributeName ?? attribute.attributeCode}".`)
        continue
      }

      const label = attribute.attributeName ?? attribute.attributeCode ?? 'Attribute'
      const config = attribute.attributeConfig

      if (row.value <= 0) {
        errors.push(`${label} must be greater than zero.`)
        continue
      }

      if (config.priceType === PriceType.VOLUME_PRICE) {
        const allowed = new Set((config.volumePrice ?? []).map((tier) => tier.count))
        if (!allowed.has(row.value)) {
          errors.push(`${label}: choose one of the available volume tiers.`)
        }
        continue
      }

      const min = config.minLimit ?? 0
      const max = config.maxLimit
      if (row.value < min) {
        errors.push(`${label} must be at least ${min}.`)
      }
      if (max != null && row.value > max) {
        errors.push(`${label} cannot exceed ${max}.`)
      }
    }
  }

  return errors
}
