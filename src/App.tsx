import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ActiveSubscriptionPage } from './pages/ActiveSubscriptionPage'
import { CreatePlanPage } from './pages/CreatePlanPage'
import { EditPlanPage } from './pages/EditPlanPage'
import { HomePage } from './pages/HomePage'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'
import { InvoiceListPage } from './pages/InvoiceListPage'
import { ListPlansPage } from './pages/ListPlansPage'
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
import { MerchantOveragePage } from './pages/MerchantOveragePage'
import { OverageTestingPage } from './pages/OverageTestingPage'
import { SubscriptionRenewalTestingPage } from './pages/SubscriptionRenewalTestingPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
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
      { path: 'merchant/invoices/:invoiceId', element: <InvoiceDetailPage /> },
      { path: 'merchant/invoices', element: <InvoiceListPage /> },
      { path: 'dev/payment-confirm', element: <PaymentConfirmationPage /> },
      { path: 'dev/cleanup-pending-invoices', element: <CleanupPendingInvoicesPage /> },
      { path: 'dev/reseller-overage', element: <ResellerOveragePublishPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
