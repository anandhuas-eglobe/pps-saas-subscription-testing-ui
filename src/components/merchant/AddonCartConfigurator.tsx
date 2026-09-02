import Box from '@mui/material/Box'
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
import ExtensionIcon from '@mui/icons-material/Extension'
import type { PlanDetailFeatureAttribute } from '../../types/subscription'
import { FeatureType, PriceType } from '../../types/subscription'
import type { AddonCatalogItem } from '../../utils/addonBuilder'
import { formatMoney } from '../../utils/planDisplay'

interface AddonCartConfiguratorProps {
  addon: AddonCatalogItem
  currency: string
  isAddonTrial: boolean
  autoRenew: boolean
  attributeValue: number
  subscriptionIsTrial: boolean
  onTrialChange: (value: boolean) => void
  onAutoRenewChange: (value: boolean) => void
  onAttributeValueChange: (value: number) => void
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
  const label = attribute.attributeName ?? attribute.attributeCode ?? 'Quantity'

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
              {tier.count} units — {formatMoney(currency, tier.monthlyPrice)} / mo
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

export function AddonCartConfigurator({
  addon,
  currency,
  isAddonTrial,
  autoRenew,
  attributeValue,
  subscriptionIsTrial,
  onTrialChange,
  onAutoRenewChange,
  onAttributeValueChange,
}: AddonCartConfiguratorProps) {
  const isSimple = addon.featureType === FeatureType.SIMPLE
  const config = isSimple ? addon.feature.featureConfig : addon.attribute?.attributeConfig

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <ExtensionIcon color="primary" />
        <Box>
          <Typography variant="h6">Configure add-on</Typography>
          <Typography variant="body2" color="text.secondary">
            {addon.title} · {addon.subtitle}
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isAddonTrial}
                onChange={(event) => onTrialChange(event.target.checked)}
                disabled={
                  !addon.addonTrialEnabled ||
                  (subscriptionIsTrial && addon.addonTrialEnabled)
                }
              />
            }
            label={
              addon.addonTrialEnabled
                ? `Add-on trial (${addon.addonTrialPeriod ?? '?'} days)`
                : 'Add-on trial not available'
            }
          />
          {subscriptionIsTrial && addon.addonTrialEnabled && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              During plan trial, only the add-on trial can be added to cart (paid purchase is
              unavailable until the plan trial ends).
            </Typography>
          )}
          {subscriptionIsTrial && !addon.addonTrialEnabled && (
            <Typography variant="caption" color="error" sx={{ display: 'block' }}>
              Paid add-ons are unavailable while the plan subscription is in trial, and this
              add-on does not offer a trial.
            </Typography>
          )}
        </Grid>

        <Grid size={{ xs: 12 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRenew}
                onChange={(event) => onAutoRenewChange(event.target.checked)}
              />
            }
            label="Auto-renew add-on at end of billing cycle"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            When disabled, the add-on will not renew automatically and can be cancelled before the
            next billing cycle.
          </Typography>
        </Grid>

        {isSimple && config && 'planFeaturePriceMonthly' in config && (
          <>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary">
                Monthly price
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatMoney(currency, config.planFeaturePriceMonthly)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary">
                Yearly price
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatMoney(currency, config.planFeaturePriceYearly)}
              </Typography>
            </Grid>
          </>
        )}

        {!isSimple && addon.attribute && !isAddonTrial && (
          <Grid size={{ xs: 12 }}>
            <AttributeValueField
              attribute={addon.attribute}
              value={attributeValue}
              currency={currency}
              disabled={false}
              onChange={onAttributeValueChange}
            />
          </Grid>
        )}

        {addon.isProrated && !isAddonTrial && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" color="text.secondary">
              This add-on is prorated for the remaining subscription billing period.
            </Typography>
          </Grid>
        )}
      </Grid>
    </Stack>
  )
}
