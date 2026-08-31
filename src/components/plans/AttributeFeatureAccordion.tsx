import { memo } from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import TuneIcon from '@mui/icons-material/Tune'
import type { AttributeConfig, CatalogFeature } from '../../types/subscription'
import { InclusionType, PriceType } from '../../types/subscription'
import {
  applyPriceTypeChange,
  defaultAttributeConfig,
  getOptionalFeatureAttributes,
} from '../../utils/planDefaults'
import { AttributeBasePriceFields } from './AttributeBasePriceFields'
import { ProrationAddonTrialFields } from './ProrationAddonTrialFields'
import { VolumePriceTiersEditor } from './VolumePriceTiersEditor'

interface AttributeFeatureAccordionProps {
  feature: CatalogFeature
  selected: boolean
  selectedAttributeIds: string[]
  configs: Record<string, AttributeConfig>
  linkFlags: Record<string, boolean>
  onToggle: (enabled: boolean) => void
  onAttributeToggle: (attributeId: string, enabled: boolean) => void
  onConfigChange: (attributeId: string, patch: Partial<AttributeConfig>) => void
  onLinkFlagChange: (attributeId: string, value: boolean) => void
}

export const AttributeFeatureAccordion = memo(function AttributeFeatureAccordion({
  feature,
  selected,
  selectedAttributeIds,
  configs,
  linkFlags,
  onToggle,
  onAttributeToggle,
  onConfigChange,
  onLinkFlagChange,
}: AttributeFeatureAccordionProps) {
  const optionalAttributes = getOptionalFeatureAttributes(feature)

  const handleInclusionChange = (
    attributeId: string,
    inclusionType: AttributeConfig['inclusionType'],
  ) => {
    if (inclusionType === InclusionType.ADDON) {
      onConfigChange(attributeId, { inclusionType })
      return
    }

    onConfigChange(attributeId, {
      inclusionType,
      addonTrialEnabled: false,
      addonTrialPeriod: null,
    })
  }

  return (
    <Accordion
      expanded={selected}
      onChange={(_, expanded) => onToggle(expanded)}
      disableGutters
      sx={{
        border: '1px solid',
        borderColor: selected ? 'primary.light' : 'divider',
        bgcolor: selected ? 'rgba(79, 70, 229, 0.04)' : 'background.paper',
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1.5} sx={{ width: '100%', pr: 1, alignItems: 'center' }}>
          <Checkbox checked={selected} tabIndex={-1} disableRipple />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>{feature.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {feature.description}
            </Typography>
          </Box>
          <Chip label={feature.code} size="small" variant="outlined" />
        </Stack>
      </AccordionSummary>

      <AccordionDetails>
        {optionalAttributes.length === 0 ? (
          <Alert severity="info">
            All attributes for this feature are configured in the required attributes section.
          </Alert>
        ) : (
          <Stack spacing={2}>
            {optionalAttributes.map((attribute) => {
              const attributeSelected = selectedAttributeIds.includes(attribute.id)
              const config =
                configs[attribute.id] ?? defaultAttributeConfig(attribute.attributeCode)
              const isVolumePrice = config.priceType === PriceType.VOLUME_PRICE
              const isPerCount = config.priceType === PriceType.PER_COUNT
              const isLinkedToMonthlyOrderVolume = linkFlags[attribute.id] ?? false

              return (
                <Box
                  key={attribute.id}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px dashed',
                    borderColor: attributeSelected ? 'primary.light' : 'divider',
                    bgcolor: attributeSelected ? 'background.default' : 'action.hover',
                    opacity: attributeSelected ? 1 : 0.72,
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={attributeSelected}
                          onChange={(event) =>
                            onAttributeToggle(attribute.id, event.target.checked)
                          }
                        />
                      }
                      label={
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <TuneIcon fontSize="small" color="action" />
                          <Typography variant="subtitle2">{attribute.attributeName}</Typography>
                          <Chip label={attribute.attributeCode} size="small" />
                          {attribute.isLinkable && (
                            <Chip label="Linkable" size="small" color="info" variant="outlined" />
                          )}
                        </Stack>
                      }
                      sx={{ m: 0, flex: 1 }}
                    />
                  </Stack>

                  {attributeSelected && (
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Inclusion</InputLabel>
                          <Select
                            label="Inclusion"
                            value={config.inclusionType}
                            onChange={(event) =>
                              handleInclusionChange(
                                attribute.id,
                                event.target.value as AttributeConfig['inclusionType'],
                              )
                            }
                          >
                            <MenuItem value={InclusionType.INCLUDED}>INCLUDED</MenuItem>
                            <MenuItem value={InclusionType.ADDON}>ADDON</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Price type</InputLabel>
                          <Select
                            label="Price type"
                            value={config.priceType}
                            onChange={(event) => {
                              const priceType = event.target.value as AttributeConfig['priceType']
                              const nextConfig = applyPriceTypeChange(
                                config,
                                priceType,
                                attribute.attributeCode,
                              )
                              onConfigChange(attribute.id, nextConfig)
                              if (priceType === PriceType.VOLUME_PRICE && linkFlags[attribute.id]) {
                                onLinkFlagChange(attribute.id, false)
                              }
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
                        onChange={(patch) => onConfigChange(attribute.id, patch)}
                      />

                      {attribute.isLinkable && isPerCount && (
                        <Grid size={{ xs: 12 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={isLinkedToMonthlyOrderVolume}
                                onChange={(event) =>
                                  onLinkFlagChange(attribute.id, event.target.checked)
                                }
                              />
                            }
                            label="Link to monthly order volume"
                          />
                        </Grid>
                      )}

                      {attribute.isLinkable && isVolumePrice && (
                        <Grid size={{ xs: 12 }}>
                          <Alert severity="info" sx={{ py: 0.5 }}>
                            Link to monthly order volume is only available with PER_COUNT pricing.
                          </Alert>
                        </Grid>
                      )}

                      {isLinkedToMonthlyOrderVolume && (
                        <Grid size={{ xs: 12 }}>
                          <Alert severity="info" sx={{ py: 0.5 }}>
                            Limits follow the plan&apos;s required MONTHLY_ORDER_VOLUME attribute.
                            Set per-unit prices only; min/max limits are omitted from the payload.
                          </Alert>
                        </Grid>
                      )}

                      {isPerCount && !isLinkedToMonthlyOrderVolume && (
                        <>
                          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Min limit"
                              type="number"
                              value={config.minLimit ?? ''}
                              onChange={(event) =>
                                onConfigChange(attribute.id, {
                                  minLimit: Number(event.target.value),
                                })
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
                                onConfigChange(attribute.id, {
                                  maxLimit: Number(event.target.value),
                                })
                              }
                            />
                          </Grid>
                        </>
                      )}

                      {isPerCount && (
                        <>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Price / unit (monthly)"
                              type="number"
                              value={config.pricePerUnitMonthly ?? 0}
                              onChange={(event) =>
                                onConfigChange(attribute.id, {
                                  pricePerUnitMonthly: Number(event.target.value),
                                })
                              }
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Price / unit (yearly)"
                              type="number"
                              value={config.pricePerUnitYearly ?? 0}
                              onChange={(event) =>
                                onConfigChange(attribute.id, {
                                  pricePerUnitYearly: Number(event.target.value),
                                })
                              }
                            />
                          </Grid>
                        </>
                      )}

                      {isVolumePrice && (
                        <VolumePriceTiersEditor
                          tiers={
                            config.volumePrice ?? [
                              { count: 20, monthlyPrice: 40, yearlyPrice: 400 },
                            ]
                          }
                          onChange={(volumePrice) =>
                            onConfigChange(attribute.id, { volumePrice })
                          }
                        />
                      )}

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={config.isOverageEnabled}
                              disabled={!attribute.isMonthlyLimit}
                              onChange={(event) =>
                                onConfigChange(attribute.id, {
                                  isOverageEnabled: event.target.checked,
                                })
                              }
                            />
                          }
                          label="Overage enabled"
                        />
                      </Grid>

                      {!attribute.isMonthlyLimit && (
                        <Grid size={{ xs: 12 }}>
                          <Alert severity="info" sx={{ py: 0.5 }}>
                            Overage is only allowed on monthly-limit attributes (
                            {attribute.attributeCode} cannot enable overage).
                          </Alert>
                        </Grid>
                      )}

                      {config.isOverageEnabled && attribute.isMonthlyLimit && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Overage price / unit"
                            type="number"
                            value={config.overagePricePerUnit ?? 0}
                            onChange={(event) =>
                              onConfigChange(attribute.id, {
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
                        onChange={(patch) => onConfigChange(attribute.id, patch)}
                      />
                    </Grid>
                  )}
                </Box>
              )
            })}
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  )
})
