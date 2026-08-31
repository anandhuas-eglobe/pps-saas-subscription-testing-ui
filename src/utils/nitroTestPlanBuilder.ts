import type {
  AttributeConfig,
  CatalogFeature,
  CreatePlanPayload,
  FeatureAttributeRow,
  FeatureConfig,
} from '../types/subscription'
import { FeatureType, InclusionType, PlanType, PriceType } from '../types/subscription'
import {
  buildCreatePlanPayload,
  defaultAttributeConfig,
  defaultFeatureConfig,
  getOptionalFeatureAttributes,
  isSimpleFeature,
} from './planDefaults'

export interface NitroPlanTier {
  level: number
  label: string
  buttonLabel: string
  description: string
  accent: 'default' | 'primary' | 'secondary' | 'success' | 'warning'
}

export const NITRO_DEFAULT_TRIAL_DAYS = 14

export const NITRO_PLAN_TIERS: NitroPlanTier[] = [
  {
    level: 1,
    label: 'Nitro Starter',
    buttonLabel: 'Create Starter',
    description: 'Required attrs · 2 optional attrs · 1 simple INCLUDED feature',
    accent: 'default',
  },
  {
    level: 2,
    label: 'Nitro Growth',
    buttonLabel: 'Create Growth',
    description: 'Starter + ADDON attrs · barcode scanning add-on',
    accent: 'primary',
  },
  {
    level: 3,
    label: 'Nitro Business',
    buttonLabel: 'Create Business',
    description: 'Growth + warehouse attrs · box calc + chat support',
    accent: 'secondary',
  },
  {
    level: 4,
    label: 'Nitro Pro',
    buttonLabel: 'Create Pro',
    description: 'Business + volume-priced mapping · shipping report INCLUDED',
    accent: 'success',
  },
  {
    level: 5,
    label: 'Nitro Enterprise',
    buttonLabel: 'Create Enterprise',
    description: 'Full feature mix · phone support ADDON · highest limits & pricing',
    accent: 'warning',
  },
]

type CatalogAttributeRef = {
  feature: CatalogFeature
  attribute: FeatureAttributeRow
}

function findAttributeByCode(
  catalog: CatalogFeature[],
  attributeCode: string,
): CatalogAttributeRef | null {
  for (const feature of catalog) {
    const attribute = feature.featureAttributes.find((item) => item.attributeCode === attributeCode)
    if (attribute) {
      return { feature, attribute }
    }
  }
  return null
}

function findSimpleFeatureByCode(catalog: CatalogFeature[], code: string): CatalogFeature | null {
  return catalog.find((item) => isSimpleFeature(item) && item.code === code) ?? null
}

function scaleVolumeTiers(
  tier: number,
  tiers: Array<{ count: number; monthlyPrice: number; yearlyPrice: number }>,
) {
  return tiers.map((row) => ({
    count: row.count * tier,
    monthlyPrice: Math.round(row.monthlyPrice * tier * 10) / 10,
    yearlyPrice: Math.round(row.yearlyPrice * tier * 10) / 10,
  }))
}

/** Deterministic PER_COUNT limits that always increase with Nitro tier (avoids false downgrades on upgrade). */
function perCountLimitsForNitroTier(
  attributeCode: string,
  tier: number,
  scale = 1,
): { minLimit: number; maxLimit: number } {
  const profiles: Record<
    string,
    { minBase: number; minStep: number; maxBase: number; maxStep: number }
  > = {
    NUM_USERS: { minBase: 2, minStep: 2, maxBase: 10, maxStep: 15 },
    ECOM_CHANNELS: { minBase: 1, minStep: 2, maxBase: 6, maxStep: 12 },
    FULFILLMENT_STATIONS: { minBase: 1, minStep: 2, maxBase: 8, maxStep: 14 },
    SHIPPING_CARRIERS: { minBase: 1, minStep: 2, maxBase: 5, maxStep: 10 },
    PACKING_BOXES: { minBase: 2, minStep: 2, maxBase: 10, maxStep: 15 },
    NUM_WAREHOUSES: { minBase: 1, minStep: 1, maxBase: 4, maxStep: 8 },
    SHIPPING_MAPPING_RULES: { minBase: 1, minStep: 2, maxBase: 8, maxStep: 14 },
    ORDER_SPLITTING_RULES: { minBase: 1, minStep: 2, maxBase: 6, maxStep: 12 },
  }

  const profile = profiles[attributeCode] ?? { minBase: 1, minStep: 2, maxBase: 6, maxStep: 12 }
  const minLimit = Math.max(1, Math.round((profile.minBase + (tier - 1) * profile.minStep) * scale))
  const maxLimit = Math.max(
    minLimit + 1,
    Math.round((profile.maxBase + tier * profile.maxStep) * scale),
  )

  return { minLimit, maxLimit }
}

