export const CouponUsageType = {
  SINGLE_USE: 'SINGLE_USE',
  MULTIPLE_USE: 'MULTIPLE_USE',
  UNLIMITED: 'UNLIMITED',
} as const

export type CouponUsageTypeValue = (typeof CouponUsageType)[keyof typeof CouponUsageType]

export const CouponApplicableOn = {
  FIRST_PURCHASE: 'FIRST_PURCHASE',
  RENEWAL: 'RENEWAL',
  BOTH: 'BOTH',
} as const

export type CouponApplicableOnValue = (typeof CouponApplicableOn)[keyof typeof CouponApplicableOn]

export const CouponStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  EXPIRED: 'EXPIRED',
} as const

export type CouponStatusValue = (typeof CouponStatus)[keyof typeof CouponStatus]

export const CouponBenefitType = {
  PERCENTAGE_DISCOUNT: 'PERCENTAGE_DISCOUNT',
  FIXED_DISCOUNT: 'FIXED_DISCOUNT',
  FREE_ADDON: 'FREE_ADDON',
  FREE_ENTITLEMENT: 'FREE_ENTITLEMENT',
  FREE_TRIAL_DAYS: 'FREE_TRIAL_DAYS',
} as const

export type CouponBenefitTypeValue = (typeof CouponBenefitType)[keyof typeof CouponBenefitType]

export const BillingCycle = {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
} as const

export type BillingCycleValue = (typeof BillingCycle)[keyof typeof BillingCycle]

export const DiscountPrivilegeStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  EXPIRED: 'EXPIRED',
} as const

export type DiscountPrivilegeStatusValue =
  (typeof DiscountPrivilegeStatus)[keyof typeof DiscountPrivilegeStatus]

export const DiscountPrivilegeBenefitType = {
  PERCENTAGE_DISCOUNT: 'PERCENTAGE_DISCOUNT',
  FIXED_DISCOUNT: 'FIXED_DISCOUNT',
} as const

export type DiscountPrivilegeBenefitTypeValue =
  (typeof DiscountPrivilegeBenefitType)[keyof typeof DiscountPrivilegeBenefitType]

export const CommercialPreviewEvent = {
  FIRST_PURCHASE: 'FIRST_PURCHASE',
  RENEWAL: 'RENEWAL',
} as const

export type CommercialPreviewEventValue =
  (typeof CommercialPreviewEvent)[keyof typeof CommercialPreviewEvent]

export const COUPON_SORT_FIELDS = ['createdAt', 'code', 'name', 'status', 'validFrom'] as const
export const PRIVILEGE_SORT_FIELDS = ['createdAt', 'code', 'name', 'status', 'validFrom'] as const

