import type {
  CartFeatureSelection,
  MerchantCartPreview,
  PlanCartPlanDetails,
  PlanCartSystemAddedEntity,
  PlanDetail,
  PlanDetailFeature,
  PlanDetailFeatureAttribute,
  UpsertMerchantCartPayload,
} from '../types/subscription'
import type { BillingCycleValue } from '../types/subscription'
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

/** Removes transition metadata the backend re-applies on upsert — not valid in POST `features`. */
export function stripSystemAddedSelections(
  selections: CartFeatureSelection[],
  systemAddedEntities?: PlanCartSystemAddedEntity[],
): CartFeatureSelection[] {
  if (!systemAddedEntities?.length) {
    return selections
  }

  const systemFeatureIds = new Set(
    systemAddedEntities
      .filter((entity) => entity.type === 'PLAN_FEATURE')
      .map((entity) => entity.id),
  )
  const systemAttributeIds = new Set(
    systemAddedEntities
      .filter((entity) => entity.type === 'PLAN_FEATURE_ATTRIBUTE')
      .map((entity) => entity.id),
  )

  return selections
    .filter((selection) => !systemFeatureIds.has(selection.planFeatureId))
    .map((selection) => ({
      ...selection,
      attributes: selection.attributes.filter(
        (attribute) => !systemAttributeIds.has(attribute.planFeatureAttributeId),
      ),
    }))
}

/** Merchant-owned included feature rows only — what plan cart upsert expects. */
export function systemAddedEntityKey(entity: {
  id: string
  type: PlanCartSystemAddedEntity['type']
}): string {
  return `${entity.type}:${entity.id}`
}

function findPlanFeatureAttribute(
  plan: PlanDetail,
  planFeatureAttributeId: string,
): PlanDetail['features'][number]['attributes'][number] | undefined {
  for (const feature of plan.features) {
    const attribute = feature.attributes.find(
      (row) => row.planFeatureAttributeId === planFeatureAttributeId,
    )
    if (attribute) {
      return attribute
    }
  }
  return undefined
}

/** Non-monthly LIMITED attributes with active usage cannot be opted out (matches backend). */
export function canOptOutSystemAddedEntity(
  entity: PlanCartSystemAddedEntity,
  planDetails?: PlanCartPlanDetails,
  plan?: PlanDetail,
): boolean {
  if (entity.type === 'PLAN_FEATURE') {
    return true
  }

  const planAttribute = plan ? findPlanFeatureAttribute(plan, entity.id) : undefined
  if (planAttribute?.isMonthlyLimit) {
    return true
  }

  const warning = planDetails?.warningAttributes?.find(
    (row) => row.attributeId === entity.id,
  )
  return !(warning && warning.usedCount > 0)
}

/** Fingerprint of plan cart form inputs that affect transition system-added candidates. */
export function planCartFormContextKey(params: {
  planId: string
  billingCycle: BillingCycleValue
  selections: CartFeatureSelection[]
}): string {
  return JSON.stringify({
    planId: params.planId,
    billingCycle: params.billingCycle,
    selections: params.selections.map((selection) => ({
      planFeatureId: selection.planFeatureId,
      attributes: selection.attributes.map((attribute) => ({
        planFeatureAttributeId: attribute.planFeatureAttributeId,
        value: attribute.value,
      })),
    })),
  })
}

export function buildPlanCartUpsertPayload(params: {
  planId: string
  billingCycle: BillingCycleValue
  plan: PlanDetail
  selections: CartFeatureSelection[]
  cartPreview: MerchantCartPreview | null
  /** When null, POST omits systemAddedEntities (server keeps all candidates). */
  systemAddedSelection: Set<string> | null
  /** Must match the form state when cartPreview was loaded, or opt-out is ignored. */
  cartPreviewFormContextKey: string | null
}): UpsertMerchantCartPayload {
  const candidates =
    params.cartPreview?.planId === params.planId
      ? params.cartPreview.planDetails?.systemAddedEntities ?? []
      : []

  const includedOnly = featuresForPlanCartUpsert(
    params.plan,
    params.selections,
    candidates,
  )

  const payload: UpsertMerchantCartPayload = {
    planId: params.planId,
    billingCycle: params.billingCycle,
    features: includedOnly,
  }

  const formContextKey = planCartFormContextKey({
    planId: params.planId,
    billingCycle: params.billingCycle,
    selections: params.selections,
  })

  const optOutContextValid =
    params.cartPreviewFormContextKey !== null &&
    params.cartPreviewFormContextKey === formContextKey

  const effectiveSelection = optOutContextValid ? params.systemAddedSelection : null

  if (candidates.length === 0 || effectiveSelection === null) {
    return payload
  }

  const allKept = candidates.every((entity) =>
    effectiveSelection.has(systemAddedEntityKey(entity)),
  )
  if (allKept) {
    return payload
  }

  const kept = candidates.filter((entity) =>
    effectiveSelection.has(systemAddedEntityKey(entity)),
  )

  // Opt-out via systemAddedEntities only — do not duplicate kept rows in `features`
  // (that removes them from transition candidates and causes "Unknown system-added entity").
  payload.systemAddedEntities = kept.map(({ id, type }) => ({ id, type }))

  return payload
}

export function featuresForPlanCartUpsert(
  plan: PlanDetail,
  selections: CartFeatureSelection[],
  systemAddedEntities?: PlanCartSystemAddedEntity[],
): CartFeatureSelection[] {
  const includedFeatureIds = new Set(
    includedPlanFeatures(plan).map((feature) => feature.planFeatureId),
  )

  return stripSystemAddedSelections(selections, systemAddedEntities).filter((selection) =>
    includedFeatureIds.has(selection.planFeatureId),
  )
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

  const allIncludedAttrs = includedPlanFeatures(plan).flatMap((feature) =>
    feature.featureType === FeatureType.ATTRIBUTE ? includedAttributesForFeature(feature) : [],
  )
  const attrsByCatalogId = new Map(
    allIncludedAttrs.map((attribute) => [attribute.featureAttributeId, attribute]),
  )

  for (const attribute of allIncludedAttrs) {
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

    const allIncludedAttrs = includedFeatures.flatMap((feature) =>
      feature.featureType === FeatureType.ATTRIBUTE ? includedAttributesForFeature(feature) : [],
    )
    const attrsByCatalogId = new Map(
      allIncludedAttrs.map((attribute) => [attribute.featureAttributeId, attribute]),
    )
    const valueByPfaId = new Map(
      selections.flatMap((selection) =>
        selection.attributes.map((row) => [row.planFeatureAttributeId, row.value] as const),
      ),
    )

    for (const attribute of allIncludedAttrs) {
      if (!attribute.parentFeatureAttributeId) {
        continue
      }

      const parent = attrsByCatalogId.get(attribute.parentFeatureAttributeId)
      if (!parent) {
        errors.push(
          `Plan data is inconsistent: "${attribute.attributeName ?? attribute.attributeCode}" references a missing parent attribute.`,
        )
        continue
      }

      const parentValue = valueByPfaId.get(parent.planFeatureAttributeId)
      const linkedValue = valueByPfaId.get(attribute.planFeatureAttributeId)
      if (parentValue === undefined || linkedValue === undefined) {
        continue
      }

      if (linkedValue < parentValue) {
        const label = attribute.attributeName ?? attribute.attributeCode ?? 'Attribute'
        errors.push(
          `${label} is linked to monthly order volume and must be at least ${parentValue}.`,
        )
      }
    }
  }

  return errors
}