function overageForAttribute(
  attribute: FeatureAttributeRow,
  enabled: boolean,
  overagePricePerUnit?: number,
): Pick<AttributeConfig, 'isOverageEnabled' | 'overagePricePerUnit'> {
  if (!attribute.isMonthlyLimit || !enabled) {
    return { isOverageEnabled: false }
  }

  return {
    isOverageEnabled: true,
    overagePricePerUnit: overagePricePerUnit ?? 0,
  }
}

function buildRequiredConfigs(catalog: CatalogFeature[], tier: number): Record<string, AttributeConfig> {
  const configs: Record<string, AttributeConfig> = {}

  const users = findAttributeByCode(catalog, 'NUM_USERS')
  if (users) {
    const userLimits = perCountLimitsForNitroTier('NUM_USERS', tier)
    configs[users.attribute.id] = {
      ...defaultAttributeConfig('NUM_USERS', PriceType.PER_COUNT),
      inclusionType: InclusionType.INCLUDED,
      minLimit: userLimits.minLimit,
      maxLimit: userLimits.maxLimit,
      pricePerUnitMonthly: 2 + tier * 2,
      pricePerUnitYearly: 20 + tier * 20,
      ...overageForAttribute(users.attribute, tier >= 3, 1 + tier * 0.5),
      isProrated: tier >= 2,
      addonTrialEnabled: false,
      addonTrialPeriod: null,
    }
  }

  const orderVolume = findAttributeByCode(catalog, 'MONTHLY_ORDER_VOLUME')
  if (orderVolume) {
    configs[orderVolume.attribute.id] = {
      ...defaultAttributeConfig('MONTHLY_ORDER_VOLUME', PriceType.VOLUME_PRICE),
      inclusionType: InclusionType.INCLUDED,
      priceType: PriceType.VOLUME_PRICE,
      baseMonthlyPrice: 40 + tier * 25,
      baseYearlyPrice: 400 + tier * 250,
      volumePrice: scaleVolumeTiers(tier, [
        { count: 100, monthlyPrice: 30, yearlyPrice: 300 },
        { count: 500, monthlyPrice: 90, yearlyPrice: 900 },
        { count: 1000, monthlyPrice: 150, yearlyPrice: 1500 },
        { count: 2500, monthlyPrice: 280, yearlyPrice: 2800 },
      ]),
      ...overageForAttribute(orderVolume.attribute, true, 0.1 + tier * 0.05),
      isProrated: true,
      addonTrialEnabled: false,
      addonTrialPeriod: null,
    }
  }

  return configs
}

type OptionalAttributeSpec = {
  attributeCode: string
  inclusionType: InclusionTypeValue
  priceType: PriceTypeValue
  linkToMonthlyOrderVolume?: boolean
  addonTrial?: boolean
  scale?: number
}

type InclusionTypeValue = (typeof InclusionType)[keyof typeof InclusionType]
type PriceTypeValue = (typeof PriceType)[keyof typeof PriceType]

