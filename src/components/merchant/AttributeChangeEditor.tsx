import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import TuneIcon from '@mui/icons-material/Tune'
import type { PlanDetailFeatureAttribute, SubscriptionLimitAndUsage } from '../../types/subscription'
import { PriceType } from '../../types/subscription'
import type { AttributeChangeDraft, SubscribedPlanAttributeItem } from '../../utils/attributeChangeBuilder'
import {
  inclusionColor,
  inclusionLabel,
  priceTypeLabel,
  resolveAttributeUsageType,
} from '../../utils/attributeChangeBuilder'
import { formatMoney } from '../../utils/planDisplay'

interface AttributeChangeEditorProps {
  items: SubscribedPlanAttributeItem[]
  drafts: Record<string, AttributeChangeDraft>
  limitsAndUsages: SubscriptionLimitAndUsage[]
  currency: string
  isShortTermPurchase: boolean
  shortTermPurchaseEligible: boolean
  onShortTermPurchaseChange: (value: boolean) => void
  onDraftChange: (planFeatureAttributeId: string, patch: Partial<AttributeChangeDraft>) => void
}

function ValueField({
  attribute,
  value,
  disabled,
  onChange,
}: {
  attribute: PlanDetailFeatureAttribute
  value: number
  disabled: boolean
  onChange: (value: number) => void
}) {
  const config = attribute.attributeConfig
  const label = 'New limit'

  if (config.priceType === PriceType.VOLUME_PRICE) {
    const tiers = config.volumePrice ?? []
    return (
      <FormControl fullWidth size="small" disabled={disabled}>
        <InputLabel>{label}</InputLabel>
        <Select
          label={label}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        >
          {tiers.map((tier) => (
            <MenuItem key={tier.count} value={tier.count}>
              {tier.count}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    )
  }

  return (
    <TextField
      fullWidth
      size="small"
      type="number"
      label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  )
}

export function AttributeChangeEditor({
  items,
  drafts,
  limitsAndUsages,
  currency,
  isShortTermPurchase,
  shortTermPurchaseEligible,
  onShortTermPurchaseChange,
  onDraftChange,
}: AttributeChangeEditorProps) {
  const includedCount = items.filter(
    (item) => item.inclusionType === 'INCLUDED',
  ).length
  const addonCount = items.length - includedCount

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <TuneIcon color="primary" />
        <Box>
          <Typography variant="h6">Plan attributes</Typography>
          <Typography variant="body2" color="text.secondary">
            {includedCount} included · {addonCount} add-on · select attributes and set new limits
          </Typography>
        </Box>
      </Stack>

      <FormControlLabel
        control={
          <Checkbox
            checked={isShortTermPurchase}
            disabled={!shortTermPurchaseEligible}
            onChange={(event) => onShortTermPurchaseChange(event.target.checked)}
          />
        }
        label="Short-term purchase (monthly limited attribute upgrade only)"
      />
      {!shortTermPurchaseEligible && (
        <Typography variant="caption" color="text.secondary">
          Select one or more LIMITED_MONTHLY attribute upgrades to enable short-term purchase.
        </Typography>
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Attribute</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Usage</TableCell>
              <TableCell>Pricing</TableCell>
              <TableCell align="right">Current</TableCell>
              <TableCell>New limit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const draft = drafts[item.planFeatureAttributeId]
              if (!draft) {
                return null
              }

              const config = item.attribute.attributeConfig
              const usageType = resolveAttributeUsageType(
                item.planFeatureAttributeId,
                item.attribute,
                limitsAndUsages,
              )
              const usageRow = limitsAndUsages.find(
                (row) => row.planFeatureAttributeId === item.planFeatureAttributeId,
              )

              return (
                <TableRow key={item.key} hover selected={draft.selected}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={draft.selected}
                      onChange={(event) =>
                        onDraftChange(item.planFeatureAttributeId, {
                          selected: event.target.checked,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>{item.attributeName}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {item.featureName}
                      {item.attributeCode ? ` · ${item.attributeCode}` : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={inclusionLabel(item.inclusionType)}
                      size="small"
                      color={inclusionColor(item.inclusionType)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {usageType ? (
                      <Chip label={usageType} size="small" variant="outlined" />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                    {(usageRow?.shortTermPurchaseQuantity ?? 0) > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Short-term qty: {usageRow?.shortTermPurchaseQuantity}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{priceTypeLabel(item.attribute)}</Typography>
                    {config.priceType === PriceType.PER_COUNT && config.pricePerUnitMonthly != null && (
                      <Typography variant="caption" color="text.secondary">
                        {formatMoney(currency, config.pricePerUnitMonthly)} / unit
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {draft.previousValue ?? '—'}
                  </TableCell>
                  <TableCell sx={{ minWidth: 160 }}>
                    <ValueField
                      attribute={item.attribute}
                      value={draft.newValue}
                      disabled={!draft.selected}
                      onChange={(value) =>
                        onDraftChange(item.planFeatureAttributeId, { newValue: value })
                      }
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  )
}