export interface CommercialPagination {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface CouponBenefitPayload {
  benefitType: CouponBenefitTypeValue
  entitlementId?: string | null
  addonReference?: string | null
  value?: number | null
  maximumDiscountAmount?: number | null
}

export interface CouponRestrictionPayload {
  planId?: string | null
  billingCycle?: BillingCycleValue | null
}

export interface CreateCouponPayload {
  code: string
  name: string
  description?: string | null
  usageType: CouponUsageTypeValue
  maximumUses?: number | null
  maximumUsesPerMerchant?: number
  isAutoApply: boolean
  validFrom: string
  validTo?: string | null
  applicableOn: CouponApplicableOnValue
  status?: CouponStatusValue
  stackable: boolean
  benefits: CouponBenefitPayload[]
  restrictions?: CouponRestrictionPayload[]
}

export type UpdateCouponPayload = CreateCouponPayload

export interface CouponBenefitRead extends CouponBenefitPayload {
  id: string
}

export interface CouponRestrictionRead extends CouponRestrictionPayload {
  id: string
}

export interface CouponRead {
  id: string
  code: string
  name: string
  description?: string | null
  usageType: CouponUsageTypeValue
  maximumUses?: number | null
  maximumUsesPerMerchant?: number
  isAutoApply: boolean
  validFrom: string
  validTo?: string | null
  applicableOn: CouponApplicableOnValue
  status: CouponStatusValue
  stackable: boolean
  createdAt: string
  updatedAt: string
  redemptionCount: number
  benefits: CouponBenefitRead[]
  restrictions: CouponRestrictionRead[]
}

export interface ListCouponsParams {
  page?: number
  limit?: number
  search?: string
  status?: CouponStatusValue
  isAutoApply?: boolean
  applicableOn?: CouponApplicableOnValue
  sortBy?: (typeof COUPON_SORT_FIELDS)[number]
  sortOrder?: 'asc' | 'desc'
}

export interface ListCouponsResponse {
  coupons: CouponRead[]
  pagination: CommercialPagination
}

export interface CouponRedemptionRead {
  id: string
  couponId: string
  merchantId: string
  subscriptionId: string | null
  invoiceId: string | null
  appliedValue: number
  usedAt: string
}

export interface ListCouponRedemptionsResponse {
  redemptions: CouponRedemptionRead[]
  pagination: CommercialPagination
}

export interface PrivilegeBenefitPayload {
  benefitType: DiscountPrivilegeBenefitTypeValue
  value: number
  maximumDiscountAmount?: number | null
}

export interface CreateDiscountPrivilegePayload {
  code: string
  name: string
  description?: string | null
  status?: DiscountPrivilegeStatusValue
  validFrom: string
  validTo?: string | null
  stackable: boolean
  benefits: PrivilegeBenefitPayload[]
}

export type UpdateDiscountPrivilegePayload = CreateDiscountPrivilegePayload

export interface PrivilegeBenefitRead extends PrivilegeBenefitPayload {
  id: string
}

export interface PrivilegeRead {
  id: string
  code: string
  name: string
  description?: string | null
  status: DiscountPrivilegeStatusValue
  validFrom: string
  validTo?: string | null
  stackable: boolean
  createdAt: string
  updatedAt: string
  assignmentCount: number
  benefits: PrivilegeBenefitRead[]
}

export interface ListDiscountPrivilegesParams {
  page?: number
  limit?: number
  search?: string
  status?: DiscountPrivilegeStatusValue
  sortBy?: (typeof PRIVILEGE_SORT_FIELDS)[number]
  sortOrder?: 'asc' | 'desc'
}

export interface ListDiscountPrivilegesResponse {
  privileges: PrivilegeRead[]
  pagination: CommercialPagination
}

export interface PrivilegeAssignmentRead {
  id: string
  privilegeId: string
  merchantId: string
  assignedAt: string
  assignedBy: string | null
}

export interface ListPrivilegeAssignmentsResponse {
  assignments: PrivilegeAssignmentRead[]
}

export interface MerchantOfferBenefit {
  benefitType: string
  value: number | null
  maximumDiscountAmount: number | null
}

export interface MerchantOfferCoupon {
  id: string
  code: string
  name: string
  description: string | null
  applicableOn: CouponApplicableOnValue
  validFrom: string
  validTo: string | null
  stackable: boolean
  benefits: MerchantOfferBenefit[]
}

export interface MerchantOfferPrivilege {
  id: string
  code: string
  name: string
  description: string | null
  stackable: boolean
  validFrom: string
  validTo: string | null
  benefits: MerchantOfferBenefit[]
}

export interface MerchantCommercialOffersResponse {
  coupons: MerchantOfferCoupon[]
  privileges: MerchantOfferPrivilege[]
}

export interface PreviewCouponPayload {
  couponCode: string
  subtotal: number
  event?: CommercialPreviewEventValue
  planId?: string
  billingCycle?: BillingCycleValue
}

export interface AppliedCommercialDiscount {
  sourceType: 'COUPON' | 'PRIVILEGE'
  sourceId: string
  amount: number
}

export interface PreviewCouponResponse {
  coupon: {
    id: string
    code: string
    name: string
    description: string | null
    applicableOn: CouponApplicableOnValue
    stackable: boolean
    isAutoApply: boolean
    benefits: MerchantOfferBenefit[]
  }
  eligible: boolean
  reason: string | null
  subtotal: number
  discountTotal: number
  payableTotal: number
  applied: AppliedCommercialDiscount[]
}

export interface CouponBenefitFormState {
  benefitType: CouponBenefitTypeValue
  entitlementId: string
  addonReference: string
  value: string
  maximumDiscountAmount: string
}

export interface CouponRestrictionFormState {
  planId: string
  billingCycle: BillingCycleValue | ''
}

export interface CouponFormState {
  code: string
  name: string
  description: string
  usageType: CouponUsageTypeValue
  maximumUses: string
  maximumUsesPerMerchant: string
  isAutoApply: boolean
  validFrom: string
  validTo: string
  applicableOn: CouponApplicableOnValue
  status: CouponStatusValue
  stackable: boolean
  benefits: CouponBenefitFormState[]
  restrictions: CouponRestrictionFormState[]
}

export interface PrivilegeBenefitFormState {
  benefitType: DiscountPrivilegeBenefitTypeValue
  value: string
  maximumDiscountAmount: string
}

export interface PrivilegeFormState {
  code: string
  name: string
  description: string
  status: DiscountPrivilegeStatusValue
  validFrom: string
  validTo: string
  stackable: boolean
  benefits: PrivilegeBenefitFormState[]
}
