import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ExtensionIcon from '@mui/icons-material/Extension'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import { Link as RouterLink } from 'react-router-dom'
import type { ActivePlanAddonItem } from '../../types/subscription'
import { FeatureType } from '../../types/subscription'
import {
  addonSubscriptionStatusColor,
  formatDateOnly,
  formatMoney,
  formatUsageLimit,
} from '../../utils/planDisplay'

interface ActivePlanAddonsPanelProps {
  addons: ActivePlanAddonItem[]
  planCurrency: string
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  )
}

function AddonCard({ addon, planCurrency }: { addon: ActivePlanAddonItem; planCurrency: string }) {
  const isSimple = addon.feature.featureType === FeatureType.SIMPLE
  const title = isSimple
    ? (addon.feature.featureName ?? addon.feature.featureCode ?? 'Simple add-on')
    : (addon.feature.attribute?.attributeName ??
      addon.feature.attribute?.attributeCode ??
      addon.feature.featureName ??
      'Attribute add-on')

  const subtitle = isSimple
    ? (addon.feature.featureCode ?? addon.planFeatureId)
    : `${addon.feature.featureName ?? addon.feature.featureCode ?? 'Feature'} · ${addon.feature.attribute?.attributeCode ?? addon.planFeatureAttributeId}`

  const simpleConfig = addon.feature.featureConfig
  const attributeConfig = addon.feature.attribute?.attributeConfig

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            </Box>
            <Chip
              label={addon.status}
              size="small"
              color={addonSubscriptionStatusColor(addon.status)}
            />
            {addon.isTrial && <Chip label="Trial" size="small" color="warning" variant="outlined" />}
            <Chip
              label={addon.autoRenew ? 'Auto-renew on' : 'Auto-renew off'}
              size="small"
              variant="outlined"
            />
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {addon.addonSubscriptionId}
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField label="Feature type" value={addon.feature.featureType} />
            </Grid>
            {addon.isTrial && (
              <>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <DetailField label="Trial start" value={formatDateOnly(addon.trialStartDate)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <DetailField label="Trial end" value={formatDateOnly(addon.trialEndDate)} />
                </Grid>
              </>
            )}
            {addon.usage && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <DetailField
                  label="Usage"
                  value={formatUsageLimit(
                    addon.usage.usageType,
                    addon.usage.usedCount,
                    addon.usage.usageLimit,
                    addon.usage.scheduledUsageLimit,
                  )}
                />
              </Grid>
            )}
          </Grid>

          {(simpleConfig || attributeConfig) && (
            <>
              <Divider />
              <Grid container spacing={2}>
                {simpleConfig && (
                  <>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <DetailField label="Inclusion" value={simpleConfig.inclusionType} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <DetailField
                        label="Monthly price"
                        value={formatMoney(planCurrency, simpleConfig.planFeaturePriceMonthly)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <DetailField
                        label="Yearly price"
                        value={formatMoney(planCurrency, simpleConfig.planFeaturePriceYearly)}
                      />
                    </Grid>
                  </>
                )}
                {attributeConfig && (
                  <>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <DetailField label="Inclusion" value={attributeConfig.inclusionType} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <DetailField label="Price type" value={attributeConfig.priceType} />
                    </Grid>
                    {attributeConfig.minLimit != null && (
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <DetailField
                          label="Limits"
                          value={`${attributeConfig.minLimit} – ${attributeConfig.maxLimit ?? '∞'}`}
                        />
                      </Grid>
                    )}
                  </>
                )}
              </Grid>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

export function ActivePlanAddonsPanel({
  addons,
  planCurrency,
  loading = false,
  error = null,
  onRetry,
}: ActivePlanAddonsPanelProps) {
  if (loading) {
    return (
      <Stack sx={{ py: 6, alignItems: 'center' }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          Loading active add-ons...
        </Typography>
      </Stack>
    )
  }

  if (error) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{error}</Alert>
        {onRetry && (
          <Button variant="outlined" onClick={onRetry}>
            Retry
          </Button>
        )}
      </Stack>
    )
  }

  if (addons.length === 0) {
    return (
      <Alert
        severity="info"
        action={
          <Button
            component={RouterLink}
            to="/merchant/addons"
            color="inherit"
            size="small"
            startIcon={<ShoppingCartIcon />}
          >
            Browse add-ons
          </Button>
        }
      >
        No add-on subscriptions found on this plan. Purchase add-ons from the merchant add-ons page.
      </Alert>
    )
  }

  const activeCount = addons.filter((addon) => addon.status.toUpperCase() === 'ACTIVE').length

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <ExtensionIcon color="primary" fontSize="small" />
        <Typography variant="body2" color="text.secondary">
          {addons.length} add-on subscription{addons.length === 1 ? '' : 's'}
          {activeCount !== addons.length ? ` · ${activeCount} active` : ''}
        </Typography>
      </Stack>

      {addons.map((addon) => (
        <AddonCard key={addon.addonSubscriptionId} addon={addon} planCurrency={planCurrency} />
      ))}
    </Stack>
  )
}
