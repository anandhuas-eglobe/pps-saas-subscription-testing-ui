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
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import PaymentIcon from '@mui/icons-material/Payment'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import { useState } from 'react'
import type {
  BillingAddress,
  MerchantCartPreview,
  MerchantPlanPurchaseResult,
} from '../../types/subscription'
import {
  defaultBillingAddress,
  isBillingAddressComplete,
  requiresBillingAddressForCheckout,
} from '../../utils/billingAddress'
import { formatMoney } from '../../utils/planDisplay'
import { BillingAddressFields } from './BillingAddressFields'

interface CartPreviewPanelProps {
  cart: MerchantCartPreview
  purchasing?: boolean
  purchaseResult?: MerchantPlanPurchaseResult | null
  onConfirmPayment: (billingAddress?: BillingAddress) => void
}

export function CartPreviewPanel({
  cart,
  purchasing = false,
  purchaseResult = null,
  onConfirmPayment,
}: CartPreviewPanelProps) {
  const { pricing, plan } = cart
  const requiresBillingAddress = requiresBillingAddressForCheckout({
    isTrial: cart.isTrial,
    grandTotal: pricing.grandTotal,
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
              <Typography variant="h6">Cart preview</Typography>
              <Typography variant="body2" color="text.secondary">
                Pricing from GET /api/v1/merchant/cart/plan
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip label={plan.planName} size="small" />
            {cart.isTrial ? (
              <Chip label="Trial cart" size="small" color="warning" />
            ) : (
              <Chip label={cart.billingCycle ?? '—'} size="small" variant="outlined" />
            )}
            <Chip
              label={`Auto-renew: ${cart.autoRenew ? 'Yes' : 'No'}`}
              size="small"
              variant="outlined"
            />
          </Stack>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Line item</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Unit</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pricing.lines.map((line) => (
                  <TableRow key={`${line.lineItemName}-${line.subTotal}`}>
                    <TableCell>{line.lineItemName}</TableCell>
                    <TableCell align="right">{line.quantity ?? '—'}</TableCell>
                    <TableCell align="right">
                      {line.unitPrice != null
                        ? formatMoney(pricing.currency, line.unitPrice)
                        : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {formatMoney(pricing.currency, line.subTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

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
              Trial activation does not require a billing address. Omit it from the purchase
              request.
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
            POST /api/v1/merchant/subscription/plan/purchase
          </Typography>

          <Collapse in={purchaseResult != null}>
            {purchaseResult && (
              <Alert severity="success">
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  {purchaseResult.message}
                </Typography>
                {purchaseResult.subscriptionId && (
                  <Typography variant="body2">
                    Subscription ID:{' '}
                    <Box component="span" sx={{ fontFamily: 'monospace' }}>
                      {purchaseResult.subscriptionId}
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
