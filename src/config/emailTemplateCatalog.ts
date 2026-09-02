export type EmailTemplateCategory =
  | 'trial-lifecycle'
  | 'downgrades'
  | 'grace-renewal'
  | 'addons'
  | 'payment-success'
  | 'payment-failure'
  | 'operations'

export interface EmailTemplateCategoryMeta {
  id: EmailTemplateCategory
  label: string
  description: string
  accent: string
}

export interface EmailTemplateDefinition {
  id: string
  title: string
  description: string
  category: EmailTemplateCategory
  eventType: string
  templateId: string
  /** When true, the test UI exposes a one-click automated flow. */
  automated: boolean
}

export const EMAIL_TEMPLATE_CATEGORIES: EmailTemplateCategoryMeta[] = [
  {
    id: 'trial-lifecycle',
    label: 'Trial & lifecycle',
    description: 'Plan trial start and expiry notifications',
    accent: '#4338ca',
  },
  {
    id: 'downgrades',
    label: 'Downgrades',
    description: 'Scheduled downgrades and eligibility checks',
    accent: '#7c3aed',
  },
  {
    id: 'grace-renewal',
    label: 'Grace & renewal',
    description: 'Grace period reminders, expiry, and renewal failures',
    accent: '#d97706',
  },
  {
    id: 'addons',
    label: 'Add-ons',
    description: 'Add-on trial and cancellation emails',
    accent: '#0891b2',
  },
  {
    id: 'payment-success',
    label: 'Payment success',
    description: 'Receipts after successful checkout or renewal',
    accent: '#059669',
  },
  {
    id: 'payment-failure',
    label: 'Payment failure',
    description: 'Checkout and renewal failure notices',
    accent: '#dc2626',
  },
  {
    id: 'operations',
    label: 'Operations',
    description: 'Background jobs and admin-triggered emails',
    accent: '#64748b',
  },
]

