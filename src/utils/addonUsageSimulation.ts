import type {
  ActivePlanAddonItem,
  SubscriptionLimitAndUsage,
} from '../types/subscription'
import { FeatureType } from '../types/subscription'

export function isSimulatableAddon(addon: ActivePlanAddonItem): boolean {
  if (addon.status.toUpperCase() !== 'ACTIVE') {
    return false
  }

  if (addon.feature.featureType === FeatureType.SIMPLE) {
    return false
  }

  const attributeCode = addon.feature.attribute?.attributeCode
  if (!attributeCode) {
    return false
  }

  return addon.usage != null
}

export function mapAddonToLimitAndUsage(
  addon: ActivePlanAddonItem,
): SubscriptionLimitAndUsage | null {
  if (!isSimulatableAddon(addon)) {
    return null
  }

  const attribute = addon.feature.attribute!
  const usage = addon.usage!

  return {
    usageId: addon.addonSubscriptionId,
    planFeatureAttributeId: attribute.planFeatureAttributeId,
    attributeCode: attribute.attributeCode!,
    usageType: usage.usageType,
    usedCount: usage.usedCount,
    usageLimit: usage.usageLimit,
    scheduledUsageLimit: usage.scheduledUsageLimit,
    overageEnabled: attribute.attributeConfig.isOverageEnabled,
    createdAt: '',
    updatedAt: '',
  }
}

export function extractSimulatableAddonUsages(
  addons: ActivePlanAddonItem[],
): SubscriptionLimitAndUsage[] {
  return addons
    .map(mapAddonToLimitAndUsage)
    .filter((row): row is SubscriptionLimitAndUsage => row != null)
}

export function getAddonAttributeTitle(addon: ActivePlanAddonItem): string {
  return (
    addon.feature.attribute?.attributeName ??
    addon.feature.attribute?.attributeCode ??
    addon.feature.featureName ??
    'Add-on attribute'
  )
}

export function getAddonFeatureSubtitle(addon: ActivePlanAddonItem): string {
  const featureName = addon.feature.featureName ?? addon.feature.featureCode ?? 'Feature'
  const attributeCode = addon.feature.attribute?.attributeCode ?? addon.planFeatureAttributeId ?? '—'
  return `${featureName} · ${attributeCode}`
}

export function findAddonByAttributeCode(
  addons: ActivePlanAddonItem[],
  attributeCode: string,
): ActivePlanAddonItem | undefined {
  return addons.find(
    (addon) => addon.feature.attribute?.attributeCode === attributeCode && isSimulatableAddon(addon),
  )
}

export function findAddonBySubscriptionId(
  addons: ActivePlanAddonItem[],
  addonSubscriptionId: string,
): ActivePlanAddonItem | undefined {
  return addons.find((addon) => addon.addonSubscriptionId === addonSubscriptionId)
}
