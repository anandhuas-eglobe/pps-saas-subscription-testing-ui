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
  MerchantAttributeCartPreview,
  MerchantAttributePurchaseResult,
} from '../../types/subscription'
import { defaultBillingAddress, isBillingAddressComplete } from '../../utils/billingAddress'
import { formatMoney } from '../../utils/planDisplay'
import { BillingAddressFields } from './BillingAddressFields'
import { SubscriptionActionChip } from './SubscriptionActionChip'

interface AttributeCartPreviewPanelProps {
  cart: MerchantAttributeCartPreview
  purchasing?: boolean
  purchaseResult?: MerchantAttributePurchaseResult | null
  onConfirmPayment: (billingAddress: BillingAddress) => void
}

export function AttributeCartPreviewPanel({
  cart,
  purchasing = false,
  purchaseResult = null,
  onConfirmPayment,
}: AttributeCartPreviewPanelProps) {
  const [billingAddress, setBillingAddress] = useState<BillingAddress>(defaultBillingAddress)
  const canConfirm = !purchasing && isBillingAddressComplete(billingAddress)

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ReceiptLongIcon color="success" />
            <Box>
              <Typography variant="h6">Attribute cart preview</Typography>
              <Typography variant="body2" color="text.secondary">
                GET /api/v1/merchant/cart/attribute
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <SubscriptionActionChip action={cart.subscriptionAction} />
            <Chip label={cart.billingCycle ?? '—'} size="small" variant="outlined" />
            <Chip
              label={
                cart.pricing.chargeTiming === 'IMMEDIATE'
                  ? 'Charge now'
                  : 'Next billing cycle'
              }
              size="small"
              variant="outlined"
            />
          </Stack>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Attribute</TableCell>
                  <TableCell align="right">Previous</TableCell>
                  <TableCell align="right">New</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cart.attributeChanges.map((change) => (
                  <TableRow key={change.planFeatureAttributeId}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {change.attributeName ?? change.attributeCode ?? 'Attribute'}
                      </Typography>
                      {!change.isPriceApplicable && change.ineligibilityMessage && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {change.ineligibilityMessage}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{change.previousValue}</TableCell>
                    <TableCell align="right">{change.newValue}</TableCell>
                    <TableCell align="right">
                      {formatMoney(cart.pricing.currency, change.amount)}
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
              <Typography>{formatMoney(cart.pricing.currency, cart.pricing.subtotal)}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography color="text.secondary">Tax</Typography>
              <Typography>{formatMoney(cart.pricing.currency, cart.pricing.taxAmount)}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 700 }}>Grand total</Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {formatMoney(cart.pricing.currency, cart.pricing.grandTotal)}
              </Typography>
            </Stack>
          </Stack>

          <Alert severity="info">{cart.pricing.message}</Alert>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Billing address (required)
            </Typography>
            <BillingAddressFields value={billingAddress} onChange={setBillingAddress} />
          </Box>

          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={purchasing ? <CircularProgress size={18} color="inherit" /> : <PaymentIcon />}
            disabled={!canConfirm}
            onClick={() => onConfirmPayment(billingAddress)}
          >
            Confirm payment
          </Button>

          <Typography variant="caption" color="text.secondary">
            POST /api/v1/merchant/subscription/attribute/purchase
          </Typography>

          <Collapse in={purchaseResult != null}>
            {purchaseResult && (
              <Alert severity="success">
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  {purchaseResult.message}
                </Typography>
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