function buildOptionalAttributeConfig(
  attribute: FeatureAttributeRow,
  spec: OptionalAttributeSpec,
  tier: number,
): AttributeConfig {
  const priceType = spec.priceType
  const scale = spec.scale ?? 1

  if (spec.linkToMonthlyOrderVolume) {
    return {
      inclusionType: spec.inclusionType,
      priceType: PriceType.PER_COUNT,
      baseMonthlyPrice: 0,
      baseYearlyPrice: 0,
      pricePerUnitMonthly: (0.05 + tier * 0.02) * scale,
      pricePerUnitYearly: (0.5 + tier * 0.2) * scale,
      isProrated: spec.inclusionType === InclusionType.ADDON,
      ...overageForAttribute(attribute, tier >= 4, 0.02 + tier * 0.01),
      addonTrialEnabled: spec.addonTrial ?? false,
      addonTrialPeriod: spec.addonTrial ? 7 + tier * 2 : null,
    }
  }

  if (priceType === PriceType.VOLUME_PRICE) {
    return {
      inclusionType: spec.inclusionType,
      priceType,
      baseMonthlyPrice: (25 + tier * 15) * scale,
      baseYearlyPrice: (250 + tier * 150) * scale,
      volumePrice: scaleVolumeTiers(tier, [
        { count: 50, monthlyPrice: 20, yearlyPrice: 200 },
        { count: 200, monthlyPrice: 55, yearlyPrice: 550 },
        { count: 500, monthlyPrice: 110, yearlyPrice: 1100 },
      ]),
      isProrated: spec.inclusionType === InclusionType.ADDON,
      ...overageForAttribute(attribute, true, 0.08 + tier * 0.02),
      addonTrialEnabled: spec.addonTrial ?? false,
      addonTrialPeriod: spec.addonTrial ? 7 + tier * 2 : null,
    }
  }

  const base = defaultAttributeConfig(spec.attributeCode, PriceType.PER_COUNT)
  const countLimits = perCountLimitsForNitroTier(spec.attributeCode, tier, scale)
  return {
    ...base,
    inclusionType: spec.inclusionType,
    priceType: PriceType.PER_COUNT,
    minLimit: countLimits.minLimit,
    maxLimit: countLimits.maxLimit,
    pricePerUnitMonthly: (1.5 + tier) * scale,
    pricePerUnitYearly: (15 + tier * 10) * scale,
    isProrated: spec.inclusionType === InclusionType.ADDON,
    ...overageForAttribute(attribute, tier >= 4, 0.5 + tier * 0.25),
    addonTrialEnabled: spec.addonTrial ?? false,
    addonTrialPeriod: spec.addonTrial ? 7 + tier * 2 : null,
  }
}

function optionalSpecsForTier(tier: number): OptionalAttributeSpec[] {
  const specs: OptionalAttributeSpec[] = [
    {
      attributeCode: 'ECOM_CHANNELS',
      inclusionType: InclusionType.INCLUDED,
      priceType: PriceType.PER_COUNT,
    },
    {
      attributeCode: 'FULFILLMENT_STATIONS',
      inclusionType: InclusionType.INCLUDED,
      priceType: PriceType.PER_COUNT,
      scale: 1.2,
    },
  ]

  if (tier >= 2) {
    specs.push({
      attributeCode: 'SHIPPING_CARRIERS',
      inclusionType: InclusionType.ADDON,
      priceType: PriceType.PER_COUNT,
      addonTrial: true,
    })
  }

  if (tier >= 3) {
    specs.push(
      {
        attributeCode: 'PACKING_BOXES',
        inclusionType: InclusionType.ADDON,
        priceType: PriceType.PER_COUNT,
        addonTrial: true,
      },
      {
        attributeCode: 'NUM_WAREHOUSES',
        inclusionType: InclusionType.ADDON,
        priceType: PriceType.PER_COUNT,
      },
    )
  }

  if (tier >= 4) {
    specs.push({
      attributeCode: 'SHIPPING_MAPPING_RULES',
      inclusionType: InclusionType.INCLUDED,
      priceType: PriceType.PER_COUNT,
    })
    specs.push({
      attributeCode: 'SHIPPING_MAPPING_ORDER_VOLUME',
      inclusionType: InclusionType.ADDON,
      priceType: PriceType.PER_COUNT,
      linkToMonthlyOrderVolume: true,
    })
  }

  if (tier >= 5) {
    specs.push(
      {
        attributeCode: 'SMART_PACK_ORDER_VOLUME',
        inclusionType: InclusionType.ADDON,
        priceType: PriceType.PER_COUNT,
        linkToMonthlyOrderVolume: true,
      },
      {
        attributeCode: 'ORDER_SPLITTING_RULES',
        inclusionType: InclusionType.ADDON,
        priceType: PriceType.PER_COUNT,
      },
    )
  }

  return specs
}

