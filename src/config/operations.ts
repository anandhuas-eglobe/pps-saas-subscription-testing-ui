import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import ListAltIcon from '@mui/icons-material/ListAlt'
import CategoryIcon from '@mui/icons-material/Category'
import StorefrontIcon from '@mui/icons-material/Storefront'
import ExtensionIcon from '@mui/icons-material/Extension'
import TuneIcon from '@mui/icons-material/Tune'
import VerifiedIcon from '@mui/icons-material/Verified'
import PaymentIcon from '@mui/icons-material/Payment'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import TimelineIcon from '@mui/icons-material/Timeline'
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
    description: 'View subscription status, INCLUDED attribute usage, plan details, and purchased add-ons.',
    path: '/merchant/subscription',
    icon: VerifiedIcon,
    apiEndpoint: 'GET /api/v1/merchant/subscription/active · GET /api/v1/merchant/subscription/active-plan/addons',
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
    title: 'Confirm Payment',
    description: 'Publish payment success to the Redis stream from the Vite dev server, or copy the docker exec command as a fallback.',
    path: '/dev/payment-confirm',
    icon: PaymentIcon,
    apiEndpoint: 'Vite dev /dev-tools/redis/publish',
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
