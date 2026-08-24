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
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import RefreshIcon from '@mui/icons-material/Refresh'
import { listMerchantCommercialOffers, previewMerchantCoupon } from '../api/commercial'
import { ApiRequestError } from '../api/client'
import { ApiErrorAlert } from '../components/ApiErrorAlert'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { PageHeader } from '../components/layout/PageHeader'
import { useApiTransaction } from '../hooks/useApiTransaction'
import {
  BillingCycle,
  CommercialPreviewEvent,
  type BillingCycleValue,
  type CommercialPreviewEventValue,
  type MerchantCommercialOffersResponse,
  type PreviewCouponPayload,
  type PreviewCouponResponse,
} from '../types/commercial'
import { getApiErrorSummary } from '../utils/apiErrors'
import { formatDateTime } from '../utils/planDisplay'

export function MerchantCommercialPage() {
  const [offers, setOffers] = useState<MerchantCommercialOffersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [couponCode, setCouponCode] = useState('')
  const [subtotal, setSubtotal] = useState('200')
  const [event, setEvent] = useState<CommercialPreviewEventValue>(
    CommercialPreviewEvent.FIRST_PURCHASE,
  )
  const [planId, setPlanId] = useState('')
  const [billingCycle, setBillingCycle] = useState<BillingCycleValue | ''>('')
  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState<unknown>(null)
  const [preview, setPreview] = useState<PreviewCouponResponse | null>(null)
  const { transaction, execute } = useApiTransaction()

  const previewPayload = useMemo<PreviewCouponPayload | undefined>(() => {
    const parsedSubtotal = Number(subtotal)
    if (!couponCode.trim() || !Number.isFinite(parsedSubtotal)) {
      return undefined
    }
    return {
      couponCode: couponCode.trim(),
      subtotal: parsedSubtotal,
      event,
      planId: planId.trim() || undefined,
      billingCycle: billingCycle || undefined,
    }
  }, [billingCycle, couponCode, event, planId, subtotal])

  const loadOffers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await execute(
        {},
        () => listMerchantCommercialOffers(),
        'GET /api/v1/merchant/commercial/offers',
      )
      setOffers(result)
    } catch (err) {
      setError(getApiErrorSummary(err))
      setOffers(null)
    } finally {
      setLoading(false)
    }
  }, [execute])

  useEffect(() => {
    void loadOffers()
  }, [loadOffers])

  const handlePreview = async () => {
    const parsedSubtotal = Number(subtotal)
    if (!couponCode.trim()) {
      setPreviewError(new Error('Coupon code is required.'))
      return
    }
    if (!Number.isFinite(parsedSubtotal) || parsedSubtotal < 0) {
      setPreviewError(new Error('Subtotal must be a number greater than or equal to 0.'))
      return
    }

    const payload: PreviewCouponPayload = {
      couponCode: couponCode.trim(),
      subtotal: parsedSubtotal,
      event,
      planId: planId.trim() || undefined,
      billingCycle: billingCycle || undefined,
    }

    setPreviewing(true)
    setPreviewError(null)
    setPreview(null)
    try {
      const result = await execute(
        payload,
        () => previewMerchantCoupon(payload),
        'POST /api/v1/merchant/commercial/coupons/preview',
      )
      setPreview(result)
    } catch (err) {
      setPreviewError(err instanceof ApiRequestError ? err : err)
    } finally {
      setPreviewing(false)
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Merchant"
        title="Commercial offers"
        description="View auto-apply coupons and assigned discount privileges for the signed-in merchant, then preview a coupon code against a subtotal. Requires permission subscription.commercial.read."
        apiEndpoint="GET /offers · POST /coupons/preview"
        backTo="/"
        backLabel="Back to home"
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => void loadOffers()}
            disabled={loading}
          >
            Refresh offers
          </Button>
        }
      />

      <Alert severity="info">
        Merchant JWT must include a merchant/tenant ID and the{' '}
        <strong>subscription.commercial.read</strong> permission. Admin tokens without a merchant
        context will fail these calls.
      </Alert>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Stack sx={{ px: 2, pt: 2, pb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Eligible coupons
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Auto-apply coupons currently available to this merchant.
            </Typography>
          </Stack>
          {loading ? (
            <Stack sx={{ py: 6, alignItems: 'center' }}>
              <CircularProgress />
            </Stack>
          ) : !offers || offers.coupons.length === 0 ? (
            <Typography color="text.secondary" sx={{ px: 2, pb: 2 }}>
              No eligible coupons.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Applicable on</TableCell>
                    <TableCell>Stackable</TableCell>
                    <TableCell>Valid</TableCell>
                    <TableCell>Benefits</TableCell>
                    <TableCell align="right">Preview</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {offers.coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600 }}>{coupon.code}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {coupon.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{coupon.applicableOn}</TableCell>
                      <TableCell>{coupon.stackable ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        {formatDateTime(coupon.validFrom)} → {formatDateTime(coupon.validTo)}
                      </TableCell>
                      <TableCell>
                        {coupon.benefits
                          .map((benefit) =>
                            benefit.value != null
                              ? `${benefit.benefitType} (${benefit.value})`
                              : benefit.benefitType,
                          )
                          .join(', ')}
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => setCouponCode(coupon.code)}>
                          Use code
                        </Button>
                      </TableCell>
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
              Assigned privileges
            </Typography>
          </Stack>
          {loading ? (
            <Stack sx={{ py: 6, alignItems: 'center' }}>
              <CircularProgress />
            </Stack>
          ) : !offers || offers.privileges.length === 0 ? (
            <Typography color="text.secondary" sx={{ px: 2, pb: 2 }}>
              No assigned privileges.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Stackable</TableCell>
                    <TableCell>Valid</TableCell>
                    <TableCell>Benefits</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {offers.privileges.map((privilege) => (
                    <TableRow key={privilege.id}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600 }}>{privilege.code}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {privilege.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{privilege.stackable ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        {formatDateTime(privilege.validFrom)} → {formatDateTime(privilege.validTo)}
                      </TableCell>
                      <TableCell>
                        {privilege.benefits
                          .map((benefit) =>
                            benefit.value != null
                              ? `${benefit.benefitType} (${benefit.value})`
                              : benefit.benefitType,
                          )
                          .join(', ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Preview coupon
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                required
                label="Coupon code"
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                required
                type="number"
                label="Subtotal"
                slotProps={{ htmlInput: { min: 0 } }}
                value={subtotal}
                onChange={(event) => setSubtotal(event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Event</InputLabel>
                <Select
                  label="Event"
                  value={event}
                  onChange={(event) =>
                    setEvent(event.target.value as CommercialPreviewEventValue)
                  }
                >
                  <MenuItem value={CommercialPreviewEvent.FIRST_PURCHASE}>First purchase</MenuItem>
                  <MenuItem value={CommercialPreviewEvent.RENEWAL}>Renewal</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                label="Plan ID"
                placeholder="Optional UUID"
                value={planId}
                onChange={(event) => setPlanId(event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Billing cycle</InputLabel>
                <Select
                  label="Billing cycle"
                  value={billingCycle}
                  onChange={(event) =>
                    setBillingCycle(event.target.value as BillingCycleValue | '')
                  }
                >
                  <MenuItem value="">Any</MenuItem>
                  <MenuItem value={BillingCycle.MONTHLY}>Monthly</MenuItem>
                  <MenuItem value={BillingCycle.YEARLY}>Yearly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Button
            sx={{ mt: 2 }}
            variant="contained"
            startIcon={
              previewing ? <CircularProgress size={16} color="inherit" /> : <LocalOfferIcon />
            }
            onClick={() => void handlePreview()}
            disabled={previewing}
          >
            Preview coupon
          </Button>
        </CardContent>
      </Card>

      {previewError != null && (
        <ApiErrorAlert
          error={previewError}
          subtitle="Coupon preview failed. Check the code, merchant permission, and payload."
        />
      )}

      {preview && (
        <Card>
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Preview result
              </Typography>
              <Chip
                size="small"
                color={preview.eligible ? 'success' : 'warning'}
                label={preview.eligible ? 'Eligible' : 'Not eligible'}
              />
            </Stack>
            {!preview.eligible && preview.reason && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {preview.reason}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  Subtotal
                </Typography>
                <Typography>{preview.subtotal}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  Discount total
                </Typography>
                <Typography>{preview.discountTotal}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  Payable total
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{preview.payableTotal}</Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">
                  Coupon
                </Typography>
                <Typography>
                  {preview.coupon.code} · {preview.coupon.name}
                </Typography>
              </Grid>
            </Grid>
            {preview.applied.length > 0 && (
              <TableContainer sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Source</TableCell>
                      <TableCell>Source ID</TableCell>
                      <TableCell>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.applied.map((applied, index) => (
                      <TableRow key={`${applied.sourceType}-${applied.sourceId}-${index}`}>
                        <TableCell>{applied.sourceType}</TableCell>
                        <TableCell>{applied.sourceId}</TableCell>
                        <TableCell>{applied.amount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      <ApiTransactionInspector
        livePayload={previewPayload}
        livePayloadTitle="Preview coupon payload"
        transaction={transaction}
      />
    </Stack>
  )
}
