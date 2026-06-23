import type {
  AttributeConfig,
  CreatePlanPayload,
  FeatureConfig,
  PlanDetail,
  PlanDetailAttributeConfig,
  PlanDetailFeatureAttribute,
  PlanDetailFeatureConfig,
  PlanFeature,
  UpdatePlanPayload,
} from '../types/subscription'
import { FeatureType } from '../types/subscription'
import { isRequiredAttributeCode, sanitizeCreatePlanPayload } from './planDefaults'

export type SelectedAttributeFeatureState = {
  featureId: string
  attributeIds: string[]
  configs: Record<string, AttributeConfig>
  linkFlags: Record<string, boolean>
}

export interface PlanFormEditorState {
  form: CreatePlanPayload
  requiredAttributeConfigs: Record<string, AttributeConfig>
  selectedAttributeFeatures: Record<string, SelectedAttributeFeatureState>
  selectedSimpleFeatures: Record<string, FeatureConfig>
}

export function detailAttributeConfigToAttributeConfig(
  config: PlanDetailAttributeConfig,
): AttributeConfig {
  return {
    inclusionType: config.inclusionType,
    priceType: config.priceType,
    baseMonthlyPrice: config.baseMonthlyPrice,
    baseYearlyPrice: config.baseYearlyPrice,
    minLimit: config.minLimit,
    maxLimit: config.maxLimit,
    pricePerUnitMonthly: config.pricePerUnitMonthly,
    pricePerUnitYearly: config.pricePerUnitYearly,
    volumePrice: config.volumePrice,
    isProrated: config.isProrated,
    isOverageEnabled: config.isOverageEnabled,
    overagePricePerUnit: config.overagePricePerUnit,
    addonTrialEnabled: config.addonTrialEnabled,
    addonTrialPeriod: config.addonTrialPeriod,
  }
}

export function detailFeatureConfigToFeatureConfig(
  config: PlanDetailFeatureConfig,
): FeatureConfig {
  return {
    planFeaturePriceMonthly: config.planFeaturePriceMonthly,
    planFeaturePriceYearly: config.planFeaturePriceYearly,
    inclusionType: config.inclusionType,
    isProrated: config.isProrated,
    addonTrialEnabled: config.addonTrialEnabled,
    addonTrialPeriod: config.addonTrialPeriod,
  }
}

export function planDetailToFormState(plan: PlanDetail): PlanFormEditorState {
  const form: CreatePlanPayload = {
    planName: plan.planName,
    planDescription: plan.planDescription,
    planType: plan.planType,
    baseMonthlyPrice: plan.baseMonthlyPrice,
    baseYearlyPrice: plan.baseYearlyPrice,
    baseCurrency: plan.baseCurrency,
    isTrialPeriodEnabled: plan.trial.enabled,
    trialPeriod: plan.trial.days,
    isGracePeriodEnabled: plan.grace.enabled,
    gracePeriod: plan.grace.days,
    overageAutoChargeAmount: plan.overageAutoChargeAmount,
    overageMaxAllowedAmount: plan.overageMaxAllowedAmount,
    features: [],
  }

  const requiredAttributeConfigs: Record<string, AttributeConfig> = {}
  const selectedAttributeFeatures: Record<string, SelectedAttributeFeatureState> = {}
  const selectedSimpleFeatures: Record<string, FeatureConfig> = {}

  for (const planFeature of plan.features ?? []) {
    const attributes = planFeature.attributes ?? []
    if (planFeature.featureType === FeatureType.SIMPLE && planFeature.featureConfig) {
      selectedSimpleFeatures[planFeature.featureId] = detailFeatureConfigToFeatureConfig(
        planFeature.featureConfig,
      )
      continue
    }

    if (planFeature.featureType !== FeatureType.ATTRIBUTE) {
      continue
    }

    const requiredAttributes = attributes.filter((attribute) =>
      isRequiredAttributeCode(attribute.attributeCode ?? ''),
    )
    const optionalAttributes = attributes.filter(
      (attribute) => !isRequiredAttributeCode(attribute.attributeCode ?? ''),
    )

    for (const attribute of requiredAttributes) {
      requiredAttributeConfigs[attribute.featureAttributeId] =
        detailAttributeConfigToAttributeConfig(attribute.attributeConfig)
    }

    if (optionalAttributes.length === 0) {
      continue
    }

    selectedAttributeFeatures[planFeature.featureId] = {
      featureId: planFeature.featureId,
      attributeIds: optionalAttributes.map((attribute) => attribute.featureAttributeId),
      configs: Object.fromEntries(
        optionalAttributes.map((attribute) => [
          attribute.featureAttributeId,
          detailAttributeConfigToAttributeConfig(attribute.attributeConfig),
        ]),
      ),
      linkFlags: Object.fromEntries(
        optionalAttributes.map((attribute) => [
          attribute.featureAttributeId,
          attribute.parentFeatureAttributeId != null,
        ]),
      ),
    }
  }

  return {
    form,
    requiredAttributeConfigs,
    selectedAttributeFeatures,
    selectedSimpleFeatures,
  }
}

