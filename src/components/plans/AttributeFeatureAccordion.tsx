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
import { applyPriceTypeChange, defaultAttributeConfig } from '../../utils/planDefaults'
import { VolumePriceTiersEditor } from './VolumePriceTiersEditor'
import { AttributeBasePriceFields } from './AttributeBasePriceFields'

interface AttributeFeatureAccordionProps {
  feature: CatalogFeature
  selected: boolean
  configs: Record<string, AttributeConfig>
  linkFlags: Record<string, boolean>
  onToggle: (enabled: boolean) => void
  onConfigChange: (attributeId: string, patch: Partial<AttributeConfig>) => void
  onLinkFlagChange: (attributeId: string, value: boolean) => void
}

export function AttributeFeatureAccordion({
  feature,
  selected,
  configs,
  linkFlags,
  onToggle,
  onConfigChange,
  onLinkFlagChange,
}: AttributeFeatureAccordionProps) {
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
        <Stack spacing={2}>
          {feature.featureAttributes.map((attribute) => {
            const config =
              configs[attribute.id] ?? defaultAttributeConfig(attribute.attributeCode)
            const isVolumePrice = config.priceType === PriceType.VOLUME_PRICE
            const isPerCount = config.priceType === PriceType.PER_COUNT

            return (
              <Box
                key={attribute.id}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px dashed',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                }}
              >
                <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
                  <TuneIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2">{attribute.attributeName}</Typography>
                  <Chip label={attribute.attributeCode} size="small" />
                </Stack>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Inclusion</InputLabel>
                      <Select
                        label="Inclusion"
                        value={config.inclusionType}
                        onChange={(event) =>
                          onConfigChange(attribute.id, {
                            inclusionType: event.target.value as AttributeConfig['inclusionType'],
                          })
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
                          const nextConfig = applyPriceTypeChange(config, priceType)
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
                            onConfigChange(attribute.id, { minLimit: Number(event.target.value) })
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
                            onConfigChange(attribute.id, { maxLimit: Number(event.target.value) })
                          }
                        />
                      </Grid>

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

                  {config.isOverageEnabled && (
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

                  {attribute.isLinkable && isPerCount && (
                    <Grid size={{ xs: 12 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={linkFlags[attribute.id] ?? false}
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
                </Grid>
              </Box>
            )
          })}
        </Stack>
      </AccordionDetails>
    </Accordion>
  )
}
