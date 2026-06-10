import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import RefreshIcon from '@mui/icons-material/Refresh'
import type { InvoiceListItem } from '../../types/subscription'
import {
  formatDateTime,
  formatMoney,
  invoiceStatusColor,
} from '../../utils/planDisplay'
import { getInvoiceLineItemCategory } from '../../utils/paymentEventBuilder'

interface InvoicePickerSelectProps {
  invoices: InvoiceListItem[]
  loading: boolean
  error: string | null
  selectedInvoiceId: string
  onSelect: (invoiceId: string) => void
  onRefresh: () => void
}

export function InvoicePickerSelect({
  invoices,
  loading,
  error,
  selectedInvoiceId,
  onSelect,
  onRefresh,
}: InvoicePickerSelectProps) {
  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }}>
        <FormControl fullWidth size="small" disabled={loading}>
          <InputLabel id="payment-invoice-picker-label" shrink>
            Select invoice
          </InputLabel>
          <Select
            labelId="payment-invoice-picker-label"
            label="Select invoice"
            value={selectedInvoiceId}
            onChange={(event) => onSelect(event.target.value)}
            displayEmpty
            notched
            renderValue={(value) => {
              if (!value) {
                return (
                  <Typography component="span" variant="body2" color="text.secondary">
                    Choose an invoice to auto-fill fields…
                  </Typography>
                )
              }

              const invoice = invoices.find((item) => item.id === value)
              if (!invoice) {
                return value
              }

              return `${invoice.invoiceNumber} · ${formatMoney(invoice.currency, invoice.grandTotal)} · ${invoice.status}`
            }}
          >
            <MenuItem value="">
              <em>Manual entry</em>
            </MenuItem>
            {invoices.map((invoice) => {
              const category = getInvoiceLineItemCategory(invoice)
              return (
                <MenuItem key={invoice.id} value={invoice.id}>
                  <Stack spacing={0.5} sx={{ py: 0.25, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {invoice.invoiceNumber}
                      </Typography>
                      <Chip
                        label={invoice.status}
                        size="small"
                        color={invoiceStatusColor(invoice.status)}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {formatMoney(invoice.currency, invoice.grandTotal)} · {category} ·{' '}
                      {formatDateTime(invoice.createdAt)}
                    </Typography>
                  </Stack>
                </MenuItem>
              )
            })}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          size="small"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={onRefresh}
          disabled={loading}
          sx={{ flexShrink: 0, mt: { xs: 0, sm: 0.5 } }}
        >
          Refresh
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && invoices.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No invoices found. Create one via checkout first.
        </Typography>
      )}

      {selectedInvoice && (
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Selected invoice summary
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Chip
              size="small"
              label={`Amount: ${formatMoney(selectedInvoice.currency, selectedInvoice.grandTotal)}`}
            />
            <Chip
              size="small"
              label={`Category: ${getInvoiceLineItemCategory(selectedInvoice)}`}
              variant="outlined"
            />
            <Chip
              size="small"
              label={`Status: ${selectedInvoice.status}`}
              color={invoiceStatusColor(selectedInvoice.status)}
            />
            <Chip
              size="small"
              label={`Created: ${formatDateTime(selectedInvoice.createdAt)}`}
              variant="outlined"
            />
          </Stack>
        </Box>
      )}
    </Stack>
  )
}
