import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import type { PlanCartPlanDetails, PlanCartSystemAddedEntity, PlanDetail } from '../../types/subscription'
import {
  canOptOutSystemAddedEntity,
  systemAddedEntityKey,
} from '../../utils/cartBuilder'
import { resolvePlanEntityLabel } from '../../utils/planCartDisplay'

interface SystemAddedEntitiesOptPanelProps {
  plan: PlanDetail
  planDetails: PlanCartPlanDetails
  selection: Set<string> | null
  onSelectionChange: (selection: Set<string> | null) => void
  /** Plan/billing/attribute selections changed since cart preview was loaded. */
  optOutStale?: boolean
}

export function SystemAddedEntitiesOptPanel({
  plan,
  planDetails,
  selection,
  onSelectionChange,
  optOutStale = false,
}: SystemAddedEntitiesOptPanelProps) {
  const entities = planDetails.systemAddedEntities ?? []
  if (entities.length === 0) {
    return null
  }

  const effectiveSelection =
    selection ??
    new Set(entities.map((entity) => systemAddedEntityKey(entity)))

  const isDefaultAll = selection === null

  const toggleEntity = (entity: PlanCartSystemAddedEntity, checked: boolean) => {
    if (!checked && !canOptOutSystemAddedEntity(entity, planDetails, plan)) {
      return
    }

    const next = new Set(effectiveSelection)
    const key = systemAddedEntityKey(entity)
    if (checked) {
      next.add(key)
    } else {
      next.delete(key)
    }

    const allKept = entities.every((item) => next.has(systemAddedEntityKey(item)))
    onSelectionChange(allKept ? null : next)
  }

  const handleSelectAll = () => {
    onSelectionChange(null)
  }

  const handleSelectNone = () => {
    const next = new Set<string>()
    for (const entity of entities) {
      if (!canOptOutSystemAddedEntity(entity, planDetails, plan)) {
        next.add(systemAddedEntityKey(entity))
      }
    }
    onSelectionChange(next)
  }

  const keptCount = entities.filter((entity) =>
    effectiveSelection.has(systemAddedEntityKey(entity)),
  ).length

  return (
    <Card variant="outlined" sx={{ borderColor: 'info.light' }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <PlaylistAddIcon color="info" fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              System-added opt-in / opt-out
            </Typography>
            <Chip label={`${keptCount} / ${entities.length} kept`} size="small" color="info" />
          </Stack>

          {optOutStale && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              Billing cycle or attribute selections changed since the last cart preview. Add to cart
              once to refresh system-added candidates before opting out.
            </Alert>
          )}

          <Alert severity="info" sx={{ py: 0.5 }}>
            Uncheck items to opt out on the next cart POST. Omit{' '}
            <code>systemAddedEntities</code> from the payload when all are kept (default). LIMITED
            non-monthly LIMITED attributes with usage above zero stay locked; monthly limits
            may be opted out. Opt-out sends included-only{' '}
            <code>features</code> plus <code>systemAddedEntities</code> — kept rows are not duplicated
            in <code>features</code>.
          </Alert>

          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={handleSelectAll}>
              Keep all (default POST)
            </Button>
            <Button size="small" variant="text" onClick={handleSelectNone}>
              Opt out all allowed
            </Button>
            {isDefaultAll && (
              <Chip label="Payload: no systemAddedEntities field" size="small" variant="outlined" />
            )}
          </Stack>

          <Stack spacing={0.5}>
            {entities.map((entity) => {
              const key = systemAddedEntityKey(entity)
              const checked = effectiveSelection.has(key)
              const optOutAllowed = canOptOutSystemAddedEntity(entity, planDetails, plan)
              const label = resolvePlanEntityLabel(plan, entity.id, entity.type)
              const warning = planDetails.warningAttributes?.find(
                (row) => row.attributeId === entity.id,
              )

              const control = (
                <FormControlLabel
                  sx={{ alignItems: 'flex-start', m: 0 }}
                  control={
                    <Checkbox
                      checked={checked}
                      disabled={optOutStale || (!optOutAllowed && checked)}
                      onChange={(_, nextChecked) => toggleEntity(entity, nextChecked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {label}{' '}
                        <Chip label={entity.type} size="small" variant="outlined" sx={{ ml: 0.5 }} />
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Count {entity.count.toLocaleString()} · {entity.reason}
                      </Typography>
                      {!optOutAllowed && (
                        <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                          Cannot opt out — usage {warning?.usedCount?.toLocaleString() ?? '>'} 0
                        </Typography>
                      )}
                    </Box>
                  }
                />
              )

              return (
                <Box key={key} sx={{ pl: 0.5 }}>
                  {!optOutAllowed && checked ? (
                    <Tooltip title="Active usage blocks opt-out">{control}</Tooltip>
                  ) : (
                    control
                  )}
                </Box>
              )
            })}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
