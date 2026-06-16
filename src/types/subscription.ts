export const PlanType = {
  PUBLIC: 'PUBLIC',
  CUSTOM: 'CUSTOM',
} as const

export type PlanTypeValue = (typeof PlanType)[keyof typeof PlanType]

export const PlanStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DISCONTINUED: 'DISCONTINUED',
  DRAFT: 'DRAFT',
} as const

export type PlanStatusValue = (typeof PlanStatus)[keyof typeof PlanStatus]

export const FeatureType = {
  SIMPLE: 'SIMPLE',
  ATTRIBUTE: 'ATTRIBUTE',
} as const

export type FeatureTypeValue = (typeof FeatureType)[keyof typeof FeatureType]

export const InclusionType = {
  INCLUDED: 'INCLUDED',
  ADDON: 'ADDON',
} as const

export type InclusionTypeValue = (typeof InclusionType)[keyof typeof InclusionType]

export const PriceType = {
  PER_COUNT: 'PER_COUNT',
  VOLUME_PRICE: 'VOLUME_PRICE',
} as const

export type PriceTypeValue = (typeof PriceType)[keyof typeof PriceType]

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  timestamp: string
  path?: string
  statusCode?: number
  errorCode?: string
  errors?: ApiErrorItem[]
  errorCount?: number
}

export interface ApiErrorItem {
  code?: string
  message: string
  field?: string
  value?: unknown
  constraints?: string[]
}

export interface FeatureAttributeRow {
  id: string
  featureId: string
  attributeName: string
  attributeCode: string
  isLinkable: boolean
  isMonthlyLimit: boolean
}

export interface CatalogFeature {
  id: string
  code: string
  name: string
  description: string
  status: boolean
  parentFeatureId: string | null
  featureAttributes: FeatureAttributeRow[]
}

export interface VolumePriceTier {
  count: number
  monthlyPrice: number
  yearlyPrice: number
}

export interface FeatureConfig {
  planFeaturePriceMonthly: number
  planFeaturePriceYearly: number
  inclusionType: InclusionTypeValue
  isProrated: boolean
  addonTrialEnabled: boolean
  addonTrialPeriod?: number | null
}

export interface AttributeConfig {
  inclusionType: InclusionTypeValue
  priceType: PriceTypeValue
  baseMonthlyPrice?: number | null
  baseYearlyPrice?: number | null
  minLimit?: number | null
  maxLimit?: number | null
  pricePerUnitMonthly?: number | null
  pricePerUnitYearly?: number | null
  volumePrice?: VolumePriceTier[] | null
  isProrated: boolean
  isOverageEnabled: boolean
  overagePricePerUnit?: number | null
  addonTrialEnabled: boolean
  addonTrialPeriod?: number | null
}

export interface PlanFeatureAttribute {
  featureAttributeId: string
  linkToMonthlyOrderVolume?: boolean
  attributeConfig: AttributeConfig
}

export interface PlanFeature {
  featureId: string
  featureType: FeatureTypeValue
  featureConfig?: FeatureConfig
  attributes?: PlanFeatureAttribute[]
}

export interface CreatePlanPayload {
  planName: string
  planDescription: string
  planType: PlanTypeValue
  baseMonthlyPrice: number
  baseYearlyPrice: number
  baseCurrency?: string
  isTrialPeriodEnabled: boolean
  trialPeriod?: number | null
  isGracePeriodEnabled: boolean
  gracePeriod?: number | null
  overageAutoChargeAmount: number
  overageMaxAllowedAmount: number
  features: PlanFeature[]
}

export interface CreatePlanResponse {
  planId: string
  message: string
}

export interface UpdatePlanPayload {
  planName?: string
  planDescription?: string
  planType?: PlanTypeValue
  baseMonthlyPrice?: number
  baseYearlyPrice?: number
  baseCurrency?: string
  isTrialPeriodEnabled?: boolean
  trialPeriod?: number | null
  isGracePeriodEnabled?: boolean
  gracePeriod?: number | null
  overageAutoChargeAmount?: number
  overageMaxAllowedAmount?: number
  status?: Extract<PlanStatusValue, 'DRAFT' | 'ACTIVE'>
  features: PlanFeature[]
}