export function createPlanPayloadToUpdatePayload(payload: CreatePlanPayload): UpdatePlanPayload {
  return {
    planName: payload.planName,
    planDescription: payload.planDescription,
    planType: payload.planType,
    baseMonthlyPrice: payload.baseMonthlyPrice,
    baseYearlyPrice: payload.baseYearlyPrice,
    baseCurrency: payload.baseCurrency,
    isTrialPeriodEnabled: payload.isTrialPeriodEnabled,
    trialPeriod: payload.trialPeriod,
    isGracePeriodEnabled: payload.isGracePeriodEnabled,
    gracePeriod: payload.gracePeriod,
    overageAutoChargeAmount: payload.overageAutoChargeAmount,
    overageMaxAllowedAmount: payload.overageMaxAllowedAmount,
    features: payload.features,
  }
}

function attributeLinksToMonthlyOrderVolume(attribute: PlanDetailFeatureAttribute): boolean {
  return attribute.parentFeatureAttributeId != null
}

function planDetailFeatureToCreateFeature(planFeature: PlanDetail['features'][number]): PlanFeature {
  if (planFeature.featureType === FeatureType.SIMPLE && planFeature.featureConfig) {
    return {
      featureId: planFeature.featureId,
      featureType: FeatureType.SIMPLE,
      featureConfig: detailFeatureConfigToFeatureConfig(planFeature.featureConfig),
    }
  }

  return {
    featureId: planFeature.featureId,
    featureType: FeatureType.ATTRIBUTE,
    attributes: (planFeature.attributes ?? []).map((attribute) => ({
      featureAttributeId: attribute.featureAttributeId,
      linkToMonthlyOrderVolume: attributeLinksToMonthlyOrderVolume(attribute),
      attributeConfig: detailAttributeConfigToAttributeConfig(attribute.attributeConfig),
    })),
  }
}

/** Build a create-plan payload copied from an existing plan (new draft). */
export function planDetailToDuplicatePayload(
  plan: PlanDetail,
  options?: { nameSuffix?: string; uniqueSuffix?: string },
): CreatePlanPayload {
  const suffix = options?.nameSuffix ?? ' Copy'
  const uniqueSuffix = options?.uniqueSuffix ?? String(Date.now()).slice(-6)

  return sanitizeCreatePlanPayload({
    planName: `${plan.planName}${suffix} ${uniqueSuffix}`.trim(),
    planDescription: plan.planDescription,
    planType: plan.planType,
    baseMonthlyPrice: plan.baseMonthlyPrice,
    baseYearlyPrice: plan.baseYearlyPrice,
    baseCurrency: plan.baseCurrency,
    isTrialPeriodEnabled: plan.trial.enabled,
    trialPeriod: plan.trial.days,
    isGracePeriodEnabled: plan.grace.enabled,
    gracePeriod: plan.grace.days,
    overageAutoChargeAmount: plan.overageAutoChargeAmount,
    overageMaxAllowedAmount: plan.overageMaxAllowedAmount,
    features: (plan.features ?? []).map(planDetailFeatureToCreateFeature),
  })
}
