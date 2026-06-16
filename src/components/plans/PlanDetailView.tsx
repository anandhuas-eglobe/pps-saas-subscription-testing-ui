import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import CategoryIcon from '@mui/icons-material/Category'
import CodeIcon from '@mui/icons-material/Code'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import TuneIcon from '@mui/icons-material/Tune'
import type {
  PlanDetail,
  PlanDetailAttributeConfig,
  PlanDetailFeature,
  PlanDetailFeatureAttribute,
} from '../../types/subscription'
import { FeatureType, PriceType } from '../../types/subscription'
import {
  formatDateTime,
  formatMoney,
  formatTrialGrace,
  planStatusColor,
} from '../../utils/planDisplay'

interface PlanDetailViewProps {
  plan: PlanDetail
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

function BooleanChip({ value, trueLabel, falseLabel }: { value: boolean; trueLabel: string; falseLabel: string }) {
  return (
    <Chip
      label={value ? trueLabel : falseLabel}
      size="small"
      color={value ? 'success' : 'default'}
      variant={value ? 'filled' : 'outlined'}
    />
  )
}

function AttributeConfigSummary({
  config,
  currency,
}: {
  config: PlanDetailAttributeConfig
  currency: string
}) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <DetailField label="Inclusion" value={config.inclusionType} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <DetailField label="Price type" value={config.priceType} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <DetailField
          label="Prorated"
          value={<BooleanChip value={config.isProrated} trueLabel="Yes" falseLabel="No" />}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <DetailField
          label="Base price (monthly)"
          value={formatMoney(currency, config.baseMonthlyPrice)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <DetailField
          label="Base price (yearly)"
          value={formatMoney(currency, config.baseYearlyPrice)}
        />
      </Grid>

      {config.priceType === PriceType.PER_COUNT && (
        <>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DetailField label="Min limit" value={config.minLimit ?? '—'} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DetailField label="Max limit" value={config.maxLimit ?? '—'} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DetailField
              label="Per unit (monthly)"
              value={formatMoney(currency, config.pricePerUnitMonthly)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DetailField
              label="Per unit (yearly)"
              value={formatMoney(currency, config.pricePerUnitYearly)}
            />
          </Grid>
        </>
      )}

      {config.priceType === PriceType.VOLUME_PRICE && config.volumePrice?.length ? (
        <Grid size={{ xs: 12 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Volume price tiers
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Count</TableCell>
                  <TableCell>Monthly</TableCell>
                  <TableCell>Yearly</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {config.volumePrice.map((tier) => (
                  <TableRow key={tier.count}>
                    <TableCell>{tier.count}</TableCell>
                    <TableCell>{formatMoney(currency, tier.monthlyPrice)}</TableCell>
                    <TableCell>{formatMoney(currency, tier.yearlyPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      ) : null}

      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <DetailField
          label="Overage enabled"
          value={<BooleanChip value={config.isOverageEnabled} trueLabel="Yes" falseLabel="No" />}
        />
      </Grid>
      {config.isOverageEnabled && (
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <DetailField
            label="Overage per unit"
            value={formatMoney(currency, config.overagePricePerUnit)}
          />
        </Grid>
      )}
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <DetailField
          label="Addon trial"
          value={
            config.addonTrialEnabled
              ? `${config.addonTrialPeriod ?? '?'} days`
              : 'Disabled'
          }
        />
      </Grid>
    </Grid>
  )
}

function AttributeRow({
  attribute,
  currency,
}: {
  attribute: PlanDetailFeatureAttribute
  currency: string
}) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'rgba(15, 23, 42, 0.02)',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography sx={{ fontWeight: 600 }}>
          {attribute.attributeName ?? 'Unnamed attribute'}
        </Typography>
        {attribute.attributeCode && (
          <Chip label={attribute.attributeCode} size="small" variant="outlined" />
        )}
        {attribute.isMonthlyLimit && (
          <Chip label="Monthly limit" size="small" color="secondary" variant="outlined" />
        )}
      </Stack>
      <AttributeConfigSummary config={attribute.attributeConfig} currency={currency} />
    </Box>
  )
}

function FeatureAccordion({ feature, currency }: { feature: PlanDetailFeature; currency: string }) {
  const isSimple = feature.featureType === FeatureType.SIMPLE
  const title = feature.featureName ?? feature.featureCode ?? feature.featureId
  const subtitle = feature.featureCode ?? feature.featureId

  return (
    <Accordion
      disableGutters
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', width: '100%', pr: 1 }}>
          {isSimple ? <CategoryIcon color="primary" /> : <TuneIcon color="primary" />}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600 }} noWrap>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {subtitle} · {feature.featureType}
            </Typography>
          </Box>
          <Chip
            label={isSimple ? 'Simple' : `${feature.attributes.length} attribute(s)`}
            size="small"
            variant="outlined"
          />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {isSimple && feature.featureConfig ? (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField
                label="Monthly price"
                value={formatMoney(currency, feature.featureConfig.planFeaturePriceMonthly)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField
                label="Yearly price"
                value={formatMoney(currency, feature.featureConfig.planFeaturePriceYearly)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField label="Inclusion" value={feature.featureConfig.inclusionType} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField
                label="Addon trial"
                value={
                  feature.featureConfig.addonTrialEnabled
                    ? `${feature.featureConfig.addonTrialPeriod ?? '?'} days`
                    : 'Disabled'
                }
              />
            </Grid>
          </Grid>
        ) : (
          <Stack spacing={2}>
            {feature.attributes.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No attributes configured on this feature.
              </Typography>
            ) : (
              feature.attributes.map((attribute) => (
                <AttributeRow key={attribute.planFeatureAttributeId} attribute={attribute} currency={currency} />
              ))
            )}
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

export function PlanDetailView({ plan }: PlanDetailViewProps) {
  const simpleFeatures = plan.features.filter((f) => f.featureType === FeatureType.SIMPLE)
  const attributeFeatures = plan.features.filter((f) => f.featureType === FeatureType.ATTRIBUTE)

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2 }}
          >
            <Box>
              <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                <Chip label={plan.planType} size="small" variant="outlined" />
                <Chip label={plan.status} size="small" color={planStatusColor(plan.status)} />
              </Stack>
              <Typography variant="body1" color="text.secondary">
                {plan.planDescription || 'No description provided.'}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {plan.id}
            </Typography>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="overline" color="text.secondary">
                Base pricing
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <DetailField
                  label="Monthly"
                  value={formatMoney(plan.baseCurrency, plan.baseMonthlyPrice)}
                />
                <DetailField
                  label="Yearly"
                  value={formatMoney(plan.baseCurrency, plan.baseYearlyPrice)}
                />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="overline" color="text.secondary">
                Trial & grace
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <DetailField
                  label="Trial"
                  value={formatTrialGrace(plan.trial.enabled, plan.trial.days)}
                />
                <DetailField
                  label="Grace period"
                  value={formatTrialGrace(plan.grace.enabled, plan.grace.days)}
                />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="overline" color="text.secondary">
                Overage limits
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <DetailField
                  label="Auto-charge amount"
                  value={formatMoney(plan.baseCurrency, plan.overageAutoChargeAmount)}
                />
                <DetailField
                  label="Max allowed"
                  value={formatMoney(plan.baseCurrency, plan.overageMaxAllowedAmount)}
                />
              </Stack>
            </Grid>
          </Grid>

          {(plan.createdAt || plan.updatedAt || plan.migrationPlanId) && (
            <>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <DetailField label="Created" value={formatDateTime(plan.createdAt)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <DetailField label="Updated" value={formatDateTime(plan.updatedAt)} />
                </Grid>
                {plan.migrationPlanId && (
                  <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                    <DetailField label="Migration plan" value={plan.migrationPlanId} />
                  </Grid>
                )}
              </Grid>
            </>
          )}
        </CardContent>
      </Card>

      <Box>
        <Typography variant="h6" gutterBottom>
          Features ({plan.features.length})
        </Typography>
        {plan.features.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="text.secondary">This plan has no features attached.</Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={1.5}>
            {attributeFeatures.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Attribute features ({attributeFeatures.length})
                </Typography>
                <Stack spacing={1}>
                  {attributeFeatures.map((feature) => (
                    <FeatureAccordion key={feature.planFeatureId} feature={feature} currency={plan.baseCurrency} />
                  ))}
                </Stack>
              </Box>
            )}
            {simpleFeatures.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Simple features ({simpleFeatures.length})
                </Typography>
                <Stack spacing={1}>
                  {simpleFeatures.map((feature) => (
                    <FeatureAccordion key={feature.planFeatureId} feature={feature} currency={plan.baseCurrency} />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </Box>

      <Accordion
        disableGutters
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          '&:before': { display: 'none' },
        }}
      >
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
              fontSize: '0.78rem',
              overflow: 'auto',
              maxHeight: 420,
              maxWidth: '100%',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {JSON.stringify(plan, null, 2)}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Stack>
  )
}