export interface UpdatePlanResponse {
  planId: string
  message: string
}

export interface PlanListItem {
  id: string
  planName: string
  planType: PlanTypeValue
  status: PlanStatusValue
  baseMonthlyPrice: number
  baseYearlyPrice: number
  baseCurrency: string
  trial: { enabled: boolean; days: number | null }
  grace: { enabled: boolean; days: number | null }
  overageAutoChargeAmount: number
  overageMaxAllowedAmount: number
}

export interface ListPlansResponse {
  plans: PlanListItem[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface PlanFiltersResponse {
  planName: string[]
  monthlyPrice: string[]
  yearlyPrice: string[]
  planType: PlanTypeValue[]
  status: PlanStatusValue[]
  trialPeriodEnabled: boolean[]
  gracePeriodEnabled: boolean[]
  sortBy: string[]
  sortOrder: ('asc' | 'desc')[]
}

export interface UpdatePlanStatusPayload {
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT'
  migrationPlanId?: string
  isTrialPeriodEnabled?: boolean
  trialPeriod?: number
}

export interface TrialGraceDetail {
  enabled: boolean
  days: number | null
}

export interface PlanDetailAttributeConfig {
  inclusionType: InclusionTypeValue
  priceType: PriceTypeValue
  baseMonthlyPrice: number | null
  baseYearlyPrice: number | null
  minLimit: number | null
  maxLimit: number | null
  pricePerUnitMonthly: number | null
  pricePerUnitYearly: number | null
  volumePrice: VolumePriceTier[] | null
  isProrated: boolean
  isOverageEnabled: boolean
  overagePricePerUnit: number | null
  addonTrialEnabled: boolean
  addonTrialPeriod: number | null
}

export interface PlanDetailFeatureAttribute {
  planFeatureAttributeId: string
  featureAttributeId: string
  parentFeatureAttributeId: string | null
  attributeName: string | null
  attributeCode: string | null
  isMonthlyLimit: boolean
  attributeConfig: PlanDetailAttributeConfig
}

export interface PlanDetailFeatureConfig {
  planFeaturePriceMonthly: number
  planFeaturePriceYearly: number
  inclusionType: InclusionTypeValue
  isProrated: boolean
  addonTrialEnabled: boolean
  addonTrialPeriod: number | null
}

export interface PlanDetailFeature {
  planFeatureId: string
  featureId: string
  featureType: FeatureTypeValue
  featureCode: string | null
  featureName: string | null
  featureConfig: PlanDetailFeatureConfig | null
  attributes: PlanDetailFeatureAttribute[]
}

export interface PlanDetail {
  id: string
  planName: string
  planDescription: string
  planType: PlanTypeValue
  status: PlanStatusValue
  baseMonthlyPrice: number
  baseYearlyPrice: number
  baseCurrency: string
  migrationPlanId: string | null
  trial: TrialGraceDetail
  grace: TrialGraceDetail
  overageAutoChargeAmount: number
  overageMaxAllowedAmount: number
  createdAt: string | null
  createdBy: string | null
  updatedAt: string | null
  updatedBy: string | null
  features: PlanDetailFeature[]
}

export const BillingCycle = {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
} as const

export type BillingCycleValue = (typeof BillingCycle)[keyof typeof BillingCycle]

export interface MerchantPlanListResponse {
  plans: PlanDetail[]
  activePlanId: string | null
}

export interface CartAttributeValue {
  planFeatureAttributeId: string
  value: number
}

export interface CartFeatureSelection {
  planFeatureId: string
  attributes: CartAttributeValue[]
}

export interface UpsertMerchantCartPayload {
  planId: string
  isTrial?: boolean
  billingCycle?: BillingCycleValue
  features?: CartFeatureSelection[]
}

export interface CartPricingLine {
  lineItemName: string
  quantity: number | null
  unitPrice: number | null
  subTotal: number
}

export interface CartPricingPreview {
  subtotal: number
  currency: string
  taxAmount: number
  grandTotal: number
  lines: CartPricingLine[]
}

export interface MerchantCartPreview {
  planId: string
  billingCycle: BillingCycleValue | null
  autoRenew: boolean
  isTrial: boolean
  plan: PlanDetail
  pricing: CartPricingPreview
}

export interface BillingAddress {
  street: string
  city: string
  stateProvince: string
  country: string
  zipPostalCode: string
}

export interface InitiatePlanPurchasePayload {
  billingAddress?: BillingAddress
}

export interface MerchantPlanPurchaseResult {
  checkoutUrl?: string
  subscriptionId?: string
  message: string
  paymentHandoff?: {
    invoiceId: string
    invoiceNumber: string
    grandTotal: number
    currency: string
    status: string
  }
}

export interface SubscriptionLimitAndUsage {
  usageId: string
  planFeatureAttributeId: string
  attributeCode: string
  usageType: 'UNLIMITED' | 'LIMITED' | 'LIMITED_MONTHLY' | string
  usedCount: number
  usageLimit: number | null
  scheduledUsageLimit: number | null
  overageEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface SubscriptionDetail {
  subscriptionId: string
  planId: string
  status: string
  startDate: string
  endDate: string
  billingCycle: BillingCycleValue | string
  autoRenew: boolean
  isTrial: boolean
  usageResetDate: string | null
  gracePeriodDate: string | null
  gracePeriodLastNotifiedAt: string | null
  createdAt: string | null
}

export interface ActiveSubscriptionDetail extends SubscriptionDetail {
  isThresholdReached: boolean
  limitsAndUsages: SubscriptionLimitAndUsage[]
}

export interface ActiveSubscriptionResponse {
  subscription: ActiveSubscriptionDetail
  plan: PlanDetail
}

export interface ActivePlanSummary {
  id: string
  planName: string
  planDescription: string
  planType: string
  status: string
  baseMonthlyPrice: number
  baseYearlyPrice: number
  baseCurrency: string
}

export interface ActivePlanAddonUsage {
  usageType: string
  usedCount: number
  usageLimit: number | null
  scheduledUsageLimit: number | null
}

export interface ActivePlanAddonAttribute {
  planFeatureAttributeId: string
  attributeCode: string | null
  attributeName: string | null
  attributeConfig: PlanDetailAttributeConfig
}

export interface ActivePlanAddonFeature {
  featureType: FeatureTypeValue
  featureCode: string | null
  featureName: string | null
  featureConfig: PlanDetailFeatureConfig | null
  attribute: ActivePlanAddonAttribute | null
}

export interface ActivePlanAddonItem {
  addonSubscriptionId: string
  planFeatureId: string
  planFeatureAttributeId: string | null
  status: string
  autoRenew: boolean
  isTrial: boolean
  trialStartDate: string | null
  trialEndDate: string | null
  feature: ActivePlanAddonFeature
  usage: ActivePlanAddonUsage | null
}

export interface ActivePlanAddonsResponse {
  subscription: SubscriptionDetail
  plan: ActivePlanSummary
  addons: ActivePlanAddonItem[]
}

export interface AddonCatalogItemKey {
  planFeatureId: string
  planFeatureAttributeId?: string
}

export interface UpsertAddonCartPayload {
  planFeatureId: string
  planFeatureAttributeId?: string
  isAddonTrial: boolean
  value?: number
}

export interface AddonCartItemPreview {
  planFeatureId: string
  featureId: string
  featureType: FeatureTypeValue
  featureCode: string | null
  featureName: string | null
  featureConfig: PlanDetailFeatureConfig | null
  attribute: {
    planFeatureAttributeId: string
    featureAttributeId: string
    value: number
    attributeName: string | null
    attributeCode: string | null
    attributeConfig: PlanDetailAttributeConfig
  } | null
}

export interface MerchantAddonCartPreview {
  planId: string
  baseCurrency: string
  billingCycle: BillingCycleValue | null
  autoRenew: boolean
  isTrial: boolean
  addon: AddonCartItemPreview
  pricing: CartPricingPreview
}

export interface MerchantAddonPurchaseResult {
  checkoutUrl?: string
  addonSubscriptionId?: string
  message: string
  paymentHandoff?: {
    invoiceId: string
    invoiceNumber: string
    grandTotal: number
    currency: string
    status: string
  }
}

export interface UpsertAttributeCartPayload {
  features: CartFeatureSelection[]
}

export interface AttributeCartChangeLine {
  planFeatureAttributeId: string
  attributeName: string | null
  attributeCode: string | null
  planFeatureId: string
  previousValue: number
  newValue: number
  minLimit: number | null
  pricePerUnitMonthly: number | null
  pricePerUnitYearly: number | null
  isPriceApplicable: boolean
  ineligibilityMessage: string | null
  amount: number
}

export interface AttributeCartPricing {
  chargeTiming: 'IMMEDIATE' | 'NEXT_BILLING_CYCLE'
  subtotal: number
  taxAmount: number
  grandTotal: number
  currency: string
  taxData?: unknown
  message: string
}

export interface MerchantAttributeCartPreview {
  planId: string
  baseCurrency: string
  billingCycle: BillingCycleValue | null
  autoRenew: boolean
  subscriptionAction: string
  subscriptionId: string
  attributeChanges: AttributeCartChangeLine[]
  pricing: AttributeCartPricing
}

export interface InitiateAttributePurchasePayload {
  billingAddress: BillingAddress
}

export interface MerchantAttributePurchaseResult {
  checkoutUrl?: string
  message: string
  paymentHandoff?: {
    invoiceId: string
    invoiceNumber: string
    grandTotal: number
    currency: string
    status: string
  }
}

export const InvoiceStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const

export type InvoiceStatusValue = (typeof InvoiceStatus)[keyof typeof InvoiceStatus]

export interface InvoiceLineItem {
  id: string
  lineItemName: string | null
  lineItemCategory: string
  lineItemType: string
  lineItemReference?: string
  quantity: number | null
  unitPrice: number | null
  subTotal: number
  baseSubTotal: number
  attributeBasePrice: number | null
}

export interface InvoiceListItem {
  id: string
  invoiceNumber: string
  merchantId: string
  subscriptionId: string | null
  status: InvoiceStatusValue | string
  subTotal: number
  baseSubTotal: number
  proratedDifference: number | null
  baseProratedDifference: number | null
  currency: string
  grandTotal: number
  baseGrandTotal: number
  taxAmount: unknown
  baseTaxAmount: unknown
  billingAddress: BillingAddress | unknown
  createdAt: string
  updatedAt: string
  lineItems: InvoiceLineItem[]
}

export interface InvoiceReceipt {
  id: string
  invoiceId: string
  cardLast4Digit: string
  paymentMethod: string
  paymentReference: string | null
  paymentGateway: string | null
  createdAt: string
}

export interface InvoiceDetail extends Omit<InvoiceListItem, 'lineItems'> {
  taxData: unknown | null
  metaData: unknown | null
  lineItems: InvoiceLineItem[]
  receipt: InvoiceReceipt | null
}

export interface InvoiceListResponse {
  invoices: InvoiceListItem[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ListInvoicesParams {
  page?: number
  limit?: number
  subscriptionId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ValidateMerchantUsageResponse {
  usageLimit: number | null
  isOverageAllowed: boolean
  planFeatureAttributeId: string
  merchantSubscriptionId: string
}

export interface LogMerchantUsagePayload {
  attributeCode: string
  entityReferenceId: string
  planFeatureAttributeId: string
  merchantSubscriptionId: string
  isOverageAllowed: boolean
}

export interface LogMerchantUsageResponse {
  id: string
  isOverage: boolean
}

export interface ConfirmMerchantUsagePayload {
  entityReferenceId: string
  attributeCode: string
  isOverage: boolean
  usageId: string
}

export interface ConfirmMerchantUsageResponse {
  usageId: string
  message: string
}

export interface RemoveMerchantUsagePayload {
  entityReferenceId: string
  attributeCode: string
}
