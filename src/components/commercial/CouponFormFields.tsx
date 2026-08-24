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
  BillingCycle,
  CouponApplicableOn,
  CouponBenefitType,
  CouponStatus,
  CouponUsageType,
  type BillingCycleValue,
  type CouponApplicableOnValue,
  type CouponBenefitTypeValue,
  type CouponFormState,
  type CouponStatusValue,
  type CouponUsageTypeValue,
} from '../../types/commercial'
import { createEmptyCouponBenefit, createEmptyCouponRestriction } from '../../utils/commercial'

interface CouponFormFieldsProps {
  form: CouponFormState
  onChange: (next: CouponFormState) => void
}

export function CouponFormFields({ form, onChange }: CouponFormFieldsProps) {
  const showMaximumUses = form.usageType === CouponUsageType.MULTIPLE_USE

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Coupon details
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                required
                label="Code"
                placeholder="SAVE10"
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
                <InputLabel>Usage type</InputLabel>
                <Select
                  label="Usage type"
                  value={form.usageType}
                  onChange={(event) =>
                    onChange({
                      ...form,
                      usageType: event.target.value as CouponUsageTypeValue,
                    })
                  }
                >
                  <MenuItem value={CouponUsageType.SINGLE_USE}>Single use</MenuItem>
                  <MenuItem value={CouponUsageType.MULTIPLE_USE}>Multiple use</MenuItem>
                  <MenuItem value={CouponUsageType.UNLIMITED}>Unlimited</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {showMaximumUses && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Maximum uses"
                  slotProps={{ htmlInput: { min: 1 } }}
                  value={form.maximumUses}
                  onChange={(event) => onChange({ ...form, maximumUses: event.target.value })}
                />
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="Maximum uses per merchant"
                slotProps={{ htmlInput: { min: 1 } }}
                value={form.maximumUsesPerMerchant}
                onChange={(event) =>
                  onChange({ ...form, maximumUsesPerMerchant: event.target.value })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Applicable on</InputLabel>
                <Select
                  label="Applicable on"
                  value={form.applicableOn}
                  onChange={(event) =>
                    onChange({
                      ...form,
                      applicableOn: event.target.value as CouponApplicableOnValue,
                    })
                  }
                >
                  <MenuItem value={CouponApplicableOn.FIRST_PURCHASE}>First purchase</MenuItem>
                  <MenuItem value={CouponApplicableOn.RENEWAL}>Renewal</MenuItem>
                  <MenuItem value={CouponApplicableOn.BOTH}>Both</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={form.status}
                  onChange={(event) =>
                    onChange({ ...form, status: event.target.value as CouponStatusValue })
                  }
                >
                  <MenuItem value={CouponStatus.ACTIVE}>Active</MenuItem>
                  <MenuItem value={CouponStatus.INACTIVE}>Inactive</MenuItem>
                  <MenuItem value={CouponStatus.EXPIRED}>Expired</MenuItem>
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
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isAutoApply}
                    onChange={(event) => onChange({ ...form, isAutoApply: event.target.checked })}
                  />
                }
                label="Auto-apply"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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
                onChange({ ...form, benefits: [...form.benefits, createEmptyCouponBenefit()] })
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
                            ? { ...item, benefitType: event.target.value as CouponBenefitTypeValue }
                            : item,
                        )
                        onChange({ ...form, benefits })
                      }}
                    >
                      <MenuItem value={CouponBenefitType.PERCENTAGE_DISCOUNT}>
                        Percentage discount
                      </MenuItem>
                      <MenuItem value={CouponBenefitType.FIXED_DISCOUNT}>Fixed discount</MenuItem>
                      <MenuItem value={CouponBenefitType.FREE_ADDON}>Free add-on</MenuItem>
                      <MenuItem value={CouponBenefitType.FREE_ENTITLEMENT}>
                        Free entitlement
                      </MenuItem>
                      <MenuItem value={CouponBenefitType.FREE_TRIAL_DAYS}>
                        Free trial days
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {(benefit.benefitType === CouponBenefitType.PERCENTAGE_DISCOUNT ||
                  benefit.benefitType === CouponBenefitType.FIXED_DISCOUNT ||
                  benefit.benefitType === CouponBenefitType.FREE_TRIAL_DAYS) && (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label={
                        benefit.benefitType === CouponBenefitType.FREE_TRIAL_DAYS
                          ? 'Days'
                          : 'Value'
                      }
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
                )}
                {(benefit.benefitType === CouponBenefitType.PERCENTAGE_DISCOUNT ||
                  benefit.benefitType === CouponBenefitType.FIXED_DISCOUNT) && (
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
                )}
                {benefit.benefitType === CouponBenefitType.FREE_ENTITLEMENT && (
                  <Grid size={{ xs: 12, md: 5 }}>
                    <TextField
                      fullWidth
                      required
                      label="Entitlement ID"
                      placeholder="UUID"
                      value={benefit.entitlementId}
                      onChange={(event) => {
                        const benefits = form.benefits.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, entitlementId: event.target.value }
                            : item,
                        )
                        onChange({ ...form, benefits })
                      }}
                    />
                  </Grid>
                )}
                {benefit.benefitType === CouponBenefitType.FREE_ADDON && (
                  <Grid size={{ xs: 12, md: 5 }}>
                    <TextField
                      fullWidth
                      required
                      label="Addon reference"
                      value={benefit.addonReference}
                      onChange={(event) => {
                        const benefits = form.benefits.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, addonReference: event.target.value }
                            : item,
                        )
                        onChange({ ...form, benefits })
                      }}
                    />
                  </Grid>
                )}
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

      <Card>
        <CardContent>
          <Stack
            direction="row"
            spacing={1}
            sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Restrictions
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() =>
                onChange({
                  ...form,
                  restrictions: [...form.restrictions, createEmptyCouponRestriction()],
                })
              }
            >
              Add restriction
            </Button>
          </Stack>
          {form.restrictions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Optional. Limit the coupon to specific plans or billing cycles.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {form.restrictions.map((restriction, index) => (
                <Grid key={index} container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Plan ID"
                      placeholder="UUID"
                      value={restriction.planId}
                      onChange={(event) => {
                        const restrictions = form.restrictions.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, planId: event.target.value } : item,
                        )
                        onChange({ ...form, restrictions })
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth>
                      <InputLabel>Billing cycle</InputLabel>
                      <Select
                        label="Billing cycle"
                        value={restriction.billingCycle}
                        onChange={(event) => {
                          const restrictions = form.restrictions.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  billingCycle: event.target.value as BillingCycleValue | '',
                                }
                              : item,
                          )
                          onChange({ ...form, restrictions })
                        }}
                      >
                        <MenuItem value="">Any</MenuItem>
                        <MenuItem value={BillingCycle.MONTHLY}>Monthly</MenuItem>
                        <MenuItem value={BillingCycle.YEARLY}>Yearly</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <IconButton
                      aria-label="Remove restriction"
                      onClick={() =>
                        onChange({
                          ...form,
                          restrictions: form.restrictions.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        })
                      }
                    >
                      <DeleteOutlineOutlinedIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}