/** All 28 subscription email templates (mirrors notifications SUBSCRIPTION_EMAIL_EVENT_MAPPERS). */
export const SUBSCRIPTION_EMAIL_TEMPLATES: EmailTemplateDefinition[] = [
  {
    id: 'trial-allocated',
    title: 'Trial allocated',
    description: 'Sent when a merchant starts a plan trial checkout successfully.',
    category: 'trial-lifecycle',
    eventType: 'subscription.trial.allocated.email',
    templateId: 'subscription/trial-allocated',
    automated: true,
  },
  {
    id: 'trial-expired',
    title: 'Trial expired',
    description: 'Sent when a plan trial period ends without conversion.',
    category: 'trial-lifecycle',
    eventType: 'subscription.trial.expired.email',
    templateId: 'subscription/trial-expired',
    automated: false,
  },
  {
    id: 'downgrade-scheduled',
    title: 'Downgrade scheduled',
    description: 'Confirms a subscription downgrade scheduled for the next billing cycle.',
    category: 'downgrades',
    eventType: 'subscription.downgrade.scheduled.email',
    templateId: 'subscription/downgrade-scheduled',
    automated: false,
  },
  {
    id: 'downgrade-cancel',
    title: 'Downgrade cancelled',
    description: 'Confirms a previously scheduled plan downgrade was cancelled.',
    category: 'downgrades',
    eventType: 'subscription.downgrade.cancel.email',
    templateId: 'subscription/downgrade-cancel',
    automated: false,
  },
  {
    id: 'attribute-downgrade-scheduled',
    title: 'Attribute downgrade scheduled',
    description: 'Notifies that an attribute limit downgrade is scheduled.',
    category: 'downgrades',
    eventType: 'subscription.attribute.downgrade.scheduled.email',
    templateId: 'subscription/attribute-downgrade-scheduled',
    automated: false,
  },
  {
    id: 'attribute-downgrade-cancel',
    title: 'Attribute downgrade cancelled',
    description: 'Confirms a scheduled attribute downgrade was cancelled.',
    category: 'downgrades',
    eventType: 'subscription.attribute.downgrade.cancel.email',
    templateId: 'subscription/attribute-downgrade-cancel',
    automated: false,
  },
  {
    id: 'scheduled-downgrade-eligibility-failed',
    title: 'Scheduled downgrade eligibility failed',
    description: 'Warns when a scheduled downgrade cannot proceed due to eligibility.',
    category: 'downgrades',
    eventType: 'subscription.scheduled.downgrade.eligibility.failed.email',
    templateId: 'subscription/scheduled-downgrade-eligibility-failed',
    automated: false,
  },
  {
    id: 'downgrade-eligibility-periodic',
    title: 'Downgrade eligibility (periodic)',
    description: 'Periodic reminder about downgrade eligibility status.',
    category: 'downgrades',
    eventType: 'subscription.downgrade.eligibility.periodic.email',
    templateId: 'subscription/downgrade-eligibility-periodic',
    automated: false,
  },
  {
    id: 'grace-period-reminder',
    title: 'Grace period reminder',
    description: 'Reminds the merchant their subscription is in a grace period.',
    category: 'grace-renewal',
    eventType: 'subscription.grace.period.reminder.email',
    templateId: 'subscription/grace-period-reminder',
    automated: false,
  },
  {
    id: 'grace-period-expired',
    title: 'Grace period expired',
    description: 'Sent when the subscription grace period ends.',
    category: 'grace-renewal',
    eventType: 'subscription.grace.period.expired.email',
    templateId: 'subscription/grace-period-expired',
    automated: false,
  },
  {
    id: 'renewal-failed',
    title: 'Renewal failed',
    description: 'Notifies that automatic subscription renewal failed.',
    category: 'grace-renewal',
    eventType: 'subscription.renewal.failed.email',
    templateId: 'subscription/renewal-failed',
    automated: false,
  },
  {
    id: 'merchant-usage-reset',
    title: 'Merchant usage reset',
    description: 'Sent after periodic merchant usage counters are reset.',
    category: 'operations',
    eventType: 'subscription.merchant.usage.reset.email',
    templateId: 'subscription/merchant-usage-reset',
    automated: false,
  },
  {
    id: 'addon-trial-allocated',
    title: 'Add-on trial allocated',
    description:
      'Sent when an add-on trial is activated during plan trial. Creates a Growth plan with trial-enabled add-ons, starts plan trial, then checks out add-on trial.',
    category: 'addons',
    eventType: 'subscription.addon.trial.allocated.email',
    templateId: 'subscription/addon-trial-allocated',
    automated: true,
  },
  {
    id: 'addon-trial-expired',
    title: 'Add-on trial expired',
    description: 'Sent when an add-on trial period ends.',
    category: 'addons',
    eventType: 'subscription.addon.trial.expired.email',
    templateId: 'subscription/addon-trial-expired',
    automated: false,
  },
  {
    id: 'addon-subscription-cancel',
    title: 'Add-on cancelled',
    description: 'Confirms an add-on subscription was cancelled.',
    category: 'addons',
    eventType: 'subscription.addon.cancel.email',
    templateId: 'subscription/addon-subscription-cancel',
    automated: false,
  },
  {
    id: 'payment-success-subscription-purchase',
    title: 'Payment success — plan purchase',
    description:
      'Receipt after a new paid plan subscription is purchased. Creates a plan, checks out, and opens the payment page for manual completion.',
    category: 'payment-success',
    eventType: 'subscription.payment.success.subscription.purchase.email',
    templateId: 'subscription/payment-success-subscription-purchase',
    automated: true,
  },
  {
    id: 'payment-success-subscription-upgrade',
    title: 'Payment success — plan upgrade',
    description:
      'Receipt after upgrading to a higher plan tier. Requires an active paid subscription from the plan purchase test first, then creates Nitro Enterprise and opens upgrade checkout.',
    category: 'payment-success',
    eventType: 'subscription.payment.success.subscription.upgrade.email',
    templateId: 'subscription/payment-success-subscription-upgrade',
    automated: true,
  },
  {
    id: 'payment-success-addon-purchase',
    title: 'Payment success — add-on purchase',
    description:
      'Receipt after purchasing a paid add-on. Creates a Growth plan with add-ons, opens plan checkout, then continues to add-on checkout after you confirm plan payment.',
    category: 'payment-success',
    eventType: 'subscription.payment.success.addon.purchase.email',
    templateId: 'subscription/payment-success-addon-purchase',
    automated: true,
  },
  {
    id: 'payment-success-attribute-upgrade',
    title: 'Payment success — attribute upgrade',
    description: 'Receipt after upgrading attribute limits.',
    category: 'payment-success',
    eventType: 'subscription.payment.success.attribute.upgrade.email',
    templateId: 'subscription/payment-success-attribute-upgrade',
    automated: false,
  },
  {
    id: 'payment-success-short-term-attribute-upgrade',
    title: 'Payment success — short-term attribute upgrade',
    description: 'Receipt after a short-term monthly attribute limit upgrade is purchased.',
    category: 'payment-success',
    eventType: 'subscription.payment.success.short.term.attribute.upgrade.email',
    templateId: 'subscription/payment-success-short-term-attribute-upgrade',
    automated: false,
  },
  {
    id: 'short-term-attribute-purchase-reverted',
    title: 'Short-term attribute purchase reverted',
    description: 'Sent when a short-term attribute upgrade ends at renewal or monthly usage reset.',
    category: 'operations',
    eventType: 'subscription.short.term.attribute.purchase.reverted.email',
    templateId: 'subscription/short-term-attribute-purchase-reverted',
    automated: false,
  },
  {
    id: 'payment-success-overage-payment',
    title: 'Payment success — overage',
    description: 'Receipt after an overage charge is paid.',
    category: 'payment-success',
    eventType: 'subscription.payment.success.overage.payment.email',
    templateId: 'subscription/payment-success-overage-payment',
    automated: false,
  },
  {
    id: 'payment-success-subscription-renewal',
    title: 'Payment success — renewal',
    description: 'Receipt after a subscription renewal payment succeeds.',
    category: 'payment-success',
    eventType: 'subscription.payment.success.subscription.renewal.email',
    templateId: 'subscription/payment-success-subscription-renewal',
    automated: false,
  },
  {
    id: 'payment-success-subscription-downgrade',
    title: 'Payment success — downgrade',
    description: 'Receipt after a downgrade-related payment completes.',
    category: 'payment-success',
    eventType: 'subscription.payment.success.subscription.downgrade.email',
    templateId: 'subscription/payment-success-subscription-downgrade',
    automated: false,
  },
  {
    id: 'payment-failure-checkout',
    title: 'Payment failure — checkout',
    description: 'Sent when initial checkout payment fails.',
    category: 'payment-failure',
    eventType: 'subscription.payment.failure.checkout.email',
    templateId: 'subscription/payment-failure-checkout',
    automated: false,
  },
  {
    id: 'payment-failure-subscription-downgrade',
    title: 'Payment failure — downgrade',
    description: 'Sent when a downgrade-related payment fails.',
    category: 'payment-failure',
    eventType: 'subscription.payment.failure.subscription.downgrade.email',
    templateId: 'subscription/payment-failure-subscription-downgrade',
    automated: false,
  },
  {
    id: 'payment-failure-overage-payment',
    title: 'Payment failure — overage',
    description: 'Sent when an overage payment attempt fails.',
    category: 'payment-failure',
    eventType: 'subscription.payment.failure.overage.payment.email',
    templateId: 'subscription/payment-failure-overage-payment',
    automated: false,
  },
]

export function getEmailTemplateCategoryMeta(
  categoryId: EmailTemplateCategory,
): EmailTemplateCategoryMeta {
  return (
    EMAIL_TEMPLATE_CATEGORIES.find((category) => category.id === categoryId) ??
    EMAIL_TEMPLATE_CATEGORIES[0]
  )
}
