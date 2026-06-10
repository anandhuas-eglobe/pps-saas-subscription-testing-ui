import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import type { VolumePriceTier } from '../../types/subscription'

interface VolumePriceTiersEditorProps {
  tiers: VolumePriceTier[]
  onChange: (tiers: VolumePriceTier[]) => void
}

export function VolumePriceTiersEditor({ tiers, onChange }: VolumePriceTiersEditorProps) {
  const updateTier = (index: number, patch: Partial<VolumePriceTier>) => {
    onChange(tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)))
  }

  const addTier = () => {
    const lastCount = tiers[tiers.length - 1]?.count ?? 0
    onChange([
      ...tiers,
      { count: lastCount + 20, monthlyPrice: 0, yearlyPrice: 0 },
    ])
  }

  const removeTier = (index: number) => {
    if (tiers.length <= 1) return
    onChange(tiers.filter((_, i) => i !== index))
  }

  return (
    <Box sx={{ gridColumn: '1 / -1' }}>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}
      >
        <Typography variant="subtitle2">Volume price tiers</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={addTier}>
          Add tier
        </Button>
      </Stack>

      <Stack spacing={1.5}>
        {tiers.map((tier, index) => (
          <Grid container spacing={1.5} key={index} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Count threshold"
                type="number"
                slotProps={{ htmlInput: { min: 1 } }}
                value={tier.count}
                onChange={(event) =>
                  updateTier(index, { count: Math.max(1, Number(event.target.value)) })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Monthly price"
                type="number"
                slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                value={tier.monthlyPrice}
                onChange={(event) =>
                  updateTier(index, { monthlyPrice: Number(event.target.value) })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Yearly price"
                type="number"
                slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                value={tier.yearlyPrice}
                onChange={(event) =>
                  updateTier(index, { yearlyPrice: Number(event.target.value) })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 1 }}>
              <IconButton
                size="small"
                color="error"
                disabled={tiers.length <= 1}
                onClick={() => removeTier(index)}
                aria-label="Remove tier"
              >
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </Grid>
          </Grid>
        ))}
      </Stack>
    </Box>
  )
}
