import type {
  AvailablePlanAddonItem,
  AvailablePlanAddonsResponse,
  FeatureTypeValue,
  PlanDetail,
  PlanDetailFeature,
  PlanDetailFeatureAttribute,
} from '../types/subscription'
import type { BillingCycleValue } from '../types/subscription'
import { BillingCycle, FeatureType, InclusionType, PriceType } from '../types/subscription'

export interface AddonCatalogItem {
  key: string
  planFeatureId: string
  planFeatureAttributeId?: string
  featureType: FeatureTypeValue
  title: string
  subtitle: string
  addonCode: string
  feature: PlanDetailFeature
  attribute?: PlanDetailFeatureAttribute
  /** Merchant eligibility to start a new add-on trial (available-addons API). */
  addonTrialEnabled: boolean
  addonTrialPeriod: number | null
  isProrated: boolean
  isPurchased: boolean
  inAddonTrial: boolean
  computedMonthlyPrice: number
  computedYearlyPrice: number
  orderVolumeLinked: boolean
  featureDescription: string | null
  attributeDescription: string | null
  iconUrl: string | null
}

export function mapAvailablePlanAddonsToCatalogItems(
  response: AvailablePlanAddonsResponse,
): AddonCatalogItem[] {
  return response.addons.map((row) => mapAvailablePlanAddonRow(row))
}

function mapAvailablePlanAddonRow(row: AvailablePlanAddonItem): AddonCatalogItem {
  const feature: PlanDetailFeature = {
    planFeatureId: row.planFeatureId,
    featureId: row.featureId,
    featureType: row.featureType,
    featureCode: row.feature.featureCode,
    featureName: row.feature.featureName,
    featureConfig: row.feature.featureConfig,
    attributes: [],
  }

  const attribute: PlanDetailFeatureAttribute | undefined = row.attribute
    ? {
        planFeatureAttributeId: row.attribute.planFeatureAttributeId,
        featureAttributeId: row.attribute.featureAttributeId,
        parentFeatureAttributeId: row.attribute.parentFeatureAttributeId,
        attributeName: row.attribute.attributeName,
        attributeCode: row.attribute.attributeCode,
        isMonthlyLimit: row.attribute.isMonthlyLimit,
        attributeConfig: row.attribute.attributeConfig,
      }
    : undefined

  const isProrated =
    row.featureType === FeatureType.SIMPLE
      ? (row.feature.featureConfig?.isProrated ?? false)
      : (row.attribute?.attributeConfig.isProrated ?? false)

  const key = row.planFeatureAttributeId
    ? `${row.planFeatureId}:${row.planFeatureAttributeId}`
    : row.planFeatureId

  return {
    key,
    planFeatureId: row.planFeatureId,
    planFeatureAttributeId: row.planFeatureAttributeId ?? undefined,
    featureType: row.featureType,
    title: row.addonName,
    subtitle:
      row.featureType === FeatureType.SIMPLE
        ? (row.feature.featureCode ?? row.addonCode)
        : `${row.feature.featureName ?? row.feature.featureCode ?? 'Feature'} · ${row.attribute?.attributeCode ?? row.addonCode}`,
    addonCode: row.addonCode,
    feature,
    attribute,
    addonTrialEnabled: row.trial.enabled,
    addonTrialPeriod: row.trial.days,
    isProrated,
    isPurchased: row.isPurchased,
    inAddonTrial: row.trial.inTrial,
    computedMonthlyPrice: row.computedMonthlyPrice,
    computedYearlyPrice: row.computedYearlyPrice,
    orderVolumeLinked: row.attribute?.parentFeatureAttributeId != null,
    featureDescription: row.feature.description,
    attributeDescription: row.attribute?.description ?? null,
    iconUrl: row.attribute?.iconUrl ?? row.feature.iconUrl,
  }
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
        addonCode: feature.featureCode ?? feature.planFeatureId,
        feature,
        addonTrialEnabled: feature.featureConfig.addonTrialEnabled,
        addonTrialPeriod: feature.featureConfig.addonTrialPeriod,
        isProrated: feature.featureConfig.isProrated,
        isPurchased: false,
        inAddonTrial: false,
        computedMonthlyPrice: feature.featureConfig.planFeaturePriceMonthly,
        computedYearlyPrice: feature.featureConfig.planFeaturePriceYearly,
        orderVolumeLinked: false,
        featureDescription: null,
        attributeDescription: null,
        iconUrl: null,
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
        addonCode: attribute.attributeCode ?? attribute.planFeatureAttributeId,
        feature,
        attribute,
        addonTrialEnabled: attribute.attributeConfig.addonTrialEnabled,
        addonTrialPeriod: attribute.attributeConfig.addonTrialPeriod,
        isProrated: attribute.attributeConfig.isProrated,
        isPurchased: false,
        inAddonTrial: false,
        computedMonthlyPrice: attribute.attributeConfig.baseMonthlyPrice ?? 0,
        computedYearlyPrice: attribute.attributeConfig.baseYearlyPrice ?? 0,
        orderVolumeLinked: attribute.parentFeatureAttributeId != null,
        featureDescription: null,
        attributeDescription: null,
        iconUrl: null,
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

/**
 * Short-term addon purchase is allowed for SIMPLE features and LIMITED_MONTHLY attributes only.
 */
export function addonPriceForBillingCycle(
  addon: AddonCatalogItem,
  billingCycle: BillingCycleValue,
): number {
  return billingCycle === BillingCycle.YEARLY
    ? addon.computedYearlyPrice
    : addon.computedMonthlyPrice
}

export function isAddonShortTermPurchaseEligible(addon: AddonCatalogItem): boolean {
  if (addon.featureType === FeatureType.SIMPLE) {
    return true
  }
  return addon.attribute?.isMonthlyLimit === true
}

