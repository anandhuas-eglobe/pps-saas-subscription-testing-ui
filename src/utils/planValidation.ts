import type {
  ApiErrorItem,
  AttributeConfig,
  CatalogFeature,
  CreatePlanPayload,
  PlanFeature,
  PlanFeatureAttribute,
  VolumePriceTier,
} from '../types/subscription'
import { FeatureType, InclusionType, PriceType } from '../types/subscription'
import { REQUIRED_ATTRIBUTE_CODES } from './planDefaults'

function pushError(
  errors: ApiErrorItem[],
  message: string,
  field?: string,
  code?: string,
): void {
  errors.push({ message, field, code })
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value) && value >= 0
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value) && value > 0
}

function findCatalogAttribute(
  catalog: CatalogFeature[],
  attributeId: string,
): { feature: CatalogFeature; attributeCode: string; isMonthlyLimit: boolean } | null {
  for (const feature of catalog) {
    const attribute = feature.featureAttributes.find((item) => item.id === attributeId)
    if (attribute) {
      return {
        feature,
        attributeCode: attribute.attributeCode,
        isMonthlyLimit: attribute.isMonthlyLimit,
      }
    }
  }
  return null
}

function findCatalogAttributeByCode(catalog: CatalogFeature[], code: string) {
  for (const feature of catalog) {
    const attribute = feature.featureAttributes.find((item) => item.attributeCode === code)
    if (attribute) {
      return { feature, attribute }
    }
  }
  return null
}

function validateVolumeTiers(
  tiers: VolumePriceTier[] | null | undefined,
  fieldPrefix: string,
  errors: ApiErrorItem[],
): void {
  if (!tiers?.length) {
    pushError(
      errors,
      'volumePrice must contain at least one tier when priceType is VOLUME_PRICE',
      `${fieldPrefix}.attributeConfig.volumePrice`,
      'INVALID_ATTRIBUTE_VOLUME_PRICE',
    )
    return
  }

  tiers.forEach((tier, index) => {
    const tierField = `${fieldPrefix}.attributeConfig.volumePrice[${index}]`
    if (!isPositiveNumber(tier.count)) {
      pushError(errors, 'Tier count must be a positive number', `${tierField}.count`)
    }
    if (!isNonNegativeNumber(tier.monthlyPrice)) {
      pushError(errors, 'Tier monthlyPrice must be a non-negative number', `${tierField}.monthlyPrice`)
    }
    if (!isNonNegativeNumber(tier.yearlyPrice)) {
      pushError(errors, 'Tier yearlyPrice must be a non-negative number', `${tierField}.yearlyPrice`)
    }
  })
}

