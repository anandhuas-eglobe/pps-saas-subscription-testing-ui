import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import type { FeatureConfig } from '../../types/subscription'
import { InclusionType } from '../../types/subscription'
import { ProrationAddonTrialFields } from './ProrationAddonTrialFields'

interface FeatureConfigFieldsProps {
  config: FeatureConfig
  onChange: (patch: Partial<FeatureConfig>) => void
}

export function FeatureConfigFields({ config, onChange }: FeatureConfigFieldsProps) {
  const handleInclusionChange = (inclusionType: FeatureConfig['inclusionType']) => {
    if (inclusionType === InclusionType.ADDON) {
      onChange({ inclusionType })
      return
    }

    onChange({
      inclusionType,
      addonTrialEnabled: false,
      addonTrialPeriod: null,
    })
  }

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Inclusion</InputLabel>
          <Select
            label="Inclusion"
            value={config.inclusionType}
            onChange={(event) =>
              handleInclusionChange(event.target.value as FeatureConfig['inclusionType'])
            }
          >
            <MenuItem value={InclusionType.INCLUDED}>INCLUDED</MenuItem>
            <MenuItem value={InclusionType.ADDON}>ADDON</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TextField
          fullWidth
          size="small"
          label="Plan feature price (monthly)"
          type="number"
          value={config.planFeaturePriceMonthly}
          onChange={(event) =>
            onChange({ planFeaturePriceMonthly: Number(event.target.value) })
          }
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TextField
          fullWidth
          size="small"
          label="Plan feature price (yearly)"
          type="number"
          value={config.planFeaturePriceYearly}
          onChange={(event) =>
            onChange({ planFeaturePriceYearly: Number(event.target.value) })
          }
        />
      </Grid>

      <ProrationAddonTrialFields
        inclusionType={config.inclusionType}
        isProrated={config.isProrated}
        addonTrialEnabled={config.addonTrialEnabled}
        addonTrialPeriod={config.addonTrialPeriod}
        onChange={onChange}
      />
    </Grid>
  )
}
