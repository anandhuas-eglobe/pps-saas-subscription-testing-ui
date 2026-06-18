import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Pagination from '@mui/material/Pagination'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { Link as RouterLink } from 'react-router-dom'
import { listSubscriptionHistory } from '../../api/merchant'
import { ApiRequestError } from '../../api/client'
import type { SubscriptionHistoryListItem } from '../../types/subscription'
import { formatDateOnly, formatMoney } from '../../utils/planDisplay'

export function SubscriptionHistoryPanel() {
  const [items, setItems] = useState<SubscriptionHistoryListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [startDateFrom, setStartDateFrom] = useState('')
  const [startDateTo, setStartDateTo] = useState('')

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listSubscriptionHistory({
        page,
        limit: 10,
        invoiceNumber: invoiceNumber || undefined,
        startDateFrom: startDateFrom || undefined,
        startDateTo: startDateTo || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      setItems(result.items)
      setTotalPages(result.pagination.totalPages)
      setTotal(result.pagination.total)
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load subscription history'
      setError(message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [page, invoiceNumber, startDateFrom, startDateTo])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Invoice number"
                value={invoiceNumber}
                onChange={(event) => {
                  setInvoiceNumber(event.target.value)
                  setPage(1)
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="date"
                label="Cycle start from"
                slotProps={{ inputLabel: { shrink: true } }}
                value={startDateFrom}
                onChange={(event) => {
                  setStartDateFrom(event.target.value)
                  setPage(1)
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="date"
                label="Cycle start to"
                slotProps={{ inputLabel: { shrink: true } }}
                value={startDateTo}
                onChange={(event) => {
                  setStartDateTo(event.target.value)
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
            Loading billing-cycle history…
          </Typography>
        </Stack>
      )}

      {!loading && error && (
        <Alert severity="error" action={<Button onClick={() => void loadHistory()}>Retry</Button>}>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <>
          <Typography variant="body2" color="text.secondary">
            {total} billing cycle record{total === 1 ? '' : 's'}
          </Typography>

          {items.length === 0 ? (
            <Alert severity="info">No subscription history found for the current filters.</Alert>
          ) : (
            <TableContainer component={Card} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Plan</TableCell>
                    <TableCell>Cycle start</TableCell>
                    <TableCell>Cycle end</TableCell>
                    <TableCell>Invoice</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.planName ?? row.planId}</TableCell>
                      <TableCell>{formatDateOnly(row.startDate)}</TableCell>
                      <TableCell>{formatDateOnly(row.endDate)}</TableCell>
                      <TableCell>{row.invoiceNumber ?? '—'}</TableCell>
                      <TableCell align="right">
                        {row.grandTotal != null ? formatMoney('USD', row.grandTotal) : '—'}
                      </TableCell>
                      <TableCell align="right">
                        {row.invoiceId ? (
                          <Button
                            component={RouterLink}
                            to={`/merchant/invoices/${row.invoiceId}`}
                            size="small"
                            startIcon={<VisibilityIcon />}
                          >
                            Invoice
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
    </Stack>
  )
}
