import type {
  FeatureTypeValue,
  PlanDetail,
  PlanDetailFeature,
  PlanDetailFeatureAttribute,
} from '../types/subscription'
import { FeatureType, InclusionType, PriceType } from '../types/subscription'

export interface AddonCatalogItem {
  key: string
  planFeatureId: string
  planFeatureAttributeId?: string
  featureType: FeatureTypeValue
  title: string
  subtitle: string
  feature: PlanDetailFeature
  attribute?: PlanDetailFeatureAttribute
  addonTrialEnabled: boolean
  addonTrialPeriod: number | null
  isProrated: boolean
}

export function extractAddonCatalogItems(plan: PlanDetail): AddonCatalogItem[] {
  const items: AddonCatalogItem[] = []

  for (const feature of plan.features) {
    if (feature.featureType === FeatureType.SIMPLE) {
      if (feature.featureConfig?.inclusionType !== InclusionType.ADDON) {
        continue
      }

      items.push({
        key: feature.planFeatureId,
        planFeatureId: feature.planFeatureId,
        featureType: feature.featureType,
        title: feature.featureName ?? feature.featureCode ?? 'Add-on feature',
        subtitle: feature.featureCode ?? feature.planFeatureId,
        feature,
        addonTrialEnabled: feature.featureConfig.addonTrialEnabled,
        addonTrialPeriod: feature.featureConfig.addonTrialPeriod,
        isProrated: feature.featureConfig.isProrated,
      })
      continue
    }

    for (const attribute of feature.attributes) {
      if (attribute.attributeConfig.inclusionType !== InclusionType.ADDON) {
        continue
      }

      items.push({
        key: `${feature.planFeatureId}:${attribute.planFeatureAttributeId}`,
        planFeatureId: feature.planFeatureId,
        planFeatureAttributeId: attribute.planFeatureAttributeId,
        featureType: feature.featureType,
        title: attribute.attributeName ?? attribute.attributeCode ?? 'Add-on attribute',
        subtitle: `${feature.featureName ?? feature.featureCode ?? 'Feature'} · ${attribute.attributeCode ?? attribute.planFeatureAttributeId}`,
        feature,
        attribute,
        addonTrialEnabled: attribute.attributeConfig.addonTrialEnabled,
        addonTrialPeriod: attribute.attributeConfig.addonTrialPeriod,
        isProrated: attribute.attributeConfig.isProrated,
      })
    }
  }

  return items
}

export function defaultAddonAttributeValue(attribute: PlanDetailFeatureAttribute): number {
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

export function validateAddonAttributeValue(
  attribute: PlanDetailFeatureAttribute,
  value: number,
): string[] {
  const errors: string[] = []
  const label = attribute.attributeName ?? attribute.attributeCode ?? 'Add-on attribute'
  const config = attribute.attributeConfig

  if (value <= 0) {
    errors.push(`${label} must be greater than zero.`)
    return errors
  }

  if (config.priceType === PriceType.VOLUME_PRICE) {
    const allowed = new Set((config.volumePrice ?? []).map((tier) => tier.count))
    if (!allowed.has(value)) {
      errors.push(`${label}: choose one of the available volume tiers.`)
    }
    return errors
  }

  const min = config.minLimit ?? 0
  const max = config.maxLimit
  if (value < min) {
    errors.push(`${label} must be at least ${min}.`)
  }
  if (max != null && value > max) {
    errors.push(`${label} cannot exceed ${max}.`)
  }

  return errors
}
