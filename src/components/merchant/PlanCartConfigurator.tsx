import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout'
import TuneIcon from '@mui/icons-material/Tune'
import type {
  BillingCycleValue,
  CartFeatureSelection,
  PlanDetail,
  PlanDetailFeatureAttribute,
} from '../../types/subscription'
import { BillingCycle, FeatureType, PriceType } from '../../types/subscription'
import { formatMoney } from '../../utils/planDisplay'
import {
  includedAttributesForFeature,
  includedPlanFeatures,
} from '../../utils/cartBuilder'

interface PlanCartConfiguratorProps {
  plan: PlanDetail
  billingCycle: BillingCycleValue
  isTrial: boolean
  selections: CartFeatureSelection[]
  onBillingCycleChange: (value: BillingCycleValue) => void
  onTrialChange: (value: boolean) => void
  onAttributeValueChange: (planFeatureAttributeId: string, value: number) => void
}

function AttributeValueField({
  attribute,
  value,
  currency,
  disabled,
  onChange,
}: {
  attribute: PlanDetailFeatureAttribute
  value: number
  currency: string
  disabled: boolean
  onChange: (value: number) => void
}) {
  const config = attribute.attributeConfig
  const label = attribute.attributeName ?? attribute.attributeCode ?? 'Attribute'

  if (config.priceType === PriceType.VOLUME_PRICE) {
    const tiers = config.volumePrice ?? []
    return (
      <FormControl fullWidth disabled={disabled}>
        <InputLabel>{label} tier</InputLabel>
        <Select
          label={`${label} tier`}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        >
          {tiers.map((tier) => (
            <MenuItem key={tier.count} value={tier.count}>
              {tier.count} units — {formatMoney(currency, tier.monthlyPrice)} / mo,{' '}
              {formatMoney(currency, tier.yearlyPrice)} / yr
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    )
  }

  return (
    <TextField
      fullWidth
      type="number"
      label={label}
      value={value}
      disabled={disabled}
      helperText={
        config.minLimit != null || config.maxLimit != null
          ? `Allowed range: ${config.minLimit ?? 0}${config.maxLimit != null ? ` – ${config.maxLimit}` : '+'}`
          : undefined
      }
      onChange={(event) => onChange(Number(event.target.value))}
    />
  )
}

export function PlanCartConfigurator({
  plan,
  billingCycle,
  isTrial,
  selections,
  onBillingCycleChange,
  onTrialChange,
  onAttributeValueChange,
}: PlanCartConfiguratorProps) {
  const includedFeatures = includedPlanFeatures(plan)

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ShoppingCartCheckoutIcon color="primary" />
            <Box>
              <Typography variant="h6">Configure plan cart</Typography>
              <Typography variant="body2" color="text.secondary">
                Set billing cycle, limits, and volume tiers before adding{' '}
                <strong>{plan.planName}</strong> to the merchant cart.
              </Typography>
            </Box>
          </Stack>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth disabled={isTrial}>
                <InputLabel>Billing cycle</InputLabel>
                <Select
                  label="Billing cycle"
                  value={billingCycle}
                  onChange={(event) =>
                    onBillingCycleChange(event.target.value as BillingCycleValue)
                  }
                >
                  <MenuItem value={BillingCycle.MONTHLY}>Monthly</MenuItem>
                  <MenuItem value={BillingCycle.YEARLY}>Yearly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isTrial}
                    onChange={(event) => onTrialChange(event.target.checked)}
                    disabled={!plan.trial.enabled}
                  />
                }
                label={
                  plan.trial.enabled
                    ? `Start with ${plan.trial.days ?? '?'} day trial`
                    : 'Trial not available on this plan'
                }
              />
            </Grid>
          </Grid>

          {isTrial ? (
            <Alert severity="info">
              Trial carts use server defaults: included features, minimum limits, and the lowest
              volume tier where applicable. Limits and tiers do not need to be configured manually.
            </Alert>
          ) : (
            <>
              <Divider />
              <Typography variant="subtitle2" color="text.secondary">
                Included features ({includedFeatures.length})
              </Typography>

              {includedFeatures.length === 0 ? (
                <Alert severity="warning">
                  This plan has no included features. The cart will only contain the plan base price.
                </Alert>
              ) : (
                <Stack spacing={1}>
                  {includedFeatures.map((feature) => {
                    const selection = selections.find(
                      (item) => item.planFeatureId === feature.planFeatureId,
                    )

                    if (feature.featureType === FeatureType.SIMPLE) {
                      return (
                        <Box
                          key={feature.planFeatureId}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography sx={{ fontWeight: 600 }}>
                            {feature.featureName ?? feature.featureCode}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Simple included feature — no limits to configure.
                          </Typography>
                        </Box>
                      )
                    }

                    const attributes = includedAttributesForFeature(feature)

                    return (
                      <Accordion
                        key={feature.planFeatureId}
                        defaultExpanded
                        disableGutters
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          '&:before': { display: 'none' },
                        }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <TuneIcon fontSize="small" color="primary" />
                            <Typography sx={{ fontWeight: 600 }}>
                              {feature.featureName ?? feature.featureCode}
                            </Typography>
                            <Chip
                              label={`${attributes.length} attribute(s)`}
                              size="small"
                              variant="outlined"
                            />
                          </Stack>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Grid container spacing={2}>
                            {attributes.map((attribute) => {
                              const currentValue =
                                selection?.attributes.find(
                                  (item) =>
                                    item.planFeatureAttributeId === attribute.planFeatureAttributeId,
                                )?.value ?? 0

                              return (
                                <Grid
                                  key={attribute.planFeatureAttributeId}
                                  size={{ xs: 12, md: attributes.length > 1 ? 6 : 12 }}
                                >
                                  <AttributeValueField
                                    attribute={attribute}
                                    value={currentValue}
                                    currency={plan.baseCurrency}
                                    disabled={false}
                                    onChange={(value) =>
                                      onAttributeValueChange(
                                        attribute.planFeatureAttributeId,
                                        value,
                                      )
                                    }
                                  />
                                  {attribute.parentFeatureAttributeId && (
                                    <Typography variant="caption" color="text.secondary">
                                      Linked to monthly order volume — value must be at least the
                                      selected order volume.
                                    </Typography>
                                  )}
                                </Grid>
                              )
                            })}
                          </Grid>
                        </AccordionDetails>
                      </Accordion>
                    )
                  })}
                </Stack>
              )}
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
