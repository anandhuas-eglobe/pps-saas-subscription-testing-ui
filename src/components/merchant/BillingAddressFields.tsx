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
          label="State"
          required
          value={value.state}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, state: event.target.value })}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          fullWidth
          size="small"
          label="Country"
          required
          helperText="ISO 2-letter country code"
          value={value.country}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, country: event.target.value })}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          fullWidth
          size="small"
          label="ZIP code"
          required
          value={value.zipCode}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, zipCode: event.target.value })}
        />
      </Grid>
    </Grid>
  )
}
