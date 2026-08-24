import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { RequireAuth } from './components/auth/RequireAuth'
import { AppLayout } from './components/layout/AppLayout'
import { PublicPageShell } from './components/layout/PublicPageShell'
import { ActiveSubscriptionPage } from './pages/ActiveSubscriptionPage'
import { CreatePlanPage } from './pages/CreatePlanPage'
import { EditPlanPage } from './pages/EditPlanPage'
import { HomePage } from './pages/HomePage'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'
import { InvoiceListPage } from './pages/InvoiceListPage'
import { ListPlansPage } from './pages/ListPlansPage'
import { LoginPage } from './pages/LoginPage'
import { MerchantAddonsPage } from './pages/MerchantAddonsPage'
import { MerchantAttributeChangesPage } from './pages/MerchantAttributeChangesPage'
import { MerchantPlansPage } from './pages/MerchantPlansPage'
import { PaymentConfirmationPage } from './pages/PaymentConfirmationPage'
import { ResellerOveragePublishPage } from './pages/ResellerOveragePublishPage'
import { PlanDetailPage } from './pages/PlanDetailPage'
import { UsageSimulationPage } from './pages/UsageSimulationPage'
import { CleanupPendingInvoicesPage } from './pages/CleanupPendingInvoicesPage'
import { ExtendSubscriptionEndDatePage } from './pages/ExtendSubscriptionEndDatePage'
import { MerchantGuestPlansPage } from './pages/MerchantGuestPlansPage'
import { NitroTestPage } from './pages/NitroTestPage'
import { MerchantRegistrationPage } from './pages/MerchantRegistrationPage'
import { MerchantSignupPage } from './pages/MerchantSignupPage'
import { MerchantOveragePage } from './pages/MerchantOveragePage'
import { OverageTestingPage } from './pages/OverageTestingPage'
import { SubscriptionRenewalTestingPage } from './pages/SubscriptionRenewalTestingPage'
import { EmailTemplatesTestingPage } from './pages/EmailTemplatesTestingPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { SavedCardsPage } from './pages/SavedCardsPage'
import { AdminCouponsPage } from './pages/AdminCouponsPage'
import { CreateCouponPage, EditCouponPage } from './pages/CouponEditorPage'
import { CouponDetailPage } from './pages/CouponDetailPage'
import { AdminDiscountPrivilegesPage } from './pages/AdminDiscountPrivilegesPage'
import { CreateDiscountPrivilegePage, EditDiscountPrivilegePage } from './pages/PrivilegeEditorPage'
import { DiscountPrivilegeDetailPage } from './pages/DiscountPrivilegeDetailPage'
import { MerchantCommercialPage } from './pages/MerchantCommercialPage'
import { NotificationProvider } from './notifications/NotificationContext'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/merchant/signup',
    element: (
      <PublicPageShell>
        <MerchantSignupPage />
      </PublicPageShell>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicPageShell>
        <MerchantRegistrationPage />
      </PublicPageShell>
    ),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: (
          <NotificationProvider>
            <AppLayout />
          </NotificationProvider>
        ),
        children: [
          { index: true, element: <HomePage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'nitro-test', element: <NitroTestPage /> },
          { path: 'plans/create', element: <CreatePlanPage /> },
          { path: 'plans/:planId/edit', element: <EditPlanPage /> },
          { path: 'plans/:planId', element: <PlanDetailPage /> },
          { path: 'plans', element: <ListPlansPage /> },
          { path: 'merchant/plans', element: <MerchantPlansPage /> },
          { path: 'merchant/addons', element: <MerchantAddonsPage /> },
          { path: 'merchant/attributes', element: <MerchantAttributeChangesPage /> },
          { path: 'merchant/subscription', element: <ActiveSubscriptionPage /> },
          { path: 'merchant/renewal-testing', element: <SubscriptionRenewalTestingPage /> },
          { path: 'merchant/overage', element: <MerchantOveragePage /> },
          { path: 'merchant/overage-testing', element: <OverageTestingPage /> },
          { path: 'merchant/guest-plans', element: <MerchantGuestPlansPage /> },
          { path: 'merchant/usage-simulation', element: <UsageSimulationPage /> },
          { path: 'admin/extend-subscription', element: <ExtendSubscriptionEndDatePage /> },
          { path: 'admin/coupons/create', element: <CreateCouponPage /> },
          { path: 'admin/coupons/:couponId/edit', element: <EditCouponPage /> },
          { path: 'admin/coupons/:couponId', element: <CouponDetailPage /> },
          { path: 'admin/coupons', element: <AdminCouponsPage /> },
          { path: 'admin/discount-privileges/create', element: <CreateDiscountPrivilegePage /> },
          { path: 'admin/discount-privileges/:privilegeId/edit', element: <EditDiscountPrivilegePage /> },
          { path: 'admin/discount-privileges/:privilegeId', element: <DiscountPrivilegeDetailPage /> },
          { path: 'admin/discount-privileges', element: <AdminDiscountPrivilegesPage /> },
          { path: 'merchant/commercial', element: <MerchantCommercialPage /> },
          { path: 'merchant/invoices/:invoiceId', element: <InvoiceDetailPage /> },
          { path: 'merchant/invoices', element: <InvoiceListPage /> },
          { path: 'merchant/cards', element: <SavedCardsPage /> },
          { path: 'dev/payment-confirm', element: <PaymentConfirmationPage /> },
          { path: 'dev/cleanup-pending-invoices', element: <CleanupPendingInvoicesPage /> },
          { path: 'dev/reseller-overage', element: <ResellerOveragePublishPage /> },
          { path: 'dev/email-templates', element: <EmailTemplatesTestingPage /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
