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

export const DEFAULT_VOLUME_PRICE_TIERS = [
  { count: 20, monthlyPrice: 40, yearlyPrice: 400 },
  { count: 50, monthlyPrice: 90, yearlyPrice: 900 },
] as const

export const DEFAULT_MONTHLY_ORDER_VOLUME_TIERS = [
  { count: 100, monthlyPrice: 29, yearlyPrice: 290 },
  { count: 250, monthlyPrice: 59, yearlyPrice: 590 },
  { count: 500, monthlyPrice: 99, yearlyPrice: 990 },
  { count: 1000, monthlyPrice: 149, yearlyPrice: 1490 },
  { count: 2500, monthlyPrice: 249, yearlyPrice: 2490 },
  { count: 5000, monthlyPrice: 399, yearlyPrice: 3990 },
  { count: 10000, monthlyPrice: 599, yearlyPrice: 5990 },
] as const

export function defaultVolumePriceTiers(attributeCode?: string) {
  return attributeCode === 'MONTHLY_ORDER_VOLUME'
    ? [...DEFAULT_MONTHLY_ORDER_VOLUME_TIERS]
    : [...DEFAULT_VOLUME_PRICE_TIERS]
}

export function randomInt(min: number, max: number): number {
  if (max <= min) return min
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Random min/max for PER_COUNT attributes; optional tier widens the range (default mid-tier). */
export function randomCountLimits(
  attributeCode: string,
  tier = 3,
  scale = 1,
): { minLimit: number; maxLimit: number } {
  const tierFactor = 1 + (tier - 1) * 0.35

  const ranges: Record<string, { minLo: number; minHi: number; maxLo: number; maxHi: number }> = {
    NUM_USERS: { minLo: 2, minHi: 8, maxLo: 12, maxHi: 55 },
    ECOM_CHANNELS: { minLo: 1, minHi: 4, maxLo: 4, maxHi: 18 },
    FULFILLMENT_STATIONS: { minLo: 1, minHi: 5, maxLo: 6, maxHi: 24 },
    SHIPPING_CARRIERS: { minLo: 1, minHi: 3, maxLo: 3, maxHi: 12 },
    PACKING_BOXES: { minLo: 2, minHi: 8, maxLo: 10, maxHi: 40 },
    NUM_WAREHOUSES: { minLo: 1, minHi: 3, maxLo: 2, maxHi: 10 },
    SHIPPING_MAPPING_RULES: { minLo: 1, minHi: 6, maxLo: 8, maxHi: 30 },
    ORDER_SPLITTING_RULES: { minLo: 1, minHi: 5, maxLo: 5, maxHi: 20 },
    MONTHLY_ORDER_VOLUME: { minLo: 50, minHi: 200, maxLo: 500, maxHi: 5000 },
  }

  const range = ranges[attributeCode] ?? { minLo: 1, minHi: 6, maxLo: 5, maxHi: 25 }
  const minLimit = randomInt(
    Math.max(1, Math.round(range.minLo * scale)),
    Math.max(1, Math.round(range.minHi * tierFactor * scale)),
  )
  const maxLimit = randomInt(
    Math.max(minLimit + 1, Math.round(range.maxLo * tierFactor * scale)),
    Math.max(minLimit + 2, Math.round(range.maxHi * tierFactor * scale)),
  )

  return { minLimit, maxLimit }
}

function defaultPerCountLimits(attributeCode: string): { minLimit: number; maxLimit: number } {
  return randomCountLimits(attributeCode)
}

export function isRequiredAttributeCode(attributeCode: string): boolean {
  return REQUIRED_ATTRIBUTE_CODES.includes(
    attributeCode as (typeof REQUIRED_ATTRIBUTE_CODES)[number],
  )
}

export function getOptionalFeatureAttributes(feature: CatalogFeature) {
  return feature.featureAttributes.filter(
    (attribute) => !isRequiredAttributeCode(attribute.attributeCode),
  )
}

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
  priceType?: 'PER_COUNT' | 'VOLUME_PRICE',
): AttributeConfig {
  const resolvedPriceType =
    priceType ??
    (attributeCode === 'MONTHLY_ORDER_VOLUME' ? PriceType.VOLUME_PRICE : PriceType.PER_COUNT)

  const base: AttributeConfig = {
    inclusionType: InclusionType.INCLUDED,
    priceType: resolvedPriceType,
    baseMonthlyPrice: 99.99,
    baseYearlyPrice: 999.99,
    isProrated: false,
    isOverageEnabled: false,
    addonTrialEnabled: false,
    addonTrialPeriod: null,
  }

  if (resolvedPriceType === PriceType.VOLUME_PRICE) {
    return {
      ...base,
      volumePrice: defaultVolumePriceTiers(attributeCode),
      ...(attributeCode === 'MONTHLY_ORDER_VOLUME'
        ? { isOverageEnabled: true, overagePricePerUnit: 0.25 }
        : {}),
    }
  }

  if (attributeCode === 'NUM_USERS') {
    const limits = defaultPerCountLimits(attributeCode)
    return {
      ...base,
      minLimit: limits.minLimit,
      maxLimit: limits.maxLimit,
      pricePerUnitMonthly: 5,
      pricePerUnitYearly: 50,
    }
  }

  if (attributeCode === 'MONTHLY_ORDER_VOLUME') {
    const limits = defaultPerCountLimits(attributeCode)
    return {
      ...base,
      minLimit: limits.minLimit,
      maxLimit: limits.maxLimit,
      pricePerUnitMonthly: 0,
      pricePerUnitYearly: 0,
      isOverageEnabled: true,
      overagePricePerUnit: 0.25,
    }
  }

  const limits = defaultPerCountLimits(attributeCode)
  return {
    ...base,
    minLimit: limits.minLimit,
    maxLimit: limits.maxLimit,
    pricePerUnitMonthly: 2,
    pricePerUnitYearly: 20,
  }
}

