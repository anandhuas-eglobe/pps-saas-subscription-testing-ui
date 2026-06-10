import type {
  AttributeConfig,
  CatalogFeature,
  CreatePlanPayload,
  FeatureConfig,
  PlanFeature,
  PlanFeatureAttribute,
} from '../types/subscription'
import { FeatureType, InclusionType, PlanType, PriceType } from '../types/subscription'

export const REQUIRED_ATTRIBUTE_CODES = ['NUM_USERS', 'MONTHLY_ORDER_VOLUME'] as const

export function defaultFeatureConfig(
  inclusionType: 'INCLUDED' | 'ADDON' = InclusionType.INCLUDED,
): FeatureConfig {
  return {
    planFeaturePriceMonthly: 0,
    planFeaturePriceYearly: 0,
    inclusionType,
    isProrated: false,
    addonTrialEnabled: false,
    addonTrialPeriod: null,
  }
}

export function defaultAttributeConfig(
  attributeCode: string,
  priceType: 'PER_COUNT' | 'VOLUME_PRICE' = PriceType.PER_COUNT,
): AttributeConfig {
  const base: AttributeConfig = {
    inclusionType: InclusionType.INCLUDED,
    priceType,
    baseMonthlyPrice: 99.99,
    baseYearlyPrice: 999.99,
    isProrated: false,
    isOverageEnabled: false,
    addonTrialEnabled: false,
    addonTrialPeriod: null,
  }

  if (priceType === PriceType.VOLUME_PRICE) {
    return {
      ...base,
      volumePrice: [
        { count: 20, monthlyPrice: 40, yearlyPrice: 400 },
        { count: 50, monthlyPrice: 90, yearlyPrice: 900 },
      ],
    }
  }

  if (attributeCode === 'NUM_USERS') {
    return {
      ...base,
      minLimit: 1,
      maxLimit: 10,
      pricePerUnitMonthly: 5,
      pricePerUnitYearly: 50,
    }
  }

  if (attributeCode === 'MONTHLY_ORDER_VOLUME') {
    return {
      ...base,
      minLimit: 100,
      maxLimit: 1000,
      pricePerUnitMonthly: 0,
      pricePerUnitYearly: 0,
      isOverageEnabled: true,
      overagePricePerUnit: 0.25,
    }
  }

  return {
    ...base,
    minLimit: 1,
    maxLimit: 10,
    pricePerUnitMonthly: 2,
    pricePerUnitYearly: 20,
  }
}

export function applyPriceTypeChange(
  config: AttributeConfig,
  priceType: AttributeConfig['priceType'],
): AttributeConfig {
  if (priceType === PriceType.VOLUME_PRICE) {
    return {
      inclusionType: config.inclusionType,
      priceType,
      baseMonthlyPrice: config.baseMonthlyPrice ?? 99.99,
      baseYearlyPrice: config.baseYearlyPrice ?? 999.99,
      volumePrice: config.volumePrice?.length
        ? config.volumePrice
        : [
            { count: 20, monthlyPrice: 40, yearlyPrice: 400 },
            { count: 50, monthlyPrice: 90, yearlyPrice: 900 },
          ],
      isProrated: config.isProrated,
      isOverageEnabled: config.isOverageEnabled,
      overagePricePerUnit: config.overagePricePerUnit,
      addonTrialEnabled: config.addonTrialEnabled,
      addonTrialPeriod: config.addonTrialPeriod,
    }
  }

  return {
    inclusionType: config.inclusionType,
    priceType,
    baseMonthlyPrice: config.baseMonthlyPrice ?? 99.99,
    baseYearlyPrice: config.baseYearlyPrice ?? 999.99,
    minLimit: config.minLimit ?? 1,
    maxLimit: config.maxLimit ?? 10,
    pricePerUnitMonthly: config.pricePerUnitMonthly ?? 2,
    pricePerUnitYearly: config.pricePerUnitYearly ?? 20,
    isProrated: config.isProrated,
    isOverageEnabled: config.isOverageEnabled,
    overagePricePerUnit: config.overagePricePerUnit,
    addonTrialEnabled: config.addonTrialEnabled,
    addonTrialPeriod: config.addonTrialPeriod,
  }
}

export function sanitizeAttributeConfig(config: AttributeConfig): AttributeConfig {
  const base = {
    inclusionType: config.inclusionType,
    priceType: config.priceType,
    baseMonthlyPrice: config.baseMonthlyPrice ?? 0,
    baseYearlyPrice: config.baseYearlyPrice ?? 0,
    isProrated: config.isProrated,
    isOverageEnabled: config.isOverageEnabled,
    addonTrialEnabled: config.addonTrialEnabled,
  }

  if (config.priceType === PriceType.VOLUME_PRICE) {
    return {
      ...base,
      volumePrice: config.volumePrice?.length
        ? config.volumePrice
        : [{ count: 20, monthlyPrice: 40, yearlyPrice: 400 }],
      ...(config.isOverageEnabled
        ? { overagePricePerUnit: config.overagePricePerUnit ?? 0 }
        : {}),
      ...(config.addonTrialEnabled
        ? { addonTrialPeriod: config.addonTrialPeriod ?? 14 }
        : {}),
    }
  }

  return {
    ...base,
    minLimit: config.minLimit,
    maxLimit: config.maxLimit,
    pricePerUnitMonthly: config.pricePerUnitMonthly,
    pricePerUnitYearly: config.pricePerUnitYearly,
    ...(config.isOverageEnabled
      ? { overagePricePerUnit: config.overagePricePerUnit ?? 0 }
      : {}),
    ...(config.addonTrialEnabled
      ? { addonTrialPeriod: config.addonTrialPeriod ?? 14 }
      : {}),
  }
}

