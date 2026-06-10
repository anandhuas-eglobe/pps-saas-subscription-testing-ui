import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import PaymentIcon from '@mui/icons-material/Payment'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import { useState } from 'react'
import type {
  BillingAddress,
  MerchantAddonCartPreview,
  MerchantAddonPurchaseResult,
} from '../../types/subscription'
import { formatMoney } from '../../utils/planDisplay'

interface AddonCartPreviewPanelProps {
  cart: MerchantAddonCartPreview
  purchasing?: boolean
  purchaseResult?: MerchantAddonPurchaseResult | null
  onConfirmPayment: (billingAddress?: BillingAddress) => void
}

const defaultBillingAddress: BillingAddress = {
  street: '123 Main St',
  city: 'San Francisco',
  stateProvince: 'CA',
  country: 'US',
  zipPostalCode: '94102',
}

export function AddonCartPreviewPanel({
  cart,
  purchasing = false,
  purchaseResult = null,
  onConfirmPayment,
}: AddonCartPreviewPanelProps) {
  const { pricing, addon } = cart
  const addonTitle =
    addon.attribute?.attributeName ??
    addon.featureName ??
    addon.featureCode ??
    'Add-on'
  const requiresBillingAddress = !cart.isTrial && pricing.grandTotal > 0
  const [billingAddress, setBillingAddress] = useState<BillingAddress>(defaultBillingAddress)

  const handleConfirm = () => {
    if (requiresBillingAddress) {
      onConfirmPayment(billingAddress)
      return
    }
    onConfirmPayment()
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ReceiptLongIcon color="success" />
            <Box>
              <Typography variant="h6">Add-on cart preview</Typography>
              <Typography variant="body2" color="text.secondary">
                GET /api/v1/merchant/cart/addon
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip label={addonTitle} size="small" />
            {cart.isTrial ? (
              <Chip label="Add-on trial" size="small" color="warning" />
            ) : (
              <Chip label={cart.billingCycle ?? '—'} size="small" variant="outlined" />
            )}
          </Stack>

          {addon.attribute && (
            <Typography variant="body2" color="text.secondary">
              Selected quantity: {addon.attribute.value}
            </Typography>
          )}

          <Divider />

          <Stack spacing={0.5}>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography color="text.secondary">Subtotal</Typography>
              <Typography>{formatMoney(pricing.currency, pricing.subtotal)}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography color="text.secondary">Tax</Typography>
              <Typography>{formatMoney(pricing.currency, pricing.taxAmount)}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 700 }}>Grand total</Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {formatMoney(pricing.currency, pricing.grandTotal)}
              </Typography>
            </Stack>
          </Stack>

          {requiresBillingAddress && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Billing address (required for paid add-on checkout)
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Street"
                    value={billingAddress.street}
                    onChange={(event) =>
                      setBillingAddress((current) => ({ ...current, street: event.target.value }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="City"
                    value={billingAddress.city}
                    onChange={(event) =>
                      setBillingAddress((current) => ({ ...current, city: event.target.value }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="State / province"
                    value={billingAddress.stateProvince}
                    onChange={(event) =>
                      setBillingAddress((current) => ({
                        ...current,
                        stateProvince: event.target.value,
                      }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Country"
                    value={billingAddress.country}
                    onChange={(event) =>
                      setBillingAddress((current) => ({ ...current, country: event.target.value }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="ZIP / postal code"
                    value={billingAddress.zipPostalCode}
                    onChange={(event) =>
                      setBillingAddress((current) => ({
                        ...current,
                        zipPostalCode: event.target.value,
                      }))
                    }
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={purchasing ? <CircularProgress size={18} color="inherit" /> : <PaymentIcon />}
            disabled={purchasing}
            onClick={handleConfirm}
          >
            Confirm payment
          </Button>

          <Typography variant="caption" color="text.secondary">
            POST /api/v1/merchant/subscription/addon/purchase
          </Typography>

          <Collapse in={purchaseResult != null}>
            {purchaseResult && (
              <Alert severity="success">
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  {purchaseResult.message}
                </Typography>
                {purchaseResult.addonSubscriptionId && (
                  <Typography variant="body2">
                    Add-on subscription ID:{' '}
                    <Box component="span" sx={{ fontFamily: 'monospace' }}>
                      {purchaseResult.addonSubscriptionId}
                    </Box>
                  </Typography>
                )}
                {purchaseResult.paymentHandoff && (
                  <Typography variant="body2">
                    Invoice: {purchaseResult.paymentHandoff.invoiceNumber} (
                    {formatMoney(
                      purchaseResult.paymentHandoff.currency,
                      purchaseResult.paymentHandoff.grandTotal,
                    )}
                    ) · {purchaseResult.paymentHandoff.status}
                  </Typography>
                )}
                {purchaseResult.checkoutUrl && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Checkout URL: {purchaseResult.checkoutUrl}
                  </Typography>
                )}
              </Alert>
            )}
          </Collapse>
        </Stack>
      </CardContent>
    </Card>
  )
}