function finalizeVolumePriceConfig(
  config: AttributeConfig,
  attributeCode = '',
): AttributeConfig {
  const {
    minLimit: _min,
    maxLimit: _max,
    pricePerUnitMonthly: _pm,
    pricePerUnitYearly: _py,
    ...rest
  } = {
    ...config,
    priceType: PriceType.VOLUME_PRICE,
    volumePrice: config.volumePrice?.length
      ? config.volumePrice
      : defaultVolumePriceTiers(attributeCode),
  }

  if (!rest.isOverageEnabled) {
    const { overagePricePerUnit: _op, ...withoutOverage } = rest
    return withoutOverage as AttributeConfig
  }

  return {
    ...rest,
    overagePricePerUnit:
      rest.overagePricePerUnit ??
      (attributeCode === 'MONTHLY_ORDER_VOLUME' ? 0.25 : 0),
  } as AttributeConfig
}

function finalizePerCountConfig(config: AttributeConfig): AttributeConfig {
  const { volumePrice: _volumePrice, ...perCountConfig } = config

  if (!perCountConfig.isOverageEnabled) {
    const { overagePricePerUnit: _op, ...withoutOverage } = perCountConfig
    return withoutOverage as AttributeConfig
  }

  return perCountConfig as AttributeConfig
}

export function applyPriceTypeChange(
  config: AttributeConfig,
  priceType: AttributeConfig['priceType'],
  attributeCode?: string,
): AttributeConfig {
  if (priceType === PriceType.VOLUME_PRICE) {
    return finalizeVolumePriceConfig(
      {
        inclusionType: config.inclusionType,
        priceType,
        baseMonthlyPrice: config.baseMonthlyPrice ?? 99.99,
        baseYearlyPrice: config.baseYearlyPrice ?? 999.99,
        volumePrice: config.volumePrice,
        isProrated: config.isProrated,
        isOverageEnabled: config.isOverageEnabled,
        overagePricePerUnit: config.overagePricePerUnit,
        addonTrialEnabled: config.addonTrialEnabled,
        addonTrialPeriod: config.addonTrialPeriod,
      },
      attributeCode,
    )
  }

  const limits = randomCountLimits(attributeCode ?? '')
  return finalizePerCountConfig({
    inclusionType: config.inclusionType,
    priceType,
    baseMonthlyPrice: config.baseMonthlyPrice ?? 99.99,
    baseYearlyPrice: config.baseYearlyPrice ?? 999.99,
    minLimit: config.minLimit ?? limits.minLimit,
    maxLimit: config.maxLimit ?? limits.maxLimit,
    pricePerUnitMonthly: config.pricePerUnitMonthly ?? 2,
    pricePerUnitYearly: config.pricePerUnitYearly ?? 20,
    isProrated: config.isProrated,
    isOverageEnabled: config.isOverageEnabled,
    overagePricePerUnit: config.overagePricePerUnit,
    addonTrialEnabled: config.addonTrialEnabled,
    addonTrialPeriod: config.addonTrialPeriod,
  })
}

