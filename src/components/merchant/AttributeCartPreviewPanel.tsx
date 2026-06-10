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
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import PaymentIcon from '@mui/icons-material/Payment'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import { useState } from 'react'
import type {
  BillingAddress,
  MerchantAttributeCartPreview,
  MerchantAttributePurchaseResult,
} from '../../types/subscription'
import { formatMoney } from '../../utils/planDisplay'

interface AttributeCartPreviewPanelProps {
  cart: MerchantAttributeCartPreview
  purchasing?: boolean
  purchaseResult?: MerchantAttributePurchaseResult | null
  onConfirmPayment: (billingAddress: BillingAddress) => void
}

const defaultBillingAddress: BillingAddress = {
  street: '123 Main St',
  city: 'San Francisco',
  stateProvince: 'CA',
  country: 'US',
  zipPostalCode: '94102',
}

export function AttributeCartPreviewPanel({
  cart,
  purchasing = false,
  purchaseResult = null,
  onConfirmPayment,
}: AttributeCartPreviewPanelProps) {
  const isUpgrade = cart.subscriptionAction === 'UPGRADE'
  const [billingAddress, setBillingAddress] = useState<BillingAddress>(defaultBillingAddress)

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
            <Chip
              icon={isUpgrade ? <TrendingUpIcon /> : <TrendingDownIcon />}
              label={cart.subscriptionAction}
              size="small"
              color={isUpgrade ? 'success' : 'warning'}
            />
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

          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={purchasing ? <CircularProgress size={18} color="inherit" /> : <PaymentIcon />}
            disabled={purchasing}
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
