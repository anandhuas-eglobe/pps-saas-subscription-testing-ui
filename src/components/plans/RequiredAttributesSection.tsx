import { memo } from 'react'
import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
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
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import type { AttributeConfig, CatalogFeature } from '../../types/subscription'
import { PriceType } from '../../types/subscription'
import {
  applyPriceTypeChange,
  defaultAttributeConfig,
  defaultVolumePriceTiers,
  REQUIRED_ATTRIBUTE_CODES,
} from '../../utils/planDefaults'
import { VolumePriceTiersEditor } from './VolumePriceTiersEditor'
import { AttributeBasePriceFields } from './AttributeBasePriceFields'
import { ProrationAddonTrialFields } from './ProrationAddonTrialFields'

export interface RequiredAttributeEntry {
  feature: CatalogFeature
  attributeId: string
  attributeCode: string
  attributeName: string
}

interface RequiredAttributesSectionProps {
  entries: RequiredAttributeEntry[]
  configs: Record<string, AttributeConfig>
  onConfigChange: (attributeId: string, patch: Partial<AttributeConfig>) => void
}

export function getRequiredAttributeEntries(catalog: CatalogFeature[]): RequiredAttributeEntry[] {
  const entries: RequiredAttributeEntry[] = []

  for (const code of REQUIRED_ATTRIBUTE_CODES) {
    const feature = catalog.find((item) =>
      item.featureAttributes.some((attr) => attr.attributeCode === code),
    )
    const attribute = feature?.featureAttributes.find((attr) => attr.attributeCode === code)

    if (!feature || !attribute) {
      continue
    }

    entries.push({
      feature,
      attributeId: attribute.id,
      attributeCode: attribute.attributeCode,
      attributeName: attribute.attributeName,
    })
  }

  return entries
}

export const RequiredAttributesSection = memo(function RequiredAttributesSection({
  entries,
  configs,
  onConfigChange,
}: RequiredAttributesSectionProps) {
  if (entries.length === 0) {
    return (
      <Alert severity="warning">
        Required attributes ({REQUIRED_ATTRIBUTE_CODES.join(', ')}) were not found in the feature
        catalog. Seed the catalog or reload features.
      </Alert>
    )
  }

  return (
    <Stack spacing={1.5}>
      {entries.map(({ feature, attributeId, attributeCode, attributeName }) => {
        const config = configs[attributeId] ?? defaultAttributeConfig(attributeCode)
        const isVolumePrice = config.priceType === PriceType.VOLUME_PRICE
        const isPerCount = config.priceType === PriceType.PER_COUNT

        return (
          <Card key={attributeId} variant="outlined" sx={{ bgcolor: 'rgba(79, 70, 229, 0.03)' }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {attributeName}
                  </Typography>
                  <Chip label={attributeCode} size="small" color="primary" />
                  <Chip label={feature.name} size="small" variant="outlined" />
                  <Chip
                    icon={<LockOutlinedIcon sx={{ fontSize: '14px !important' }} />}
                    label="Required · INCLUDED"
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                </Stack>

                {attributeCode === 'MONTHLY_ORDER_VOLUME' && (
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    This is the parent attribute for <strong>linkToMonthlyOrderVolume</strong>.
                    Optional linkable attributes inherit limits from this row.
                  </Alert>
                )}

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Price type</InputLabel>
                      <Select
                        label="Price type"
                        value={config.priceType}
                        onChange={(event) => {
                          const priceType = event.target.value as AttributeConfig['priceType']
                          onConfigChange(attributeId, applyPriceTypeChange(config, priceType, attributeCode))
                        }}
                      >
                        <MenuItem value={PriceType.PER_COUNT}>PER_COUNT</MenuItem>
                        <MenuItem value={PriceType.VOLUME_PRICE}>VOLUME_PRICE</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <AttributeBasePriceFields
                    baseMonthlyPrice={config.baseMonthlyPrice}
                    baseYearlyPrice={config.baseYearlyPrice}
                    onChange={(patch) => onConfigChange(attributeId, patch)}
                  />

                  {isPerCount && (
                    <>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Min limit"
                          type="number"
                          value={config.minLimit ?? ''}
                          onChange={(event) =>
                            onConfigChange(attributeId, { minLimit: Number(event.target.value) })
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Max limit"
                          type="number"
                          value={config.maxLimit ?? ''}
                          onChange={(event) =>
                            onConfigChange(attributeId, { maxLimit: Number(event.target.value) })
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Price / unit (monthly)"
                          type="number"
                          value={config.pricePerUnitMonthly ?? 0}
                          onChange={(event) =>
                            onConfigChange(attributeId, {
                              pricePerUnitMonthly: Number(event.target.value),
                            })
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Price / unit (yearly)"
                          type="number"
                          value={config.pricePerUnitYearly ?? 0}
                          onChange={(event) =>
                            onConfigChange(attributeId, {
                              pricePerUnitYearly: Number(event.target.value),
                            })
                          }
                        />
                      </Grid>
                    </>
                  )}

                  {isVolumePrice && (
                    <VolumePriceTiersEditor
                      tiers={config.volumePrice ?? defaultVolumePriceTiers(attributeCode)}
                      onChange={(volumePrice) => onConfigChange(attributeId, { volumePrice })}
                    />
                  )}

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.isOverageEnabled}
                          onChange={(event) =>
                            onConfigChange(attributeId, {
                              isOverageEnabled: event.target.checked,
                            })
                          }
                        />
                      }
                      label="Overage enabled"
                    />
                  </Grid>

                  {config.isOverageEnabled && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Overage price / unit"
                        type="number"
                        value={config.overagePricePerUnit ?? 0}
                        onChange={(event) =>
                          onConfigChange(attributeId, {
                            overagePricePerUnit: Number(event.target.value),
                          })
                        }
                      />
                    </Grid>
                  )}

                  <ProrationAddonTrialFields
                    inclusionType={config.inclusionType}
                    isProrated={config.isProrated}
                    addonTrialEnabled={config.addonTrialEnabled}
                    addonTrialPeriod={config.addonTrialPeriod}
                    onChange={(patch) => onConfigChange(attributeId, patch)}
                  />
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        )
      })}
    </Stack>
  )
})
