import {
  CouponApplicableOn,
  CouponBenefitType,
  CouponStatus,
  CouponUsageType,
  DiscountPrivilegeBenefitType,
  DiscountPrivilegeStatus,
  type CouponBenefitFormState,
  type CouponFormState,
  type CouponRead,
  type CouponRestrictionFormState,
  type CreateCouponPayload,
  type CreateDiscountPrivilegePayload,
  type PrivilegeFormState,
  type PrivilegeRead,
} from '../types/commercial'

export function commercialStatusColor(
  status: string,
): 'success' | 'warning' | 'error' | 'default' {
  switch (status.toUpperCase()) {
    case CouponStatus.ACTIVE:
      return 'success'
    case CouponStatus.INACTIVE:
      return 'warning'
    case CouponStatus.EXPIRED:
      return 'error'
    default:
      return 'default'
  }
}

export function toDatetimeLocalValue(value: string | Date | null | undefined): string {
  if (!value) {
    return ''
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function nowDatetimeLocal(): string {
  return toDatetimeLocalValue(new Date())
}

export function fromDatetimeLocalValue(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }
  return date.toISOString()
}

function optionalNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function createEmptyCouponBenefit(): CouponBenefitFormState {
  return {
    benefitType: CouponBenefitType.PERCENTAGE_DISCOUNT,
    entitlementId: '',
    addonReference: '',
    value: '10',
    maximumDiscountAmount: '',
  }
}

export function createEmptyCouponRestriction(): CouponRestrictionFormState {
  return {
    planId: '',
    billingCycle: '',
  }
}

export function createDefaultCouponForm(): CouponFormState {
  return {
    code: '',
    name: '',
    description: '',
    usageType: CouponUsageType.UNLIMITED,
    maximumUses: '',
    maximumUsesPerMerchant: '1',
    isAutoApply: false,
    validFrom: nowDatetimeLocal(),
    validTo: '',
    applicableOn: CouponApplicableOn.BOTH,
    status: CouponStatus.ACTIVE,
    stackable: false,
    benefits: [createEmptyCouponBenefit()],
    restrictions: [],
  }
}

export function couponToFormState(coupon: CouponRead): CouponFormState {
  return {
    code: coupon.code,
    name: coupon.name,
    description: coupon.description ?? '',
    usageType: coupon.usageType,
    maximumUses: coupon.maximumUses != null ? String(coupon.maximumUses) : '',
    maximumUsesPerMerchant:
      coupon.maximumUsesPerMerchant != null ? String(coupon.maximumUsesPerMerchant) : '1',
    isAutoApply: coupon.isAutoApply,
    validFrom: toDatetimeLocalValue(coupon.validFrom),
    validTo: toDatetimeLocalValue(coupon.validTo),
    applicableOn: coupon.applicableOn,
    status: coupon.status,
    stackable: coupon.stackable,
    benefits:
      coupon.benefits.length > 0
        ? coupon.benefits.map((benefit) => ({
            benefitType: benefit.benefitType,
            entitlementId: benefit.entitlementId ?? '',
            addonReference: benefit.addonReference ?? '',
            value: benefit.value != null ? String(benefit.value) : '',
            maximumDiscountAmount:
              benefit.maximumDiscountAmount != null ? String(benefit.maximumDiscountAmount) : '',
          }))
        : [createEmptyCouponBenefit()],
    restrictions: coupon.restrictions.map((restriction) => ({
      planId: restriction.planId ?? '',
      billingCycle: restriction.billingCycle ?? '',
    })),
  }
}

export function buildCouponPayload(form: CouponFormState): CreateCouponPayload {
  const validFrom = fromDatetimeLocalValue(form.validFrom)
  if (!form.code.trim()) {
    throw new Error('Coupon code is required.')
  }
  if (!form.name.trim()) {
    throw new Error('Coupon name is required.')
  }
  if (!validFrom) {
    throw new Error('Valid from is required.')
  }
  if (form.benefits.length === 0) {
    throw new Error('At least one benefit is required.')
  }

  const restrictions = form.restrictions
    .map((restriction) => ({
      planId: restriction.planId.trim() || undefined,
      billingCycle: restriction.billingCycle || undefined,
    }))
    .filter((restriction) => restriction.planId || restriction.billingCycle)

  return {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    usageType: form.usageType,
    maximumUses: optionalNumber(form.maximumUses),
    maximumUsesPerMerchant: optionalNumber(form.maximumUsesPerMerchant),
    isAutoApply: form.isAutoApply,
    validFrom,
    validTo: fromDatetimeLocalValue(form.validTo),
    applicableOn: form.applicableOn,
    status: form.status,
    stackable: form.stackable,
    benefits: form.benefits.map((benefit) => ({
      benefitType: benefit.benefitType,
      entitlementId: benefit.entitlementId.trim() || undefined,
      addonReference: benefit.addonReference.trim() || undefined,
      value: optionalNumber(benefit.value),
      maximumDiscountAmount: optionalNumber(benefit.maximumDiscountAmount),
    })),
    restrictions: restrictions.length > 0 ? restrictions : undefined,
  }
}

export function createEmptyPrivilegeBenefit() {
  return {
    benefitType: DiscountPrivilegeBenefitType.PERCENTAGE_DISCOUNT,
    value: '15',
    maximumDiscountAmount: '',
  }
}

export function createDefaultPrivilegeForm(): PrivilegeFormState {
  return {
    code: '',
    name: '',
    description: '',
    status: DiscountPrivilegeStatus.ACTIVE,
    validFrom: nowDatetimeLocal(),
    validTo: '',
    stackable: false,
    benefits: [createEmptyPrivilegeBenefit()],
  }
}

export function privilegeToFormState(privilege: PrivilegeRead): PrivilegeFormState {
  return {
    code: privilege.code,
    name: privilege.name,
    description: privilege.description ?? '',
    status: privilege.status,
    validFrom: toDatetimeLocalValue(privilege.validFrom),
    validTo: toDatetimeLocalValue(privilege.validTo),
    stackable: privilege.stackable,
    benefits:
      privilege.benefits.length > 0
        ? privilege.benefits.map((benefit) => ({
            benefitType: benefit.benefitType,
            value: String(benefit.value),
            maximumDiscountAmount:
              benefit.maximumDiscountAmount != null ? String(benefit.maximumDiscountAmount) : '',
          }))
        : [createEmptyPrivilegeBenefit()],
  }
}

export function buildPrivilegePayload(form: PrivilegeFormState): CreateDiscountPrivilegePayload {
  const validFrom = fromDatetimeLocalValue(form.validFrom)
  if (!form.code.trim()) {
    throw new Error('Privilege code is required.')
  }
  if (!form.name.trim()) {
    throw new Error('Privilege name is required.')
  }
  if (!validFrom) {
    throw new Error('Valid from is required.')
  }
  if (form.benefits.length === 0) {
    throw new Error('At least one benefit is required.')
  }

  return {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    status: form.status,
    validFrom,
    validTo: fromDatetimeLocalValue(form.validTo),
    stackable: form.stackable,
    benefits: form.benefits.map((benefit) => {
      const value = optionalNumber(benefit.value)
      if (value == null) {
        throw new Error('Each privilege benefit requires a value.')
      }
      return {
        benefitType: benefit.benefitType,
        value,
        maximumDiscountAmount: optionalNumber(benefit.maximumDiscountAmount),
      }
    }),
  }
}
