import type { PlanDetail } from '../types/subscription'

export function resolvePlanFeatureLabel(plan: PlanDetail, planFeatureId: string): string {
  const feature = plan.features.find((item) => item.planFeatureId === planFeatureId)
  if (!feature) {
    return planFeatureId
  }
  return feature.featureName ?? feature.featureCode ?? planFeatureId
}

export function resolvePlanAttributeLabel(plan: PlanDetail, attributeId: string): string {
  for (const feature of plan.features) {
    const attribute = feature.attributes.find(
      (item) =>
        item.planFeatureAttributeId === attributeId || item.featureAttributeId === attributeId,
    )
    if (attribute) {
      const name = attribute.attributeName ?? attribute.attributeCode ?? attributeId
      const code = attribute.attributeCode
      return code && code !== name ? `${name} (${code})` : name
    }
  }
  return attributeId
}

export function resolvePlanEntityLabel(
  plan: PlanDetail,
  id: string,
  type: 'PLAN_FEATURE' | 'PLAN_FEATURE_ATTRIBUTE',
): string {
  if (type === 'PLAN_FEATURE') {
    return resolvePlanFeatureLabel(plan, id)
  }
  return resolvePlanAttributeLabel(plan, id)
}
