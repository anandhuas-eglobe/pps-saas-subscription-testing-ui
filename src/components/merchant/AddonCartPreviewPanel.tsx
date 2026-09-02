import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import PaymentIcon from '@mui/icons-material/Payment'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import { useState } from 'react'
import type {
  BillingAddress,
  MerchantAddonCartPreview,
  MerchantAddonPurchaseResult,
} from '../../types/subscription'
import {
  defaultBillingAddress,
  isBillingAddressComplete,
  requiresBillingAddressForCheckout,
} from '../../utils/billingAddress'
import { formatMoney } from '../../utils/planDisplay'
import { BillingAddressFields } from './BillingAddressFields'
import { CheckoutSessionActions } from '../payment/CheckoutSessionActions'

interface AddonCartPreviewPanelProps {
  cart: MerchantAddonCartPreview
  purchasing?: boolean
  purchaseResult?: MerchantAddonPurchaseResult | null
  checkoutPopupBlocked?: boolean
  onConfirmPayment: (billingAddress?: BillingAddress) => void
}

export function AddonCartPreviewPanel({
  cart,
  purchasing = false,
  purchaseResult = null,
  checkoutPopupBlocked = false,
  onConfirmPayment,
}: AddonCartPreviewPanelProps) {
  const { pricing, addon } = cart
  const addonTitle =
    addon.attribute?.attributeName ??
    addon.featureName ??
    addon.featureCode ??
    'Add-on'
  const requiresBillingAddress = requiresBillingAddressForCheckout({
    isTrial: cart.isTrial,
  })
  const [billingAddress, setBillingAddress] = useState<BillingAddress>(defaultBillingAddress)

  const handleConfirm = () => {
    if (requiresBillingAddress) {
      onConfirmPayment(billingAddress)
      return
    }
    onConfirmPayment()
  }

  const canConfirm =
    !purchasing && (!requiresBillingAddress || isBillingAddressComplete(billingAddress))

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
            <Chip
              label={cart.autoRenew ? 'Auto-renew on' : 'Auto-renew off'}
              size="small"
              color={cart.autoRenew ? 'success' : 'default'}
              variant="outlined"
            />
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
                Billing address (required for paid checkout)
              </Typography>
              <BillingAddressFields value={billingAddress} onChange={setBillingAddress} />
            </Box>
          )}

          {cart.isTrial && (
            <Alert severity="info">
              Add-on trial activation does not require a billing address.
            </Alert>
          )}

          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={purchasing ? <CircularProgress size={18} color="inherit" /> : <PaymentIcon />}
            disabled={!canConfirm}
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
                  <CheckoutSessionActions
                    checkoutUrl={purchaseResult.checkoutUrl}
                    popupBlocked={checkoutPopupBlocked}
                  />
                )}
              </Alert>
            )}
          </Collapse>
        </Stack>
      </CardContent>
    </Card>
  )
}
