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
import Typography from '@mui/material/Typography'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { getCouponById, listCouponRedemptions, updateCouponStatus } from '../api/commercial'
import { ApiRequestError } from '../api/client'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { CopyJsonButton } from '../components/CopyJsonButton'
import { PageHeader } from '../components/layout/PageHeader'
import { useApiTransaction } from '../hooks/useApiTransaction'
import {
  CouponStatus,
  type CouponRead,
  type CouponRedemptionRead,
  type CouponStatusValue,
} from '../types/commercial'
import { getApiErrorSummary } from '../utils/apiErrors'
import { commercialStatusColor } from '../utils/commercial'
import { formatDateTime } from '../utils/planDisplay'

export function CouponDetailPage() {
  const { couponId } = useParams<{ couponId: string }>()
  const [coupon, setCoupon] = useState<CouponRead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<CouponStatusValue>(CouponStatus.ACTIVE)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const [redemptions, setRedemptions] = useState<CouponRedemptionRead[]>([])
  const [redemptionsLoading, setRedemptionsLoading] = useState(false)
  const [redemptionsError, setRedemptionsError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const { transaction, execute } = useApiTransaction()

  const loadCoupon = useCallback(async () => {
    if (!couponId) {
      setError('Coupon ID is missing from the URL.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const detail = await execute(
        { couponId },
        () => getCouponById(couponId),
        `GET /api/v1/admin/coupons/${couponId}`,
      )
      setCoupon(detail)
      setStatus(detail.status)
    } catch (err) {
      setError(getApiErrorSummary(err))
      setCoupon(null)
    } finally {
      setLoading(false)
    }
  }, [couponId, execute])

  const loadRedemptions = useCallback(async () => {
    if (!couponId) {
      return
    }
    setRedemptionsLoading(true)
    setRedemptionsError(null)
    try {
      const result = await execute(
        { couponId, page, limit: 10 },
        () => listCouponRedemptions(couponId, { page, limit: 10 }),
        `GET /api/v1/admin/coupons/${couponId}/redemptions`,
      )
      setRedemptions(result.redemptions)
      setTotalPages(result.pagination.totalPages)
      setTotal(result.pagination.total)
    } catch (err) {
      setRedemptionsError(getApiErrorSummary(err))
      setRedemptions([])
    } finally {
      setRedemptionsLoading(false)
    }
  }, [couponId, execute, page])

  useEffect(() => {
    void loadCoupon()
  }, [loadCoupon])

  useEffect(() => {
    void loadRedemptions()
  }, [loadRedemptions])

  const handleStatusUpdate = async () => {
    if (!couponId) {
      return
    }
    setStatusUpdating(true)
    setStatusMessage(null)
    setError(null)
    try {
      const updated = await execute(
        { status },
        () => updateCouponStatus(couponId, status),
        `PATCH /api/v1/admin/coupons/${couponId}/status`,
      )
      setCoupon(updated)
      setStatus(updated.status)
      setStatusMessage(`Status updated to ${updated.status}`)
    } catch (err) {
      setError(err instanceof ApiRequestError ? getApiErrorSummary(err) : getApiErrorSummary(err))
    } finally {
      setStatusUpdating(false)
    }
  }

  const livePayload = useMemo(() => {
    if (!couponId) {
      return undefined
    }
    return { couponId, status }
  }, [couponId, status])

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Admin"
        title={coupon ? coupon.code : 'Coupon detail'}
        description={
          coupon
            ? coupon.name
            : 'Inspect coupon details, change status, and browse redemptions.'
        }
        apiEndpoint={`GET /api/v1/admin/coupons/${couponId ?? ':id'}`}
        backTo="/admin/coupons"
        backLabel="Back to coupons"
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                void loadCoupon()
                void loadRedemptions()
              }}
              disabled={loading}
            >
              Refresh
            </Button>
            {couponId && (
              <Button
                variant="contained"
                startIcon={<EditOutlinedIcon />}
                component={RouterLink}
                to={`/admin/coupons/${couponId}/edit`}
              >
                Edit
              </Button>
            )}
          </>
        }
      />

      {error && <Alert severity="error">{error}</Alert>}
      {statusMessage && <Alert severity="success">{statusMessage}</Alert>}

      {loading ? (
        <Stack sx={{ py: 8, alignItems: 'center' }}>
          <CircularProgress />
        </Stack>
      ) : coupon ? (
        <>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                spacing={1}
                sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Details
                </Typography>
                <CopyJsonButton value={coupon} label="Copy coupon JSON" />
              </Stack>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Stack>
                    <Chip
                      label={coupon.status}
                      size="small"
                      color={commercialStatusColor(coupon.status)}
                      sx={{ width: 'fit-content' }}
                    />
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Usage type
                  </Typography>
                  <Typography>{coupon.usageType}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Applicable on
                  </Typography>
                  <Typography>{coupon.applicableOn}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Auto-apply / stackable
                  </Typography>
                  <Typography>
                    {coupon.isAutoApply ? 'Auto-apply' : 'Manual'} ·{' '}
                    {coupon.stackable ? 'Stackable' : 'Not stackable'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Valid from
                  </Typography>
                  <Typography>{formatDateTime(coupon.validFrom)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Valid to
                  </Typography>
                  <Typography>{formatDateTime(coupon.validTo)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Uses
                  </Typography>
                  <Typography>
                    {coupon.redemptionCount}
                    {coupon.maximumUses != null ? ` / ${coupon.maximumUses}` : ''} · per merchant{' '}
                    {coupon.maximumUsesPerMerchant ?? 1}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">
                    Description
                  </Typography>
                  <Typography>{coupon.description || '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">
                    ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {coupon.id}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Update status
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ maxWidth: 480 }}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value as CouponStatusValue)}
                  >
                    <MenuItem value={CouponStatus.ACTIVE}>Active</MenuItem>
                    <MenuItem value={CouponStatus.INACTIVE}>Inactive</MenuItem>
                    <MenuItem value={CouponStatus.EXPIRED}>Expired</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  onClick={() => void handleStatusUpdate()}
                  disabled={statusUpdating || status === coupon.status}
                  sx={{ flexShrink: 0 }}
                >
                  {statusUpdating ? 'Updating…' : 'Patch status'}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Stack sx={{ px: 2, pt: 2, pb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Benefits
                </Typography>
              </Stack>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>Max discount</TableCell>
                      <TableCell>Entitlement</TableCell>
                      <TableCell>Addon</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {coupon.benefits.map((benefit) => (
                      <TableRow key={benefit.id}>
                        <TableCell>{benefit.benefitType}</TableCell>
                        <TableCell>{benefit.value ?? '—'}</TableCell>
                        <TableCell>{benefit.maximumDiscountAmount ?? '—'}</TableCell>
                        <TableCell>{benefit.entitlementId ?? '—'}</TableCell>
                        <TableCell>{benefit.addonReference ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Stack sx={{ px: 2, pt: 2, pb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Restrictions
                </Typography>
              </Stack>
              {coupon.restrictions.length === 0 ? (
                <Typography color="text.secondary" sx={{ px: 2, pb: 2 }}>
                  No plan or billing-cycle restrictions.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Plan ID</TableCell>
                        <TableCell>Billing cycle</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {coupon.restrictions.map((restriction) => (
                        <TableRow key={restriction.id}>
                          <TableCell>{restriction.planId ?? '—'}</TableCell>
                          <TableCell>{restriction.billingCycle ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Stack sx={{ px: 2, pt: 2, pb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Redemptions
                </Typography>
              </Stack>
              {redemptionsError && (
                <Alert severity="error" sx={{ mx: 2, mb: 2 }}>
                  {redemptionsError}
                </Alert>
              )}
              {redemptionsLoading ? (
                <Stack sx={{ py: 6, alignItems: 'center' }}>
                  <CircularProgress size={24} />
                </Stack>
              ) : redemptions.length === 0 ? (
                <Typography color="text.secondary" sx={{ px: 2, pb: 2 }}>
                  No redemptions yet.
                </Typography>
              ) : (
                <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Merchant</TableCell>
                          <TableCell>Applied value</TableCell>
                          <TableCell>Used at</TableCell>
                          <TableCell>Invoice</TableCell>
                          <TableCell>Subscription</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {redemptions.map((redemption) => (
                          <TableRow key={redemption.id}>
                            <TableCell>{redemption.merchantId}</TableCell>
                            <TableCell>{redemption.appliedValue}</TableCell>
                            <TableCell>{formatDateTime(redemption.usedAt)}</TableCell>
                            <TableCell>{redemption.invoiceId ?? '—'}</TableCell>
                            <TableCell>{redemption.subscriptionId ?? '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    sx={{
                      p: 2,
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Showing {redemptions.length} of {total} redemptions
                    </Typography>
                    <Pagination
                      count={Math.max(totalPages, 1)}
                      page={page}
                      onChange={(_, value) => setPage(value)}
                      color="primary"
                    />
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <ApiTransactionInspector
        livePayload={livePayload}
        livePayloadTitle="Coupon action payload"
        transaction={transaction}
      />
    </Stack>
  )
}
