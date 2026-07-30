import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
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
import Typography from '@mui/material/Typography'
import CodeIcon from '@mui/icons-material/Code'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PaymentIcon from '@mui/icons-material/Payment'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import { useState, type ReactNode } from 'react'
import { PlanDetailView } from '../plans/PlanDetailView'
import { SubscriptionActionChip } from './SubscriptionActionChip'
import type {
  BillingAddress,
  MerchantCartPreview,
  MerchantPlanPurchaseResult,
} from '../../types/subscription'
import { SubscriptionAction } from '../../types/subscription'
import {
  defaultBillingAddress,
  isBillingAddressComplete,
  requiresBillingAddressForCheckout,
} from '../../utils/billingAddress'
import { formatMoney } from '../../utils/planDisplay'
import { BillingAddressFields } from './BillingAddressFields'
import { CartPricingPreviewDetails } from './CartPricingPreviewDetails'
import { PlanCartPlanDetailsPanel } from './PlanCartPlanDetailsPanel'
import { CheckoutSessionActions } from '../payment/CheckoutSessionActions'

interface CartPreviewPanelProps {
  cart: MerchantCartPreview
  purchasing?: boolean
  purchaseResult?: MerchantPlanPurchaseResult | null
  checkoutPopupBlocked?: boolean
  onConfirmPayment: (billingAddress?: BillingAddress) => void
}

function DetailField({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 500, ...(mono ? { fontFamily: 'monospace', fontSize: '0.8rem' } : {}) }}
      >
        {value}
      </Typography>
    </Box>
  )
}

export function CartPreviewPanel({
  cart,
  purchasing = false,
  purchaseResult = null,
  checkoutPopupBlocked = false,
  onConfirmPayment,
}: CartPreviewPanelProps) {
  const { pricing, plan, planDetails } = cart
  const systemAddedCount = planDetails?.systemAddedEntities?.length ?? 0
  const autoAlignedCount = planDetails?.autoAlignedAttributes?.length ?? 0
  const warningCount = planDetails?.warningAttributes?.length ?? 0
  const requiresBillingAddress = requiresBillingAddressForCheckout({
    isTrial: cart.isTrial,
    subscriptionAction: cart.subscriptionAction,
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

  const isDowngrade = cart.subscriptionAction === SubscriptionAction.DOWNGRADE

  return (
    <Card>
      <CardContent>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ReceiptLongIcon color="success" />
            <Box>
              <Typography variant="h6">Cart preview</Typography>
              <Typography variant="body2" color="text.secondary">
                Full response from GET /api/v1/merchant/cart/plan
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip label={plan.planName} size="small" />
            <SubscriptionActionChip action={cart.subscriptionAction} />
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
            <Chip
              label={formatMoney(pricing.currency, pricing.grandTotal)}
              size="small"
              color="success"
              variant="outlined"
            />
            {warningCount > 0 && (
              <Chip
                label={`${warningCount} warning${warningCount === 1 ? '' : 's'}`}
                size="small"
                color="warning"
              />
            )}
            {systemAddedCount > 0 && (
              <Chip
                label={`${systemAddedCount} system-added`}
                size="small"
                color="info"
                variant="outlined"
              />
            )}
            {autoAlignedCount > 0 && (
              <Chip
                label={`${autoAlignedCount} auto-aligned`}
                size="small"
                color="success"
                variant="outlined"
              />
            )}
          </Stack>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
              Cart settings
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <DetailField label="Plan ID" value={cart.planId} mono />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <DetailField label="Billing cycle" value={cart.billingCycle ?? '—'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <DetailField label="Auto renew" value={cart.autoRenew ? 'Yes' : 'No'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <DetailField label="Trial cart" value={cart.isTrial ? 'Yes' : 'No'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <DetailField label="Subscription action" value={cart.subscriptionAction} />
              </Grid>
            </Grid>
          </Box>

          {isDowngrade && (
            <Alert severity="info">
              This cart is a plan downgrade. Checkout schedules the change for the next billing
              cycle — payment may not be required immediately.
            </Alert>
          )}

          {cart.subscriptionAction === SubscriptionAction.UPGRADE && (
            <Alert severity="info">
              Plan upgrade cart — pricing includes prorated charges where applicable.
            </Alert>
          )}

          {planDetails && (
            <>
              <Divider />
              <PlanCartPlanDetailsPanel plan={plan} planDetails={planDetails} />
            </>
          )}

          <Divider />

          <CartPricingPreviewDetails pricing={pricing} />

          <Divider />

          <Accordion variant="outlined" disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Plan snapshot
                </Typography>
                <Chip label={`${plan.features.length} features`} size="small" variant="outlined" />
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <PlanDetailView plan={plan} />
            </AccordionDetails>
          </Accordion>

          {requiresBillingAddress && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Billing address (required for paid checkout)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Sent as <code>billingAddress</code> with keys{' '}
                <code>street</code>, <code>city</code>, <code>state</code>, <code>country</code>,{' '}
                <code>zipCode</code>. Required for new plan and upgrade purchases even when the
                cart total is $0.
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
                  <CheckoutSessionActions
                    checkoutUrl={purchaseResult.checkoutUrl}
                    popupBlocked={checkoutPopupBlocked}
                  />
                )}
              </Alert>
            )}
          </Collapse>

          <Accordion variant="outlined" disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <CodeIcon fontSize="small" color="action" />
                <Typography variant="subtitle2">Raw API response</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: '#0f172a',
                  color: '#e2e8f0',
                  fontSize: '0.75rem',
                  lineHeight: 1.5,
                  overflow: 'auto',
                  maxHeight: 420,
                }}
              >
                {JSON.stringify(cart, null, 2)}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </CardContent>
    </Card>
  )
}
