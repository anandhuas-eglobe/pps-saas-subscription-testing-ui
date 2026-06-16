import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import type { BillingAddress } from '../../types/subscription'

interface BillingAddressFieldsProps {
  value: BillingAddress
  onChange: (address: BillingAddress) => void
  disabled?: boolean
}

export function BillingAddressFields({
  value,
  onChange,
  disabled = false,
}: BillingAddressFieldsProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          size="small"
          label="Street"
          required
          value={value.street}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, street: event.target.value })}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          fullWidth
          size="small"
          label="City"
          required
          value={value.city}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, city: event.target.value })}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          fullWidth
          size="small"
          label="State / province"
          required
          value={value.stateProvince}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, stateProvince: event.target.value })}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          fullWidth
          size="small"
          label="Country"
          required
          value={value.country}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, country: event.target.value })}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          fullWidth
          size="small"
          label="ZIP / postal code"
          required
          value={value.zipPostalCode}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, zipPostalCode: event.target.value })}
        />
      </Grid>
    </Grid>
  )
}
