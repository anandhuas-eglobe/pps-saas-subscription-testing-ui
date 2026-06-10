import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'

interface AttributeBasePriceFieldsProps {
  baseMonthlyPrice: number | null | undefined
  baseYearlyPrice: number | null | undefined
  onChange: (patch: { baseMonthlyPrice?: number; baseYearlyPrice?: number }) => void
}

export function AttributeBasePriceFields({
  baseMonthlyPrice,
  baseYearlyPrice,
  onChange,
}: AttributeBasePriceFieldsProps) {
  return (
    <>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TextField
          fullWidth
          size="small"
          label="Base price (monthly)"
          type="number"
          value={baseMonthlyPrice ?? ''}
          onChange={(event) =>
            onChange({ baseMonthlyPrice: Number(event.target.value) })
          }
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TextField
          fullWidth
          size="small"
          label="Base price (yearly)"
          type="number"
          value={baseYearlyPrice ?? ''}
          onChange={(event) =>
            onChange({ baseYearlyPrice: Number(event.target.value) })
          }
        />
      </Grid>
    </>
  )
}