function validateAttributeConfig(
  attribute: PlanFeatureAttribute,
  fieldPrefix: string,
  catalog: CatalogFeature[],
  monthlyOrderVolumeAttributeId: string | null,
  errors: ApiErrorItem[],
): void {
  const catalogEntry = findCatalogAttribute(catalog, attribute.featureAttributeId)
  const config = attribute.attributeConfig
  const linked = attribute.linkToMonthlyOrderVolume === true

  if (linked && attribute.featureAttributeId === monthlyOrderVolumeAttributeId) {
    pushError(
      errors,
      'linkToMonthlyOrderVolume cannot reference the MONTHLY_ORDER_VOLUME attribute itself',
      `${fieldPrefix}.linkToMonthlyOrderVolume`,
    )
  }

  if (config.inclusionType !== InclusionType.ADDON) {
    if (config.addonTrialEnabled) {
      pushError(
        errors,
        'addonTrialEnabled is only allowed when inclusionType is ADDON',
        `${fieldPrefix}.attributeConfig.addonTrialEnabled`,
      )
    }
    if (config.addonTrialPeriod != null) {
      pushError(
        errors,
        'addonTrialPeriod must be omitted when inclusionType is not ADDON',
        `${fieldPrefix}.attributeConfig.addonTrialPeriod`,
      )
    }
  } else if (config.addonTrialEnabled && !isPositiveNumber(config.addonTrialPeriod ?? null)) {
    pushError(
      errors,
      'addonTrialPeriod must be a positive number when addonTrialEnabled is true',
      `${fieldPrefix}.attributeConfig.addonTrialPeriod`,
    )
  }

  if (linked) {
    if (config.minLimit != null || config.maxLimit != null) {
      pushError(
        errors,
        'When linkToMonthlyOrderVolume is true, minLimit and maxLimit must be omitted',
        `${fieldPrefix}.attributeConfig`,
      )
    }
    if (config.priceType !== PriceType.PER_COUNT) {
      pushError(
        errors,
        'When linkToMonthlyOrderVolume is true, priceType must be PER_COUNT',
        `${fieldPrefix}.attributeConfig.priceType`,
      )
    }
    if (config.volumePrice != null && config.volumePrice.length > 0) {
      pushError(
        errors,
        'When linkToMonthlyOrderVolume is true, volumePrice must be omitted or empty',
        `${fieldPrefix}.attributeConfig.volumePrice`,
      )
    }
  }

  if (config.priceType === PriceType.PER_COUNT) {
    if (!isNonNegativeNumber(config.pricePerUnitMonthly)) {
      pushError(
        errors,
        'pricePerUnitMonthly is required when priceType is PER_COUNT',
        `${fieldPrefix}.attributeConfig.pricePerUnitMonthly`,
      )
    }
    if (!isNonNegativeNumber(config.pricePerUnitYearly)) {
      pushError(
        errors,
        'pricePerUnitYearly is required when priceType is PER_COUNT',
        `${fieldPrefix}.attributeConfig.pricePerUnitYearly`,
      )
    }
    if (config.volumePrice != null && config.volumePrice.length > 0) {
      pushError(
        errors,
        'volumePrice must be omitted or empty when priceType is PER_COUNT',
        `${fieldPrefix}.attributeConfig.volumePrice`,
      )
    }
  }

  if (config.priceType === PriceType.VOLUME_PRICE) {
    if (
      config.minLimit != null ||
      config.maxLimit != null ||
      config.pricePerUnitMonthly != null ||
      config.pricePerUnitYearly != null
    ) {
      pushError(
        errors,
        'When priceType is VOLUME_PRICE, omit minLimit, maxLimit, pricePerUnitMonthly, and pricePerUnitYearly',
        `${fieldPrefix}.attributeConfig`,
      )
    }
    validateVolumeTiers(config.volumePrice, fieldPrefix, errors)
  }

  if (config.isOverageEnabled) {
    if (!isNonNegativeNumber(config.overagePricePerUnit)) {
      pushError(
        errors,
        'overagePricePerUnit is required when isOverageEnabled is true',
        `${fieldPrefix}.attributeConfig.overagePricePerUnit`,
      )
    }
    if (catalogEntry && !catalogEntry.isMonthlyLimit) {
      pushError(
        errors,
        `Overage cannot be enabled for ${catalogEntry.attributeCode} because it is not a monthly-limit attribute`,
        `${fieldPrefix}.attributeConfig.isOverageEnabled`,
      )
    }
  }

  if (
    catalogEntry &&
    REQUIRED_ATTRIBUTE_CODES.includes(
      catalogEntry.attributeCode as (typeof REQUIRED_ATTRIBUTE_CODES)[number],
    ) &&
    config.inclusionType !== InclusionType.INCLUDED
  ) {
    pushError(
      errors,
      `${catalogEntry.attributeCode} must have inclusionType INCLUDED`,
      `${fieldPrefix}.attributeConfig.inclusionType`,
    )
  }
}

