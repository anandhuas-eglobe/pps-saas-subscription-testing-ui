import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import {
  DiscountPrivilegeBenefitType,
  DiscountPrivilegeStatus,
  type DiscountPrivilegeBenefitTypeValue,
  type DiscountPrivilegeStatusValue,
  type PrivilegeFormState,
} from '../../types/commercial'
import { createEmptyPrivilegeBenefit } from '../../utils/commercial'

interface PrivilegeFormFieldsProps {
  form: PrivilegeFormState
  onChange: (next: PrivilegeFormState) => void
}

export function PrivilegeFormFields({ form, onChange }: PrivilegeFormFieldsProps) {
  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Privilege details
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                required
                label="Code"
                placeholder="ENTERPRISE_15"
                value={form.code}
                onChange={(event) => onChange({ ...form, code: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                required
                label="Name"
                value={form.name}
                onChange={(event) => onChange({ ...form, name: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Description"
                value={form.description}
                onChange={(event) => onChange({ ...form, description: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={form.status}
                  onChange={(event) =>
                    onChange({
                      ...form,
                      status: event.target.value as DiscountPrivilegeStatusValue,
                    })
                  }
                >
                  <MenuItem value={DiscountPrivilegeStatus.ACTIVE}>Active</MenuItem>
                  <MenuItem value={DiscountPrivilegeStatus.INACTIVE}>Inactive</MenuItem>
                  <MenuItem value={DiscountPrivilegeStatus.EXPIRED}>Expired</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                required
                type="datetime-local"
                label="Valid from"
                slotProps={{ inputLabel: { shrink: true } }}
                value={form.validFrom}
                onChange={(event) => onChange({ ...form, validFrom: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Valid to"
                slotProps={{ inputLabel: { shrink: true } }}
                value={form.validTo}
                onChange={(event) => onChange({ ...form, validTo: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.stackable}
                    onChange={(event) => onChange({ ...form, stackable: event.target.checked })}
                  />
                }
                label="Stackable"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack
            direction="row"
            spacing={1}
            sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Benefits
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() =>
                onChange({ ...form, benefits: [...form.benefits, createEmptyPrivilegeBenefit()] })
              }
            >
              Add benefit
            </Button>
          </Stack>
          <Stack spacing={2} divider={<Divider />}>
            {form.benefits.map((benefit, index) => (
              <Grid key={index} container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>Benefit type</InputLabel>
                    <Select
                      label="Benefit type"
                      value={benefit.benefitType}
                      onChange={(event) => {
                        const benefits = form.benefits.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                benefitType: event.target.value as DiscountPrivilegeBenefitTypeValue,
                              }
                            : item,
                        )
                        onChange({ ...form, benefits })
                      }}
                    >
                      <MenuItem value={DiscountPrivilegeBenefitType.PERCENTAGE_DISCOUNT}>
                        Percentage discount
                      </MenuItem>
                      <MenuItem value={DiscountPrivilegeBenefitType.FIXED_DISCOUNT}>
                        Fixed discount
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    required
                    type="number"
                    label="Value"
                    slotProps={{ htmlInput: { min: 0 } }}
                    value={benefit.value}
                    onChange={(event) => {
                      const benefits = form.benefits.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, value: event.target.value } : item,
                      )
                      onChange({ ...form, benefits })
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Max discount amount"
                    slotProps={{ htmlInput: { min: 0 } }}
                    value={benefit.maximumDiscountAmount}
                    onChange={(event) => {
                      const benefits = form.benefits.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, maximumDiscountAmount: event.target.value }
                          : item,
                      )
                      onChange({ ...form, benefits })
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 'auto' }}>
                  <IconButton
                    aria-label="Remove benefit"
                    disabled={form.benefits.length === 1}
                    onClick={() =>
                      onChange({
                        ...form,
                        benefits: form.benefits.filter((_, itemIndex) => itemIndex !== index),
                      })
                    }
                  >
                    <DeleteOutlineOutlinedIcon />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