export function sanitizeAttributeConfig(
  config: AttributeConfig,
  linkToMonthlyOrderVolume = false,
): AttributeConfig {
  const base = {
    inclusionType: config.inclusionType,
    priceType: linkToMonthlyOrderVolume ? PriceType.PER_COUNT : config.priceType,
    baseMonthlyPrice: config.baseMonthlyPrice ?? 0,
    baseYearlyPrice: config.baseYearlyPrice ?? 0,
    isProrated: config.isProrated,
    isOverageEnabled: config.isOverageEnabled,
    addonTrialEnabled: config.addonTrialEnabled,
  }

  if (linkToMonthlyOrderVolume) {
    return {
      ...base,
      priceType: PriceType.PER_COUNT,
      pricePerUnitMonthly: config.pricePerUnitMonthly ?? 0,
      pricePerUnitYearly: config.pricePerUnitYearly ?? 0,
      ...(config.isOverageEnabled
        ? { overagePricePerUnit: config.overagePricePerUnit ?? 0 }
        : {}),
      ...(config.addonTrialEnabled
        ? { addonTrialPeriod: config.addonTrialPeriod ?? 14 }
        : {}),
    }
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
    return applyPriceTypeChange(previous, patch.priceType, attributeCode)
  }

  const merged = { ...previous, ...patch }

  if (merged.priceType === PriceType.VOLUME_PRICE) {
    return finalizeVolumePriceConfig(merged, attributeCode)
  }

  return finalizePerCountConfig(merged)
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
      attributeConfig: sanitizeAttributeConfig({
        ...(configs[attribute.id] ?? defaultAttributeConfig(code)),
        inclusionType: InclusionType.INCLUDED,
        addonTrialEnabled: false,
        addonTrialPeriod: null,
      }),
    })
  }

  return requiredFeatures
}

export function sanitizeFeatureConfig(config: FeatureConfig): FeatureConfig {
  const sanitized: FeatureConfig = {
    planFeaturePriceMonthly: config.planFeaturePriceMonthly,
    planFeaturePriceYearly: config.planFeaturePriceYearly,
    inclusionType: config.inclusionType,
    isProrated: config.isProrated,
    addonTrialEnabled: config.addonTrialEnabled,
  }

  if (config.inclusionType === InclusionType.ADDON && config.addonTrialEnabled) {
    sanitized.addonTrialPeriod = config.addonTrialPeriod ?? 14
  }

  return sanitized
}

export function mergeFeatureConfigUpdate(
  current: FeatureConfig | undefined,
  patch: Partial<FeatureConfig>,
): FeatureConfig {
  const previous = current ?? defaultFeatureConfig()
  const merged = { ...previous, ...patch }

  if (merged.inclusionType !== InclusionType.ADDON) {
    merged.addonTrialEnabled = false
    merged.addonTrialPeriod = null
  } else if (!merged.addonTrialEnabled) {
    merged.addonTrialPeriod = null
  }

  return merged
}

export function buildSimplePlanFeature(
  featureId: string,
  config: FeatureConfig = defaultFeatureConfig(),
): PlanFeature {
  return {
    featureId,
    featureType: FeatureType.SIMPLE,
    featureConfig: sanitizeFeatureConfig(config),
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
        linkFlags[attributeId] ?? false,
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
      if (feature.featureType === FeatureType.SIMPLE && feature.featureConfig) {
        return {
          ...feature,
          featureConfig: sanitizeFeatureConfig(feature.featureConfig),
        }
      }

      if (feature.featureType !== FeatureType.ATTRIBUTE || !feature.attributes) {
        return feature
      }

      return {
        ...feature,
        attributes: feature.attributes.map((attribute) => ({
          ...attribute,
          attributeConfig: sanitizeAttributeConfig(
            attribute.attributeConfig,
            attribute.linkToMonthlyOrderVolume ?? false,
          ),
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

export function buildCreatePlanPayload(
  form: CreatePlanPayload,
  catalog: CatalogFeature[],
  requiredAttributeConfigs: Record<string, AttributeConfig>,
  selectedAttributeFeatures: Record<
    string,
    {
      featureId: string
      attributeIds: string[]
      configs: Record<string, AttributeConfig>
      linkFlags: Record<string, boolean>
    }
  >,
  selectedSimpleFeatures: Record<string, FeatureConfig>,
): CreatePlanPayload {
  const required = buildRequiredAttributeFeatures(catalog, requiredAttributeConfigs)
  const optional = Object.values(selectedAttributeFeatures)
    .map((entry) => {
      const feature = catalog.find((item) => item.id === entry.featureId)
      if (!feature) return null
      return buildAttributePlanFeature(
        feature,
        entry.attributeIds,
        entry.configs,
        entry.linkFlags,
      )
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  const simple = Object.entries(selectedSimpleFeatures).map(([featureId, config]) =>
    buildSimplePlanFeature(featureId, config),
  )
  const features = mergePlanFeatures([...required, ...optional, ...simple])

  return sanitizeCreatePlanPayload({ ...form, features })
}