function validatePlanFeature(
  feature: PlanFeature,
  featureIndex: number,
  catalog: CatalogFeature[],
  monthlyOrderVolumeAttributeId: string | null,
  errors: ApiErrorItem[],
): void {
  const fieldPrefix = `features.${featureIndex}`

  if (feature.featureType === FeatureType.SIMPLE) {
    if (!feature.featureConfig) {
      pushError(errors, 'featureConfig is required for SIMPLE features', `${fieldPrefix}.featureConfig`)
    } else {
      const config = feature.featureConfig
      if (config.inclusionType !== InclusionType.ADDON) {
        if (config.addonTrialEnabled) {
          pushError(
            errors,
            'addonTrialEnabled is only allowed when inclusionType is ADDON',
            `${fieldPrefix}.featureConfig.addonTrialEnabled`,
          )
        }
      } else if (config.addonTrialEnabled && !isPositiveNumber(config.addonTrialPeriod ?? null)) {
        pushError(
          errors,
          'addonTrialPeriod must be a positive number when addonTrialEnabled is true',
          `${fieldPrefix}.featureConfig.addonTrialPeriod`,
        )
      }
    }
    if (feature.attributes != null && feature.attributes.length > 0) {
      pushError(
        errors,
        'SIMPLE features must not include attributes',
        `${fieldPrefix}.attributes`,
        'INVALID_PLAN_FEATURE_TYPE_CONSISTENCY',
      )
    }
    return
  }

  if (feature.featureType === FeatureType.ATTRIBUTE) {
    if (feature.featureConfig != null) {
      pushError(
        errors,
        'ATTRIBUTE features must not include featureConfig',
        `${fieldPrefix}.featureConfig`,
        'INVALID_PLAN_FEATURE_TYPE_CONSISTENCY',
      )
    }
    if (!feature.attributes?.length) {
      pushError(
        errors,
        'ATTRIBUTE features must include at least one attribute',
        `${fieldPrefix}.attributes`,
        'INVALID_PLAN_FEATURE_TYPE_CONSISTENCY',
      )
      return
    }

    const catalogFeature = catalog.find((item) => item.id === feature.featureId)
    for (let attributeIndex = 0; attributeIndex < feature.attributes.length; attributeIndex++) {
      const attribute = feature.attributes[attributeIndex]
      const attributeField = `${fieldPrefix}.attributes.${attributeIndex}`

      if (catalogFeature) {
        const belongs = catalogFeature.featureAttributes.some(
          (item) => item.id === attribute.featureAttributeId,
        )
        if (!belongs) {
          pushError(
            errors,
            `featureAttributeId does not belong to feature ${feature.featureId}`,
            `${attributeField}.featureAttributeId`,
          )
        }
      }

      validateAttributeConfig(
        attribute,
        attributeField,
        catalog,
        monthlyOrderVolumeAttributeId,
        errors,
      )
    }
  }
}

/** Client-side validation mirroring create-plan / update-plan API rules. */
export function validateCreatePlanPayload(
  payload: CreatePlanPayload,
  catalog: CatalogFeature[],
): ApiErrorItem[] {
  const errors: ApiErrorItem[] = []

  if (!payload.planName.trim()) {
    pushError(errors, 'planName is required', 'planName')
  } else if (payload.planName.length > 255) {
    pushError(errors, 'planName must be at most 255 characters', 'planName')
  }

  if (!payload.planDescription.trim()) {
    pushError(errors, 'planDescription is required', 'planDescription')
  }

  if (!isNonNegativeNumber(payload.baseMonthlyPrice)) {
    pushError(errors, 'baseMonthlyPrice must be a non-negative number', 'baseMonthlyPrice')
  }
  if (!isNonNegativeNumber(payload.baseYearlyPrice)) {
    pushError(errors, 'baseYearlyPrice must be a non-negative number', 'baseYearlyPrice')
  }
  if (!isNonNegativeNumber(payload.overageAutoChargeAmount)) {
    pushError(errors, 'overageAutoChargeAmount must be a non-negative number', 'overageAutoChargeAmount')
  }
  if (!isNonNegativeNumber(payload.overageMaxAllowedAmount)) {
    pushError(errors, 'overageMaxAllowedAmount must be a non-negative number', 'overageMaxAllowedAmount')
  }

  if (payload.isTrialPeriodEnabled && !isPositiveNumber(payload.trialPeriod ?? null)) {
    pushError(
      errors,
      'trialPeriod must be a positive number when isTrialPeriodEnabled is true',
      'trialPeriod',
    )
  }

  if (payload.isGracePeriodEnabled && !isPositiveNumber(payload.gracePeriod ?? null)) {
    pushError(
      errors,
      'gracePeriod must be a positive number when isGracePeriodEnabled is true',
      'gracePeriod',
    )
  }

  const featureIds = payload.features.map((feature) => feature.featureId)
  const duplicateFeatureIds = featureIds.filter(
    (id, index) => featureIds.indexOf(id) !== index,
  )
  if (duplicateFeatureIds.length > 0) {
    pushError(
      errors,
      'Each catalog feature may only be used once per plan',
      'features',
      'INVALID_UNIQUE_PLAN_FEATURE_IDS',
    )
  }

  const monthlyOrderVolume = findCatalogAttributeByCode(catalog, 'MONTHLY_ORDER_VOLUME')
  const monthlyOrderVolumeAttributeId = monthlyOrderVolume?.attribute.id ?? null

  const submittedAttributeIds = new Set(
    payload.features.flatMap((feature) =>
      feature.featureType === FeatureType.ATTRIBUTE
        ? (feature.attributes ?? []).map((attribute) => attribute.featureAttributeId)
        : [],
    ),
  )

  for (const code of REQUIRED_ATTRIBUTE_CODES) {
    const required = findCatalogAttributeByCode(catalog, code)
    if (!required) {
      pushError(
        errors,
        `Required catalog attribute ${code} is missing from the feature catalog`,
        'features',
      )
      continue
    }
    if (!submittedAttributeIds.has(required.attribute.id)) {
      pushError(errors, `Required attribute missing: ${code}`, 'features')
    }
  }

  payload.features.forEach((feature, index) => {
    validatePlanFeature(feature, index, catalog, monthlyOrderVolumeAttributeId, errors)
  })

  return errors
}

