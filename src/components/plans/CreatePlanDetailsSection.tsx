import { memo } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
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
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import type { CreatePlanPayload } from '../../types/subscription'
import { PlanType } from '../../types/subscription'

interface CreatePlanDetailsSectionProps {
  form: CreatePlanPayload
  onFormChange: <K extends keyof CreatePlanPayload>(key: K, value: CreatePlanPayload[K]) => void
  onTrialToggle: (enabled: boolean) => void
  onGraceToggle: (enabled: boolean) => void
}

export const CreatePlanDetailsSection = memo(function CreatePlanDetailsSection({
  form,
  onFormChange,
  onTrialToggle,
  onGraceToggle,
}: CreatePlanDetailsSectionProps) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
          <AddCircleOutlineOutlinedIcon color="primary" />
          <Typography variant="h6">Plan details</Typography>
        </Stack>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            <TextField
              fullWidth
              label="Plan name"
              value={form.planName}
              onChange={(event) => onFormChange('planName', event.target.value)}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Plan type</InputLabel>
              <Select
                label="Plan type"
                value={form.planType}
                onChange={(event) =>
                  onFormChange('planType', event.target.value as CreatePlanPayload['planType'])
                }
              >
                <MenuItem value={PlanType.PUBLIC}>PUBLIC</MenuItem>
                <MenuItem value={PlanType.CUSTOM}>CUSTOM</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={form.planDescription}
              onChange={(event) => onFormChange('planDescription', event.target.value)}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="Monthly price"
              type="number"
              value={form.baseMonthlyPrice}
              onChange={(event) => onFormChange('baseMonthlyPrice', Number(event.target.value))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="Yearly price"
              type="number"
              value={form.baseYearlyPrice}
              onChange={(event) => onFormChange('baseYearlyPrice', Number(event.target.value))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="Currency"
              value={form.baseCurrency ?? 'USD'}
              onChange={(event) => onFormChange('baseCurrency', event.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="Overage auto-charge"
              type="number"
              value={form.overageAutoChargeAmount}
              onChange={(event) =>
                onFormChange('overageAutoChargeAmount', Number(event.target.value))
              }
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="Overage max allowed"
              type="number"
              value={form.overageMaxAllowedAmount}
              onChange={(event) =>
                onFormChange('overageMaxAllowedAmount', Number(event.target.value))
              }
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2.5 }} />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.isTrialPeriodEnabled}
                  onChange={(event) => onTrialToggle(event.target.checked)}
                />
              }
              label="Trial period enabled"
            />
            {form.isTrialPeriodEnabled && (
              <TextField
                fullWidth
                sx={{ mt: 1 }}
                label="Trial days"
                type="number"
                slotProps={{ htmlInput: { min: 1 } }}
                value={form.trialPeriod ?? 14}
                onChange={(event) =>
                  onFormChange('trialPeriod', Math.max(1, Number(event.target.value)))
                }
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.isGracePeriodEnabled}
                  onChange={(event) => onGraceToggle(event.target.checked)}
                />
              }
              label="Grace period enabled"
            />
            {form.isGracePeriodEnabled && (
              <TextField
                fullWidth
                sx={{ mt: 1 }}
                label="Grace days"
                type="number"
                slotProps={{ htmlInput: { min: 1 } }}
                value={form.gracePeriod ?? 15}
                onChange={(event) =>
                  onFormChange('gracePeriod', Math.max(1, Number(event.target.value)))
                }
              />
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
})