type SelectedAttributeFeaturesMap = Record<
  string,
  {
    featureId: string
    attributeIds: string[]
    configs: Record<string, AttributeConfig>
    linkFlags: Record<string, boolean>
  }
>

function buildOptionalAttributeFeatures(
  catalog: CatalogFeature[],
  tier: number,
): SelectedAttributeFeaturesMap {
  const selected: SelectedAttributeFeaturesMap = {}

  for (const spec of optionalSpecsForTier(tier)) {
    const ref = findAttributeByCode(catalog, spec.attributeCode)
    if (!ref) continue

    const { feature, attribute } = ref
    const optionalOnFeature = getOptionalFeatureAttributes(feature)
    if (!optionalOnFeature.some((item) => item.id === attribute.id)) {
      continue
    }

    const entry = selected[feature.id] ?? {
      featureId: feature.id,
      attributeIds: [],
      configs: {},
      linkFlags: {},
    }

    entry.attributeIds.push(attribute.id)
    entry.configs[attribute.id] = buildOptionalAttributeConfig(attribute, spec, tier)
    entry.linkFlags[attribute.id] = spec.linkToMonthlyOrderVolume ?? false
    selected[feature.id] = entry
  }

  return selected
}

type SimpleFeatureSpec = {
  code: string
  inclusionType: InclusionTypeValue
  monthlyPrice: number
  yearlyPrice: number
  addonTrial?: boolean
}

function simpleSpecsForTier(tier: number): SimpleFeatureSpec[] {
  const specs: SimpleFeatureSpec[] = [
    {
      code: 'RETURN_LABELS',
      inclusionType: InclusionType.INCLUDED,
      monthlyPrice: 5 + tier * 3,
      yearlyPrice: 50 + tier * 30,
    },
  ]

  if (tier >= 2) {
    specs.push({
      code: 'BARCODE_SCANNING',
      inclusionType: InclusionType.ADDON,
      monthlyPrice: 12 + tier * 4,
      yearlyPrice: 120 + tier * 40,
      addonTrial: true,
    })
  }

  if (tier >= 3) {
    specs.push(
      {
        code: 'BOX_CALCULATION',
        inclusionType: InclusionType.ADDON,
        monthlyPrice: 18 + tier * 6,
        yearlyPrice: 180 + tier * 60,
        addonTrial: true,
      },
      {
        code: 'CHAT_SUPPORT',
        inclusionType: InclusionType.INCLUDED,
        monthlyPrice: 8 + tier * 2,
        yearlyPrice: 80 + tier * 20,
      },
    )
  }

  if (tier >= 4) {
    specs.push({
      code: 'SHIPPING_REPORT',
      inclusionType: InclusionType.INCLUDED,
      monthlyPrice: 10 + tier * 3,
      yearlyPrice: 100 + tier * 30,
    })
  }

  if (tier >= 5) {
    specs.push({
      code: 'PHONE_SUPPORT',
      inclusionType: InclusionType.ADDON,
      monthlyPrice: 25 + tier * 8,
      yearlyPrice: 250 + tier * 80,
      addonTrial: false,
    })
    specs.push({
      code: 'EXCEPTION_REPORT',
      inclusionType: InclusionType.ADDON,
      monthlyPrice: 15 + tier * 5,
      yearlyPrice: 150 + tier * 50,
      addonTrial: true,
    })
  }

  return specs
}