/** Strip fields the API rejects before submit. */
export function normalizeAttributeConfigForApi(
  config: AttributeConfig,
  linkToMonthlyOrderVolume = false,
): AttributeConfig {
  const inclusionAddonTrial =
    config.inclusionType === InclusionType.ADDON
      ? {
          addonTrialEnabled: config.addonTrialEnabled,
          ...(config.addonTrialEnabled
            ? { addonTrialPeriod: config.addonTrialPeriod ?? 14 }
            : {}),
        }
      : {
          addonTrialEnabled: false,
        }

  const overageFields = config.isOverageEnabled
    ? { isOverageEnabled: true as const, overagePricePerUnit: config.overagePricePerUnit ?? 0 }
    : { isOverageEnabled: false as const }

  const base = {
    inclusionType: config.inclusionType,
    baseMonthlyPrice: config.baseMonthlyPrice ?? 0,
    baseYearlyPrice: config.baseYearlyPrice ?? 0,
    isProrated: config.isProrated,
    ...overageFields,
    ...inclusionAddonTrial,
  }

  if (linkToMonthlyOrderVolume) {
    return {
      ...base,
      priceType: PriceType.PER_COUNT,
      pricePerUnitMonthly: config.pricePerUnitMonthly ?? 0,
      pricePerUnitYearly: config.pricePerUnitYearly ?? 0,
    }
  }

  if (config.priceType === PriceType.VOLUME_PRICE) {
    return {
      ...base,
      priceType: PriceType.VOLUME_PRICE,
      volumePrice: config.volumePrice?.length
        ? config.volumePrice
        : [{ count: 20, monthlyPrice: 40, yearlyPrice: 400 }],
    }
  }

  return {
    ...base,
    priceType: PriceType.PER_COUNT,
    minLimit: config.minLimit,
    maxLimit: config.maxLimit,
    pricePerUnitMonthly: config.pricePerUnitMonthly ?? 0,
    pricePerUnitYearly: config.pricePerUnitYearly ?? 0,
  }
}

export function normalizePlanFeatureForApi(feature: PlanFeature): PlanFeature {
  if (feature.featureType === FeatureType.SIMPLE) {
    const config = feature.featureConfig!
    const normalizedConfig = {
      planFeaturePriceMonthly: config.planFeaturePriceMonthly,
      planFeaturePriceYearly: config.planFeaturePriceYearly,
      inclusionType: config.inclusionType,
      isProrated: config.isProrated,
      addonTrialEnabled:
        config.inclusionType === InclusionType.ADDON ? config.addonTrialEnabled : false,
      ...(config.inclusionType === InclusionType.ADDON && config.addonTrialEnabled
        ? { addonTrialPeriod: config.addonTrialPeriod ?? 14 }
        : {}),
    }
    return {
      featureId: feature.featureId,
      featureType: FeatureType.SIMPLE,
      featureConfig: normalizedConfig,
    }
  }

  return {
    featureId: feature.featureId,
    featureType: FeatureType.ATTRIBUTE,
    attributes: (feature.attributes ?? []).map((attribute) => ({
      featureAttributeId: attribute.featureAttributeId,
      ...(attribute.linkToMonthlyOrderVolume ? { linkToMonthlyOrderVolume: true } : {}),
      attributeConfig: normalizeAttributeConfigForApi(
        attribute.attributeConfig,
        attribute.linkToMonthlyOrderVolume ?? false,
      ),
    })),
  }
}

export function normalizeCreatePlanPayloadForApi(payload: CreatePlanPayload): CreatePlanPayload {
  const normalized: CreatePlanPayload = {
    ...payload,
    features: payload.features.map(normalizePlanFeatureForApi),
  }

  if (normalized.isTrialPeriodEnabled) {
    normalized.trialPeriod = Math.max(1, normalized.trialPeriod ?? 14)
  } else {
    delete normalized.trialPeriod
  }

  if (normalized.isGracePeriodEnabled) {
    normalized.gracePeriod = Math.max(1, normalized.gracePeriod ?? 15)
  } else {
    delete normalized.gracePeriod
  }

  return normalized
}
