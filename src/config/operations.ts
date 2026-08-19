import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import ListAltIcon from '@mui/icons-material/ListAlt'
import CategoryIcon from '@mui/icons-material/Category'
import StorefrontIcon from '@mui/icons-material/Storefront'
import ExtensionIcon from '@mui/icons-material/Extension'
import TuneIcon from '@mui/icons-material/Tune'
import VerifiedIcon from '@mui/icons-material/Verified'
import CleaningServicesIcon from '@mui/icons-material/CleaningServices'
import PaymentIcon from '@mui/icons-material/Payment'
import LocalMallIcon from '@mui/icons-material/LocalMall'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import TimelineIcon from '@mui/icons-material/Timeline'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import PublicIcon from '@mui/icons-material/Public'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import BoltIcon from '@mui/icons-material/Bolt'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import type { SvgIconComponent } from '@mui/icons-material'

export interface OperationLink {
  title: string
  description: string
  path: string
  icon: SvgIconComponent
  apiEndpoint: string
  available: boolean
}

export const operations: OperationLink[] = [
  {
    title: 'Nitro Test',
    description: 'High-speed testing — one-click plan creation with required attributes, addons, and mixed feature pricing.',
    path: '/nitro-test',
    icon: BoltIcon,
    apiEndpoint: 'POST /api/v1/admin/plans/create-plan',
    available: true,
  },
  {
    title: 'Create Plan',
    description: 'Build a new subscription plan with features, pricing, trial settings, and overage rules.',
    path: '/plans/create',
    icon: AddCircleOutlineOutlinedIcon,
    apiEndpoint: 'POST /api/v1/admin/plans/create-plan',
    available: true,
  },
  {
    title: 'List Plans',
    description: 'Browse, filter, and inspect existing plans. Activate draft plans or view full plan details.',
    path: '/plans',
    icon: ListAltIcon,
    apiEndpoint: 'GET /api/v1/admin/plans',
    available: true,
  },
  {
    title: 'Merchant Plans',
    description: 'Browse plans as a merchant, configure limits and volume tiers, and add the selection to the cart.',
    path: '/merchant/plans',
    icon: StorefrontIcon,
    apiEndpoint: 'GET /api/v1/merchant/subscription/plans',
    available: true,
  },
  {
    title: 'Active Subscription',
    description: 'View subscription status, manage renewals/downgrades, billing history, and purchased add-ons.',
    path: '/merchant/subscription',
    icon: VerifiedIcon,
    apiEndpoint:
      'GET /active · GET /renewal/preview · POST /renew · PUT /auto-renew/cancel',
    available: true,
  },
  {
    title: 'Overage Testing',
    description:
      'Full overage workspace — usage generation, bulk overage, auto-charge thresholds, manual payment, reseller Redis events, and scenario playbook.',
    path: '/merchant/overage-testing',
    icon: WarningAmberIcon,
    apiEndpoint: 'usage-tracking · overage-tracking · Redis reseller stream',
    available: true,
  },
  {
    title: 'Overage History',
    description: 'Browse overage billing records and initiate manual overage payment checkout.',
    path: '/merchant/overage',
    icon: WarningAmberIcon,
    apiEndpoint: 'GET /api/v1/merchant/overage-tracking · POST manual-payment',
    available: true,
  },
  {
    title: 'Guest Plans',
    description: 'Public catalog of active subscription plans (no merchant context required).',
    path: '/merchant/guest-plans',
    icon: PublicIcon,
    apiEndpoint: 'GET /api/v1/merchant/subscription/guest-plans',
    available: true,
  },
  {
    title: 'Usage Simulation',
    description: 'Simulate the merchant usage tracking flow: validate, log, confirm, and remove usage against your active subscription.',
    path: '/merchant/usage-simulation',
    icon: TimelineIcon,
    apiEndpoint: 'GET/POST/PUT/DELETE /api/v1/merchant/usage-tracking/*',
    available: true,
  },
  {
    title: 'Plan Add-ons',
    description: 'Browse add-ons on your active plan, configure limits or trials, add to cart, and complete payment. Purchased add-ons appear on the active subscription page.',
    path: '/merchant/addons',
    icon: ExtensionIcon,
    apiEndpoint: 'GET /api/v1/merchant/subscription/active-plan/addons · POST /api/v1/merchant/cart/addon',
    available: true,
  },
  {
    title: 'Attribute Changes',
    description: 'View included and add-on attributes on your plan, change limits, upsert the attribute cart, preview pricing, and complete checkout.',
    path: '/merchant/attributes',
    icon: TuneIcon,
    apiEndpoint: 'POST /api/v1/merchant/subscription/attribute/purchase',
    available: true,
  },
  {
    title: 'Invoices',
    description: 'Browse merchant invoices, filter by status or date, and open an invoice to inspect line items and receipt details.',
    path: '/merchant/invoices',
    icon: ReceiptLongIcon,
    apiEndpoint: 'GET /api/v1/merchant/subscription/invoices',
    available: true,
  },
  {
    title: 'Saved Cards',
    description: 'List, save, set default, and delete merchant saved Stripe cards via the payment microservice.',
    path: '/merchant/cards',
    icon: CreditCardIcon,
    apiEndpoint: 'GET · POST · PUT /default · DELETE /api/v1/cards',
    available: true,
  },
  {
    title: 'Renewal Testing',
    description:
      'Test auto-renew scheduler flows, manual renewal preview, POST /renew recovery checkout, and all renewal scenarios.',
    path: '/merchant/renewal-testing',
    icon: AutorenewIcon,
    apiEndpoint:
      'GET /renewal/preview · POST /renew · PUT /auto-renew/cancel · Scheduler',
    available: true,
  },
  {
    title: 'Extend Subscription',
    description: 'Admin tool to add days to a merchant active subscription end date for testing renewals.',
    path: '/admin/extend-subscription',
    icon: EventAvailableIcon,
    apiEndpoint: 'POST /api/v1/admin/plans/merchant/extend-subscription-end-date',
    available: true,
  },
  {
    title: 'Confirm Payment',
    description: 'Publish payment success to the Redis stream from the Vite dev server, or copy the docker exec command as a fallback.',
    path: '/dev/payment-confirm',
    icon: PaymentIcon,
    apiEndpoint: 'Vite dev /dev-tools/redis/publish',
    available: true,
  },
  {
    title: 'Cleanup Pending Invoices',
    description: 'Publish CleanupPendingInvoicesRequested to payment.pending.invoice.cleanup.requested for the subscription pending invoice cleanup consumer.',
    path: '/dev/cleanup-pending-invoices',
    icon: CleaningServicesIcon,
    apiEndpoint: 'Redis stream payment.pending.invoice.cleanup.requested',
    available: true,
  },
  {
    title: 'Reseller Overage',
    description: 'Publish a ResellerOverageRequested event to order.reseller.overage.requested for the subscription reseller overage consumer.',
    path: '/dev/reseller-overage',
    icon: LocalMallIcon,
    apiEndpoint: 'Redis stream order.reseller.overage.requested',
    available: true,
  },
  {
    title: 'Email Templates',
    description:
      'One-click flows to trigger subscription notification emails — trial allocation, and more as they are added.',
    path: '/dev/email-templates',
    icon: EmailOutlinedIcon,
    apiEndpoint: 'Plan lifecycle + subscription.trial.allocated.email',
    available: true,
  },
  {
    title: 'Notifications',
    description:
      'Inbox from the notifications microservice — live socket push, desktop alerts, and a full listing with read/unread filters.',
    path: '/notifications',
    icon: NotificationsActiveIcon,
    apiEndpoint: 'GET /api/v1/notifications · WS notification:new',
    available: true,
  },
  {
    title: 'Feature Catalog',
    description: 'View all available features and attributes used when configuring subscription plans.',
    path: '/features',
    icon: CategoryIcon,
    apiEndpoint: 'GET /api/v1/features',
    available: false,
  },
]