export function mergeAttributeConfigUpdate(
  current: AttributeConfig | undefined,
  patch: Partial<AttributeConfig>,
  attributeCode = '',
): AttributeConfig {
  const previous = current ?? defaultAttributeConfig(attributeCode)

  if (patch.priceType && patch.priceType !== previous.priceType) {
    return applyPriceTypeChange(previous, patch.priceType)
  }

  const merged = { ...previous, ...patch }

  if (merged.priceType === PriceType.VOLUME_PRICE) {
    return applyPriceTypeChange(merged, PriceType.VOLUME_PRICE)
  }

  const { volumePrice: _volumePrice, ...perCountConfig } = merged
  return perCountConfig
}

export function createDefaultPlanForm(): CreatePlanPayload {
  return {
    planName: 'Test Pro Plan',
    planDescription: 'Subscription plan created from the testing UI',
    planType: PlanType.PUBLIC,
    baseMonthlyPrice: 99,
    baseYearlyPrice: 999,
    baseCurrency: 'USD',
    isTrialPeriodEnabled: false,
    trialPeriod: null,
    isGracePeriodEnabled: false,
    gracePeriod: null,
    overageAutoChargeAmount: 50,
    overageMaxAllowedAmount: 500,
    features: [],
  }
}

export function isAttributeFeature(feature: CatalogFeature): boolean {
  return feature.featureAttributes.length > 0
}

export function isSimpleFeature(feature: CatalogFeature): boolean {
  return feature.parentFeatureId !== null && feature.featureAttributes.length === 0
}

export function buildRequiredAttributeFeatures(
  catalog: CatalogFeature[],
  configs: Record<string, AttributeConfig> = {},
): PlanFeature[] {
  const requiredFeatures: PlanFeature[] = []

  for (const code of REQUIRED_ATTRIBUTE_CODES) {
    const owner = catalog.find((feature) =>
      feature.featureAttributes.some((attr) => attr.attributeCode === code),
    )
    const attribute = owner?.featureAttributes.find((attr) => attr.attributeCode === code)

    if (!owner || !attribute) {
      continue
    }

    let planFeature = requiredFeatures.find((item) => item.featureId === owner.id)
    if (!planFeature) {
      planFeature = {
        featureId: owner.id,
        featureType: FeatureType.ATTRIBUTE,
        attributes: [],
      }
      requiredFeatures.push(planFeature)
    }

    planFeature.attributes!.push({
      featureAttributeId: attribute.id,
      linkToMonthlyOrderVolume: false,
      attributeConfig: sanitizeAttributeConfig(
        configs[attribute.id] ?? defaultAttributeConfig(code),
      ),
    })
  }

  return requiredFeatures
}

export function buildSimplePlanFeature(featureId: string): PlanFeature {
  return {
    featureId,
    featureType: FeatureType.SIMPLE,
    featureConfig: defaultFeatureConfig(),
  }
}

export function buildAttributePlanFeature(
  feature: CatalogFeature,
  selectedAttributeIds: string[],
  attributeConfigs: Record<string, AttributeConfig>,
  linkFlags: Record<string, boolean>,
): PlanFeature {
  const attributes: PlanFeatureAttribute[] = selectedAttributeIds.map((attributeId) => {
    const attribute = feature.featureAttributes.find((item) => item.id === attributeId)
    const code = attribute?.attributeCode ?? ''
    return {
      featureAttributeId: attributeId,
      linkToMonthlyOrderVolume: linkFlags[attributeId] ?? false,
      attributeConfig: sanitizeAttributeConfig(
        attributeConfigs[attributeId] ?? defaultAttributeConfig(code),
      ),
    }
  })

  return {
    featureId: feature.id,
    featureType: FeatureType.ATTRIBUTE,
    attributes,
  }
}

export function mergePlanFeatures(features: PlanFeature[]): PlanFeature[] {
  const merged = new Map<string, PlanFeature>()

  for (const feature of features) {
    const existing = merged.get(feature.featureId)
    if (!existing) {
      merged.set(feature.featureId, structuredClone(feature))
      continue
    }

    if (feature.featureType === FeatureType.ATTRIBUTE && existing.featureType === FeatureType.ATTRIBUTE) {
      const attributeIds = new Set((existing.attributes ?? []).map((item) => item.featureAttributeId))
      for (const attribute of feature.attributes ?? []) {
        if (!attributeIds.has(attribute.featureAttributeId)) {
          existing.attributes!.push(attribute)
        }
      }
    }
  }

  return [...merged.values()]
}

export function sanitizeCreatePlanPayload(payload: CreatePlanPayload): CreatePlanPayload {
  const sanitized: CreatePlanPayload = {
    ...payload,
    features: payload.features.map((feature) => {
      if (feature.featureType !== FeatureType.ATTRIBUTE || !feature.attributes) {
        return feature
      }

      return {
        ...feature,
        attributes: feature.attributes.map((attribute) => ({
          ...attribute,
          attributeConfig: sanitizeAttributeConfig(attribute.attributeConfig),
        })),
      }
    }),
  }

  if (sanitized.isTrialPeriodEnabled) {
    sanitized.trialPeriod = Math.max(1, sanitized.trialPeriod ?? 14)
  } else {
    delete sanitized.trialPeriod
  }

  if (sanitized.isGracePeriodEnabled) {
    sanitized.gracePeriod = Math.max(1, sanitized.gracePeriod ?? 15)
  } else {
    delete sanitized.gracePeriod
  }

  return sanitized
}
