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
  method?: string
  statusCode?: number
  errorCode?: string
  errors?: ApiErrorItem[]
  errorCount?: number
  correlationId?: string
  context?: Record<string, unknown>
}

export interface ApiErrorItem {
  code?: string
  message: string
  field?: string
  value?: unknown
  constraints?: string[]
  metadata?: Record<string, unknown>
}

export interface ApiErrorMeta {
  statusCode?: number
  path?: string
  method?: string
  correlationId?: string
  errorCount?: number
  context?: Record<string, unknown>
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
  activeSubscriptionCount?: number
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

export const SubscriptionAction = {
  NEW: 'NEW',
  UPGRADE: 'UPGRADE',
  DOWNGRADE: 'DOWNGRADE',
} as const

export type SubscriptionActionValue =
  (typeof SubscriptionAction)[keyof typeof SubscriptionAction]

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

export interface PlanCartFeatureSelection extends CartFeatureSelection {
  isAddonTrial?: boolean
}

export interface PlanCartSystemAddedEntity {
  id: string
  type: 'PLAN_FEATURE' | 'PLAN_FEATURE_ATTRIBUTE'
  count: number
  reason: string
}

export interface PlanCartAutoAlignedAttribute {
  attributeId: string
  previousSelectedCount: number
  adjustedCount: number
  reason: string
}

export interface PlanCartWarningAttribute {
  attributeId: string
  selectedCount: number
  usedCount: number
  requiredMinimum: number
  message: string
}

export interface PlanCartPlanDetails {
  selections: PlanCartFeatureSelection[]
  systemAddedEntities?: PlanCartSystemAddedEntity[]
  autoAlignedAttributes?: PlanCartAutoAlignedAttribute[]
  warningAttributes?: PlanCartWarningAttribute[]
}

export interface UpsertMerchantCartPayload {
  planId: string
  isTrial?: boolean
  billingCycle?: BillingCycleValue
  features?: CartFeatureSelection[]
}

export interface CartPricingLine {
  lineItemName: string
  lineItemCategory?: string
  lineItemType?: string
  lineItemReference?: string
  quantity: number | null
  unitPrice: number | null
  subTotal: number
  baseSubTotal?: number
  attributeBasePrice?: number | null
}

export interface CartPricingPreview {
  subtotal: number
  baseSubtotal?: number
  proratedDifference?: number | null
  baseProratedDifference?: number | null
  currency: string
  taxAmount: number
  baseTaxAmount?: number
  taxData?: unknown
  grandTotal: number
  baseGrandTotal?: number
  lines: CartPricingLine[]
}

export interface MerchantCartPreview {
  planId: string
  billingCycle: BillingCycleValue | null
  autoRenew: boolean
  isTrial: boolean
  subscriptionAction: SubscriptionActionValue
  plan: PlanDetail
  planDetails: PlanCartPlanDetails
  pricing: CartPricingPreview
}

/**
 * Billing address shape aligned with subscription MS `BillingAddressDto` / `TaxAddress`.
 * Stored on invoices as JSON with keys: street, city, state, country, zipCode.
 */
export interface BillingAddress {
  street: string
  city: string
  state: string
  country: string
  zipCode: string
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
  subscriptionAction: SubscriptionActionValue
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

export interface ScheduledSubscriptionDowngradeDetail {
  scheduledChangeId: string
  subscriptionId: string
  scheduledPlanId: string
  previousPlanId: string
  scheduledDate: string
  billingCycle: BillingCycleValue
  autoRenew: boolean
}

export interface ScheduledDowngradeLimitAndUsage {
  planFeatureAttributeId: string
  attributeCode: string
  usageType: string
  usedCount: number
  usageLimit: number
  overageEnabled: boolean
}

export interface ScheduledSubscriptionDowngradeResponse {
  scheduledChange: ScheduledSubscriptionDowngradeDetail
  plan: PlanDetail
  limitsAndUsages: ScheduledDowngradeLimitAndUsage[]
  pricing: CartPricingPreview
}

export const ManualSubscriptionRenewalPreviewUnavailableReason = {
  SCHEDULED_PLAN_CHANGE: 'SCHEDULED_PLAN_CHANGE',
  AUTO_RENEW_ENABLED: 'AUTO_RENEW_ENABLED',
  SUBSCRIPTION_NOT_ACTIVE: 'SUBSCRIPTION_NOT_ACTIVE',
} as const

export type ManualSubscriptionRenewalPreviewUnavailableReasonValue =
  (typeof ManualSubscriptionRenewalPreviewUnavailableReason)[keyof typeof ManualSubscriptionRenewalPreviewUnavailableReason]

export interface ManualSubscriptionRenewalPreviewSubscription {
  subscriptionId: string
  planId: string
  status: string
  endDate: string
  billingCycle: BillingCycleValue
  autoRenew: boolean
}

export type ManualSubscriptionRenewalPreviewResponse =
  | {
      available: true
      subscription: ManualSubscriptionRenewalPreviewSubscription
      plan: PlanDetail
      pricing: CartPricingPreview
    }
  | {
      available: false
      reason: ManualSubscriptionRenewalPreviewUnavailableReasonValue
      message: string
    }

export interface SubscriptionHistoryListItem {
  id: string
  planId: string
  invoiceId: string | null
  planName: string | null
  invoiceNumber: string | null
  grandTotal: number | null
  createdAt: string
  startDate: string
  endDate: string
}

export interface PaginatedListResponse<TItem> {
  items: TItem[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ListSubscriptionHistoryParams {
  page?: number
  limit?: number
  startDateFrom?: string
  startDateTo?: string
  endDateFrom?: string
  endDateTo?: string
  invoiceAmountFrom?: number
  invoiceAmountTo?: number
  invoiceNumber?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export const MerchantSubscriptionOverageStatus = {
  PAID: 'PAID',
  PROCESSING: 'PROCESSING',
  FAILED: 'FAILED',
} as const

export type MerchantSubscriptionOverageStatusValue =
  (typeof MerchantSubscriptionOverageStatus)[keyof typeof MerchantSubscriptionOverageStatus]

export const OverageType = {
  SUBSCRIPTION: 'SUBSCRIPTION',
  ADDON: 'ADDON',
  RESELLER: 'RESELLER',
} as const

export type OverageTypeValue = (typeof OverageType)[keyof typeof OverageType]

export interface OverageHistoryListItem {
  id: string
  merchantId: string
  overageType: OverageTypeValue | string
  planFeatureAttributeId: string | null
  quantity: number | null
  overagePricePerUnit: number | null
  overageAmount: number
  invoiceId: string | null
  status: MerchantSubscriptionOverageStatusValue | string
  attributeCode: string | null
  attributeName: string | null
  createdAt: string
  updatedAt: string
}

export interface ListOverageHistoryParams {
  page?: number
  limit?: number
  status?: string
  overageType?: string
  invoiceId?: string
  planFeatureAttributeId?: string
  attributeCode?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ManualOveragePaymentResult {
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

export interface CancelAddonSubscriptionResult {
  message: string
  addonSubscriptionId: string
}

export interface CancelAttributeDowngradeScheduleResult {
  message: string
  currentLimits: {
    planFeatureAttributeId: string
    usageLimit: number | null
    usedCount: number
  }
}

export interface CancelMessageResult {
  message: string
}

export interface UpdateSubscriptionDatesPayload {
  startDate: string
  endDate: string
}

export interface ExtendMerchantSubscriptionEndDatePayload {
  merchantId: string
  days: number
}

export interface ExtendMerchantSubscriptionEndDateResponse {
  subscriptionId: string
  merchantId: string
  previousEndDate: string
  newEndDate: string
  message: string
}

export type SubscriptionRenewalType = 'NORMAL' | 'DOWNGRADE' | 'MIGRATION'

export type ManualRenewalOutcome = 'processed' | 'existing_invoice'

export interface ManualRenewalInvoice {
  invoiceId: string
  invoiceNumber: string
  status: 'PENDING' | 'COMPLETED' | 'PROCESSING'
  grandTotal: number
  currency: string
}

export interface ManualRenewalResponse {
  outcome: ManualRenewalOutcome
  renewalType: SubscriptionRenewalType
  message: string
  invoice: ManualRenewalInvoice
  checkoutUrl?: string
  stripeCheckoutUrl?: string
  paymentHandoff?: {
    invoiceId: string
    invoiceNumber: string
    grandTotal: number
    currency: string
    status: string
    correlationId?: string
  }
}

export interface InitiateManualRenewalPayload {
  billingAddress?: BillingAddress
}

export interface ManualRenewalFailureResponse {
  failureCode: string
  failureReason: string
  renewalType: SubscriptionRenewalType
  violatingAttributes?: Array<{
    attributeCode: string
    currentUsage: number
    targetLimit: number
  }>
}

export type ManualRenewalEligibleState = 'RENEWAL_FAILED' | 'GRACE_PERIOD' | 'CANCELLED'
