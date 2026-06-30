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
import PaymentIcon from '@mui/icons-material/Payment'
import RefreshIcon from '@mui/icons-material/Refresh'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { Link as RouterLink } from 'react-router-dom'
import { initiateManualOveragePayment, listOverageHistory } from '../api/overage'
import { ApiRequestError } from '../api/client'
import { PageHeader } from '../components/layout/PageHeader'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { useApiTransaction } from '../hooks/useApiTransaction'
import {
  MerchantSubscriptionOverageStatus,
  OverageType,
  type ManualOveragePaymentResult,
  type OverageHistoryListItem,
} from '../types/subscription'
import { formatDateTime, formatMoney } from '../utils/planDisplay'
import { saveLastPaymentHandoff } from '../utils/paymentEventBuilder'

function overageStatusColor(status: string): 'success' | 'warning' | 'error' | 'default' {
  if (status === MerchantSubscriptionOverageStatus.PAID) return 'success'
  if (status === MerchantSubscriptionOverageStatus.PROCESSING) return 'warning'
  if (status === MerchantSubscriptionOverageStatus.FAILED) return 'error'
  return 'default'
}

export function MerchantOveragePage() {
  const [items, setItems] = useState<OverageHistoryListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [statusFilter, setStatusFilter] = useState('')
  const [overageTypeFilter, setOverageTypeFilter] = useState('')
  const [attributeCode, setAttributeCode] = useState('')

  const [paying, setPaying] = useState(false)
  const [paymentResult, setPaymentResult] = useState<ManualOveragePaymentResult | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const { transaction, execute } = useApiTransaction()

  const livePayload = useMemo(
    () => ({
      page,
      limit: 10,
      status: statusFilter || undefined,
      overageType: overageTypeFilter || undefined,
      attributeCode: attributeCode || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }),
    [page, statusFilter, overageTypeFilter, attributeCode],
  )

  const loadOverage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await execute(
        livePayload,
        () =>
          listOverageHistory({
            page,
            limit: 10,
            status: statusFilter || undefined,
            overageType: overageTypeFilter || undefined,
            attributeCode: attributeCode || undefined,
            sortBy: 'createdAt',
            sortOrder: 'desc',
          }),
        'GET /api/v1/merchant/overage-tracking',
      )
      setItems(result.items)
      setTotalPages(result.pagination.totalPages)
      setTotal(result.pagination.total)
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load overage history'
      setError(message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [execute, livePayload, page, statusFilter, overageTypeFilter, attributeCode])

  useEffect(() => {
    void loadOverage()
  }, [loadOverage])

  const handleManualPayment = async () => {
    setPaying(true)
    setPaymentError(null)
    setPaymentResult(null)
    try {
      const result = await execute(
        {},
        () => initiateManualOveragePayment(),
        'POST /api/v1/merchant/overage-tracking/manual-payment',
      )
      setPaymentResult(result)
      if (result.paymentHandoff) {
        saveLastPaymentHandoff(result.paymentHandoff)
      }
      await loadOverage()
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to initiate manual overage payment'
      setPaymentError(message)
    } finally {
      setPaying(false)
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Merchant billing"
        title="Overage history"
        description="Browse overage billing records and initiate manual payment checkout for outstanding overage. For full scenario testing see Overage Testing."
        apiEndpoint="GET /api/v1/merchant/overage-tracking · POST /api/v1/merchant/overage-tracking/manual-payment"
        backTo="/merchant/overage-testing"
        backLabel="Back to overage testing"
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={paying ? <CircularProgress size={16} color="inherit" /> : <PaymentIcon />}
              onClick={() => void handleManualPayment()}
              disabled={paying}
            >
              Manual overage payment
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => void loadOverage()}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>
        }
      />

      <Alert severity="info">
        For usage generation, bulk overage, reseller events, and the full scenario playbook, use{' '}
        <RouterLink to="/merchant/overage-testing">Overage Testing</RouterLink>.
      </Alert>

      {paymentResult && (
        <Alert severity="success">
          {paymentResult.message}
          {paymentResult.paymentHandoff && (
            <>
              {' '}
              Invoice {paymentResult.paymentHandoff.invoiceNumber} (
              {formatMoney(
                paymentResult.paymentHandoff.currency,
                paymentResult.paymentHandoff.grandTotal,
              )}
              ) · {paymentResult.paymentHandoff.status}
            </>
          )}
          {paymentResult.checkoutUrl && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Checkout URL: {paymentResult.checkoutUrl}
            </Typography>
          )}
        </Alert>
      )}

      {paymentError && <Alert severity="error">{paymentError}</Alert>}

      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
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
                  {Object.values(MerchantSubscriptionOverageStatus).map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Overage type</InputLabel>
                <Select
                  label="Overage type"
                  value={overageTypeFilter}
                  onChange={(event) => {
                    setOverageTypeFilter(event.target.value)
                    setPage(1)
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  {Object.values(OverageType).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Attribute code"
                value={attributeCode}
                onChange={(event) => {
                  setAttributeCode(event.target.value)
                  setPage(1)
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading && (
        <Stack sx={{ py: 6, alignItems: 'center' }}>
          <CircularProgress size={28} />
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Loading overage history…
          </Typography>
        </Stack>
      )}

      {!loading && error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <>
          <Typography variant="body2" color="text.secondary">
            {total} overage record{total === 1 ? '' : 's'}
          </Typography>

          {items.length === 0 ? (
            <Alert severity="info">No overage history found.</Alert>
          ) : (
            <TableContainer component={Card} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Attribute</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Invoice</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.overageType}</TableCell>
                      <TableCell>
                        {row.attributeName ?? row.attributeCode ?? '—'}
                      </TableCell>
                      <TableCell align="right">{row.quantity ?? '—'}</TableCell>
                      <TableCell align="right">{formatMoney('USD', row.overageAmount)}</TableCell>
                      <TableCell>
                        <Chip label={row.status} size="small" color={overageStatusColor(row.status)} />
                      </TableCell>
                      <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                      <TableCell align="right">
                        {row.invoiceId ? (
                          <Button
                            component={RouterLink}
                            to={`/merchant/invoices/${row.invoiceId}`}
                            size="small"
                            startIcon={<VisibilityIcon />}
                          >
                            View
                          </Button>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {totalPages > 1 && (
            <Stack sx={{ alignItems: 'center' }}>
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

      <ApiTransactionInspector
        livePayload={livePayload}
        transaction={transaction}
        livePayloadTitle="Request preview"
      />
    </Stack>
  )
}
