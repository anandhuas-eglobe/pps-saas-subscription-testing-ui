import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import { InclusionType, type InclusionTypeValue } from '../../types/subscription'

interface ProrationAddonTrialFieldsProps {
  inclusionType: InclusionTypeValue
  isProrated: boolean
  addonTrialEnabled: boolean
  addonTrialPeriod?: number | null
  onChange: (
    patch: Partial<{
      isProrated: boolean
      addonTrialEnabled: boolean
      addonTrialPeriod: number | null
    }>,
  ) => void
}

export function ProrationAddonTrialFields({
  inclusionType,
  isProrated,
  addonTrialEnabled,
  addonTrialPeriod,
  onChange,
}: ProrationAddonTrialFieldsProps) {
  const isAddon = inclusionType === InclusionType.ADDON

  return (
    <>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormControlLabel
          control={
            <Switch
              checked={isProrated}
              onChange={(event) => onChange({ isProrated: event.target.checked })}
            />
          }
          label="Prorated"
        />
      </Grid>

      {isAddon && (
        <>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={addonTrialEnabled}
                  onChange={(event) =>
                    onChange({
                      addonTrialEnabled: event.target.checked,
                      addonTrialPeriod: event.target.checked
                        ? (addonTrialPeriod ?? 14)
                        : null,
                    })
                  }
                />
              }
              label="Add-on trial enabled"
            />
          </Grid>

          {addonTrialEnabled && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Add-on trial period (days)"
                type="number"
                value={addonTrialPeriod ?? 14}
                onChange={(event) =>
                  onChange({ addonTrialPeriod: Number(event.target.value) })
                }
              />
            </Grid>
          )}
        </>
      )}
    </>
  )
}
