import { useCallback, useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import RefreshIcon from '@mui/icons-material/Refresh'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { listInvoices } from '../api/merchant'
import { ApiRequestError } from '../api/client'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { PageHeader } from '../components/layout/PageHeader'
import { useApiTransaction } from '../hooks/useApiTransaction'
import { InvoiceStatus, type InvoiceListItem } from '../types/subscription'
import {
  formatDateTime,
  formatMoney,
  invoiceStatusColor,
} from '../utils/planDisplay'

export function InvoiceListPage() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [statusFilter, setStatusFilter] = useState('')
  const [subscriptionIdFilter, setSubscriptionIdFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const { transaction, execute } = useApiTransaction()

  const listQueryPayload = useMemo(
    () => ({
      page,
      limit: 10,
      status: statusFilter || undefined,
      subscriptionId: subscriptionIdFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy,
      sortOrder,
    }),
    [page, statusFilter, subscriptionIdFilter, dateFrom, dateTo, sortBy, sortOrder],
  )

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await execute(
        listQueryPayload,
        () => listInvoices(listQueryPayload),
        'GET /api/v1/merchant/subscription/invoices',
      )
      setInvoices(result.invoices)
      setTotalPages(result.pagination.totalPages)
      setTotal(result.pagination.total)
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load invoices'
      setError(message)
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [execute, listQueryPayload])

  useEffect(() => {
    void loadInvoices()
  }, [loadInvoices])

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Merchant billing"
        title="Invoices"
        description="Browse merchant invoices with filters. Open an invoice to view line items, totals, and receipt details."
        apiEndpoint="GET /api/v1/merchant/subscription/invoices"
        backTo="/"
        backLabel="Back to home"
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => void loadInvoices()}
            disabled={loading}
          >
            Refresh
          </Button>
        }
      />

      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Subscription ID"
                placeholder="Filter by subscription UUID"
                value={subscriptionIdFilter}
                onChange={(event) => {
                  setSubscriptionIdFilter(event.target.value)
                  setPage(1)
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value)
                    setPage(1)
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value={InvoiceStatus.PENDING}>Pending</MenuItem>
                  <MenuItem value={InvoiceStatus.PROCESSING}>Processing</MenuItem>
                  <MenuItem value={InvoiceStatus.COMPLETED}>Completed</MenuItem>
                  <MenuItem value={InvoiceStatus.FAILED}>Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                label="Date from"
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value)
                  setPage(1)
                }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                label="Date to"
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value)
                  setPage(1)
                }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Sort</InputLabel>
                <Select
                  label="Sort"
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(event.target.value)
                    setPage(1)
                  }}
                >
                  <MenuItem value="createdAt">Created</MenuItem>
                  <MenuItem value="grandTotal">Grand total</MenuItem>
                  <MenuItem value="status">Status</MenuItem>
                  <MenuItem value="invoiceNumber">Invoice #</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Order</InputLabel>
                <Select
                  label="Order"
                  value={sortOrder}
                  onChange={(event) => {
                    setSortOrder(event.target.value as 'asc' | 'desc')
                    setPage(1)
                  }}
                >
                  <MenuItem value="desc">Desc</MenuItem>
                  <MenuItem value="asc">Asc</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
            <ReceiptLongIcon color="primary" />
            <Typography variant="h6">Invoice list</Typography>
            <Chip label={`${total} total`} size="small" variant="outlined" />
          </Stack>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {loading ? (
            <Stack direction="row" spacing={2} sx={{ py: 6, justifyContent: 'center', alignItems: 'center' }}>
              <CircularProgress size={28} />
              <Typography color="text.secondary">Loading invoices…</Typography>
            </Stack>
          ) : invoices.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No invoices found for the current filters.
            </Typography>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Grand total</TableCell>
                      <TableCell align="right">Line items</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} hover>
                        <TableCell>
                          <Button
                            component={RouterLink}
                            to={`/merchant/invoices/${invoice.id}`}
                            size="small"
                            sx={{ fontFamily: 'monospace', textTransform: 'none' }}
                          >
                            {invoice.invoiceNumber}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={invoice.status}
                            size="small"
                            color={invoiceStatusColor(invoice.status)}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {formatMoney(invoice.currency, invoice.grandTotal)}
                        </TableCell>
                        <TableCell align="right">{invoice.lineItems.length}</TableCell>
                        <TableCell>{formatDateTime(invoice.createdAt)}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            startIcon={<VisibilityIcon />}
                            onClick={() => navigate(`/merchant/invoices/${invoice.id}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {totalPages > 1 && (
                <Stack direction="row" sx={{ mt: 3, justifyContent: 'center' }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    color="primary"
                  />
                </Stack>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ApiTransactionInspector
        livePayload={listQueryPayload}
        livePayloadTitle="List invoices query"
        transaction={transaction}
      />
    </Stack>
  )
}
