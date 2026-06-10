import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { getInvoiceById } from '../api/merchant'
import { ApiRequestError } from '../api/client'
import { InvoiceDetailView } from '../components/invoices/InvoiceDetailView'
import { PageHeader } from '../components/layout/PageHeader'
import type { InvoiceDetail } from '../types/subscription'

export function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) {
      setError('Invoice ID is missing from the URL.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const detail = await getInvoiceById(invoiceId)
      setInvoice(detail)
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load invoice details'
      setError(message)
      setInvoice(null)
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    void loadInvoice()
  }, [loadInvoice])

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Merchant billing"
        title={invoice?.invoiceNumber ?? 'Invoice details'}
        description="Full invoice breakdown including line items, totals, billing address, and receipt when payment is completed."
        apiEndpoint="GET /api/v1/merchant/subscription/invoices/:id"
        backTo="/merchant/invoices"
        backLabel="Back to invoices"
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => void loadInvoice()}
            disabled={loading}
          >
            Refresh
          </Button>
        }
      />

      {loading && (
        <Stack direction="row" spacing={2} sx={{ py: 6, justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress size={28} />
          <Typography color="text.secondary">Loading invoice…</Typography>
        </Stack>
      )}

      {!loading && error && (
        <Alert severity="error">
          {error}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button component={RouterLink} to="/merchant/invoices" size="small">
              Back to invoice list
            </Button>
            <Button size="small" onClick={() => void loadInvoice()}>
              Retry
            </Button>
          </Stack>
        </Alert>
      )}

      {!loading && invoice && <InvoiceDetailView invoice={invoice} />}
    </Stack>
  )
}