function buildSimpleFeatureMap(catalog: CatalogFeature[], tier: number): Record<string, FeatureConfig> {
  const selected: Record<string, FeatureConfig> = {}

  for (const spec of simpleSpecsForTier(tier)) {
    const feature = findSimpleFeatureByCode(catalog, spec.code)
    if (!feature) continue

    selected[feature.id] = {
      ...defaultFeatureConfig(spec.inclusionType),
      planFeaturePriceMonthly: spec.monthlyPrice,
      planFeaturePriceYearly: spec.yearlyPrice,
      inclusionType: spec.inclusionType,
      isProrated: spec.inclusionType === InclusionType.ADDON,
      addonTrialEnabled: spec.addonTrial ?? false,
      addonTrialPeriod: spec.addonTrial ? 7 + tier * 2 : null,
    }
  }

  return selected
}

export function buildNitroTestPlanPayload(
  catalog: CatalogFeature[],
  tier: NitroPlanTier,
  options?: { uniqueSuffix?: string; trialEnabled?: boolean },
): CreatePlanPayload {
  const suffix = options?.uniqueSuffix ?? String(Date.now()).slice(-6)
  const level = tier.level
  const trialEnabled = options?.trialEnabled ?? false

  const form: CreatePlanPayload = {
    planName: `${tier.label} ${suffix}`,
    planDescription: `Nitro Test tier ${level} — auto-generated plan with required attributes, addons, simple & attribute features.`,
    planType: PlanType.PUBLIC,
    baseMonthlyPrice: 49 + level * 75,
    baseYearlyPrice: 490 + level * 750,
    baseCurrency: 'USD',
    isTrialPeriodEnabled: trialEnabled,
    trialPeriod: trialEnabled ? NITRO_DEFAULT_TRIAL_DAYS : null,
    isGracePeriodEnabled: level >= 3,
    gracePeriod: level >= 3 ? 10 + level : null,
    overageAutoChargeAmount: 25 + level * 25,
    overageMaxAllowedAmount: 200 + level * 300,
    features: [],
  }

  const requiredAttributeConfigs = buildRequiredConfigs(catalog, level)
  const selectedAttributeFeatures = buildOptionalAttributeFeatures(catalog, level)
  const selectedSimpleFeatures = buildSimpleFeatureMap(catalog, level)

  return buildCreatePlanPayload(
    form,
    catalog,
    requiredAttributeConfigs,
    selectedAttributeFeatures,
    selectedSimpleFeatures,
  )
}

export function summarizeNitroPlanPayload(payload: CreatePlanPayload): {
  simpleCount: number
  attributeCount: number
  addonCount: number
  includedCount: number
  volumePriceCount: number
} {
  let simpleCount = 0
  let attributeCount = 0
  let addonCount = 0
  let includedCount = 0
  let volumePriceCount = 0

  for (const feature of payload.features) {
    if (feature.featureType === FeatureType.SIMPLE && feature.featureConfig) {
      simpleCount += 1
      if (feature.featureConfig.inclusionType === InclusionType.ADDON) {
        addonCount += 1
      } else {
        includedCount += 1
      }
      continue
    }

    if (feature.featureType === FeatureType.ATTRIBUTE && feature.attributes) {
      attributeCount += feature.attributes.length
      for (const attribute of feature.attributes) {
        if (attribute.attributeConfig.inclusionType === InclusionType.ADDON) {
          addonCount += 1
        } else {
          includedCount += 1
        }
        if (attribute.attributeConfig.priceType === PriceType.VOLUME_PRICE) {
          volumePriceCount += 1
        }
      }
    }
  }

  return { simpleCount, attributeCount, addonCount, includedCount, volumePriceCount }
}

/** Validates catalog has minimum data for nitro plan generation. */
export function validateNitroCatalog(catalog: CatalogFeature[]): string[] {
  const errors: string[] = []

  if (!findAttributeByCode(catalog, 'NUM_USERS')) {
    errors.push('NUM_USERS required attribute missing from catalog')
  }
  if (!findAttributeByCode(catalog, 'MONTHLY_ORDER_VOLUME')) {
    errors.push('MONTHLY_ORDER_VOLUME required attribute missing from catalog')
  }
  if (!findSimpleFeatureByCode(catalog, 'RETURN_LABELS')) {
    errors.push('RETURN_LABELS simple feature missing from catalog')
  }

  return errors
}
