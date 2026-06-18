import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import DownloadIcon from '@mui/icons-material/Download'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Link as RouterLink, useParams } from 'react-router-dom'
import {
  downloadInvoicePdf,
  downloadReceiptPdf,
  getInvoiceById,
  getReceiptById,
} from '../api/merchant'
import { ApiRequestError } from '../api/client'
import { InvoiceDetailView } from '../components/invoices/InvoiceDetailView'
import { PageHeader } from '../components/layout/PageHeader'
import type { InvoiceDetail, InvoiceReceipt } from '../types/subscription'

export function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingInvoice, setDownloadingInvoice] = useState(false)
  const [downloadingReceipt, setDownloadingReceipt] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [receiptDetail, setReceiptDetail] = useState<InvoiceReceipt | null>(null)
  const [receiptLoading, setReceiptLoading] = useState(false)
  const [receiptError, setReceiptError] = useState<string | null>(null)

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

  const handleDownloadInvoice = async () => {
    if (!invoiceId) return
    setDownloadingInvoice(true)
    setDownloadError(null)
    try {
      await downloadInvoicePdf(invoiceId)
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to download invoice PDF'
      setDownloadError(message)
    } finally {
      setDownloadingInvoice(false)
    }
  }

  const handleLoadReceipt = async () => {
    if (!invoice?.receipt?.id) return
    setReceiptLoading(true)
    setReceiptError(null)
    try {
      const detail = await getReceiptById(invoice.receipt.id)
      setReceiptDetail(detail)
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load receipt'
      setReceiptError(message)
    } finally {
      setReceiptLoading(false)
    }
  }

  const handleDownloadReceipt = async () => {
    const receiptId = invoice?.receipt?.id
    if (!receiptId) return
    setDownloadingReceipt(true)
    setDownloadError(null)
    try {
      await downloadReceiptPdf(receiptId)
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to download receipt PDF'
      setDownloadError(message)
    } finally {
      setDownloadingReceipt(false)
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Merchant billing"
        title={invoice?.invoiceNumber ?? 'Invoice details'}
        description="Full invoice breakdown including line items, totals, billing address, and receipt when payment is completed."
        apiEndpoint="GET /api/v1/merchant/subscription/invoices/:id · download · receipts/:id"
        backTo="/merchant/invoices"
        backLabel="Back to invoices"
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => void handleDownloadInvoice()}
              disabled={loading || downloadingInvoice || !invoiceId}
            >
              {downloadingInvoice ? 'Downloading…' : 'Invoice PDF'}
            </Button>
            {invoice?.receipt && (
              <>
                <Button
                  variant="outlined"
                  onClick={() => void handleLoadReceipt()}
                  disabled={receiptLoading}
                >
                  {receiptLoading ? 'Loading receipt…' : 'Fetch receipt'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => void handleDownloadReceipt()}
                  disabled={downloadingReceipt}
                >
                  {downloadingReceipt ? 'Downloading…' : 'Receipt PDF'}
                </Button>
              </>
            )}
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => void loadInvoice()}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>
        }
      />

      {downloadError && <Alert severity="error">{downloadError}</Alert>}
      {receiptError && <Alert severity="error">{receiptError}</Alert>}
      {receiptDetail && (
        <Alert severity="info">
          Receipt {receiptDetail.id}: {receiptDetail.paymentMethod} · ****
          {receiptDetail.cardLast4Digit}
          {receiptDetail.paymentReference ? ` · Ref ${receiptDetail.paymentReference}` : ''}
        </Alert>
      )}

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
