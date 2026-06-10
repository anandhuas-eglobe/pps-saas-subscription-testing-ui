import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ActiveSubscriptionPage } from './pages/ActiveSubscriptionPage'
import { CreatePlanPage } from './pages/CreatePlanPage'
import { HomePage } from './pages/HomePage'
import { ListPlansPage } from './pages/ListPlansPage'
import { MerchantAttributeChangesPage } from './pages/MerchantAttributeChangesPage'
import { MerchantAddonsPage } from './pages/MerchantAddonsPage'
import { MerchantPlansPage } from './pages/MerchantPlansPage'
import { PlanDetailPage } from './pages/PlanDetailPage'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'
import { InvoiceListPage } from './pages/InvoiceListPage'
import { PaymentConfirmationPage } from './pages/PaymentConfirmationPage'

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/plans/create" element={<CreatePlanPage />} />
          <Route path="/plans/:planId" element={<PlanDetailPage />} />
          <Route path="/plans" element={<ListPlansPage />} />
          <Route path="/merchant/plans" element={<MerchantPlansPage />} />
          <Route path="/merchant/addons" element={<MerchantAddonsPage />} />
          <Route path="/merchant/attributes" element={<MerchantAttributeChangesPage />} />
          <Route path="/merchant/subscription" element={<ActiveSubscriptionPage />} />
          <Route path="/merchant/invoices/:invoiceId" element={<InvoiceDetailPage />} />
          <Route path="/merchant/invoices" element={<InvoiceListPage />} />
          <Route path="/dev/payment-confirm" element={<PaymentConfirmationPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

export default App
