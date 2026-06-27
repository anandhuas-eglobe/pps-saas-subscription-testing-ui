import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import ExtensionIcon from '@mui/icons-material/Extension'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RefreshIcon from '@mui/icons-material/Refresh'
import type { ActivePlanAddonItem } from '../../types/subscription'
import {
  extractSimulatableAddonUsages,
  getAddonAttributeTitle,
  getAddonFeatureSubtitle,
  isSimulatableAddon,
} from '../../utils/addonUsageSimulation'
import { formatUsageLimit } from '../../utils/planDisplay'
import { UsageSimulationPanel } from './UsageSimulationPanel'

interface AddonUsageSimulationSectionProps {
  merchantSubscriptionId: string
  addons: ActivePlanAddonItem[] | null
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  refreshingUsage?: boolean
  onUsageUpdated?: () => void | Promise<void>
}

function usageProgressPercent(
  usageType: string,
  usedCount: number,
  usageLimit: number | null,
): number | null {
  if (usageType.toUpperCase() === 'UNLIMITED' || usageLimit == null || usageLimit <= 0) {
    return null
  }

  return Math.min(100, Math.round((usedCount / usageLimit) * 100))
}

export function AddonUsageSimulationSection({
  merchantSubscriptionId,
  addons,
  loading = false,
  error = null,
  onRetry,
  refreshingUsage = false,
  onUsageUpdated,
}: AddonUsageSimulationSectionProps) {
  const simulatableAddons = useMemo(
    () => (addons ?? []).filter(isSimulatableAddon),
    [addons],
  )
  const addonLimitsAndUsages = useMemo(
    () => extractSimulatableAddonUsages(simulatableAddons),
    [simulatableAddons],
  )

  const [selectedAddonSubscriptionId, setSelectedAddonSubscriptionId] = useState('')

  const selectedAddon = simulatableAddons.find(
    (addon) => addon.addonSubscriptionId === selectedAddonSubscriptionId,
  )
  const selectedUsageRow = addonLimitsAndUsages.find(
    (row) => row.usageId === selectedAddonSubscriptionId,
  )

  useEffect(() => {
    if (simulatableAddons.length === 0) {
      setSelectedAddonSubscriptionId('')
      return
    }

    const stillValid = simulatableAddons.some(
      (addon) => addon.addonSubscriptionId === selectedAddonSubscriptionId,
    )
    if (!stillValid) {
      setSelectedAddonSubscriptionId(simulatableAddons[0].addonSubscriptionId)
    }
  }, [simulatableAddons, selectedAddonSubscriptionId])

  const inactiveAddonCount =
    (addons?.length ?? 0) - simulatableAddons.length

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <ExtensionIcon color="secondary" fontSize="small" />
          <Typography variant="h6">Add-on attributes</Typography>
          <Chip
            label={`${simulatableAddons.length} simulatable`}
            size="small"
            variant="outlined"
            color="secondary"
          />
        </Stack>
        {onRetry && (
          <Button
            size="small"
            variant="outlined"
            startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}
            onClick={onRetry}
            disabled={loading}
          >
            Refresh add-ons
          </Button>
        )}
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Active add-on attribute subscriptions from GET /api/v1/merchant/subscription/active-plan/addons.
        Select an add-on attribute to run the same validate → log → confirm usage lifecycle.
      </Typography>

      {loading && (
        <Stack sx={{ py: 4, alignItems: 'center' }}>
          <CircularProgress size={28} />
          <Typography color="text.secondary" sx={{ mt: 1.5 }}>
            Loading active add-ons...
          </Typography>
        </Stack>
      )}

      {!loading && error && (
        <Stack spacing={1.5}>
          <Alert severity="error">{error}</Alert>
          {onRetry && (
            <Button variant="outlined" onClick={onRetry}>
              Retry
            </Button>
          )}
        </Stack>
      )}

      {!loading && !error && simulatableAddons.length === 0 && (
        <Alert severity="info">
          No active add-on attributes with usage tracking on this subscription.
          {inactiveAddonCount > 0
            ? ` (${inactiveAddonCount} add-on row${inactiveAddonCount === 1 ? '' : 's'} omitted — simple add-ons, inactive status, or missing usage.)`
            : ' Purchase attribute add-ons from Plan add-ons to simulate usage here.'}
        </Alert>
      )}

      {!loading && !error && simulatableAddons.length > 0 && (
        <>
          <Card variant="outlined">
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Add-on attribute</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Usage type</TableCell>
                      <TableCell>Consumption</TableCell>
                      <TableCell>Overage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {simulatableAddons.map((addon) => {
                      const usage = addon.usage!
                      const usageRow = addonLimitsAndUsages.find(
                        (row) => row.usageId === addon.addonSubscriptionId,
                      )
                      const progress = usageProgressPercent(
                        usage.usageType,
                        usage.usedCount,
                        usage.usageLimit,
                      )
                      const isSelected = addon.addonSubscriptionId === selectedAddonSubscriptionId

                      return (
                        <TableRow
                          key={addon.addonSubscriptionId}
                          hover
                          selected={isSelected}
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setSelectedAddonSubscriptionId(addon.addonSubscriptionId)}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 600 }}>
                              {getAddonAttributeTitle(addon)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {getAddonFeatureSubtitle(addon)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontFamily: 'monospace', display: 'block' }}
                            >
                              {addon.addonSubscriptionId}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                              <Chip label={addon.status} size="small" variant="outlined" />
                              {addon.isTrial && (
                                <Chip label="Trial" size="small" color="warning" variant="outlined" />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip label={usage.usageType} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell sx={{ minWidth: 200 }}>
                            <Typography variant="body2">
                              {formatUsageLimit(
                                usage.usageType,
                                usage.usedCount,
                                usage.usageLimit,
                                usage.scheduledUsageLimit,
                              )}
                            </Typography>
                            {usage.scheduledUsageLimit != null &&
                              usage.scheduledUsageLimit !== usage.usageLimit && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: 'block' }}
                                >
                                  Scheduled: {usage.scheduledUsageLimit.toLocaleString()}
                                </Typography>
                              )}
                            {progress != null && (
                              <Box sx={{ mt: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={progress}
                                  color={progress >= 90 ? 'warning' : 'secondary'}
                                />
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={usageRow?.overageEnabled ? 'Enabled' : 'Disabled'}
                              size="small"
                              color={usageRow?.overageEnabled ? 'warning' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {selectedAddon && selectedUsageRow && (
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <PlayArrowIcon color="secondary" fontSize="small" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Usage simulation · {selectedUsageRow.attributeCode}
                    </Typography>
                    <Chip label="Add-on" size="small" color="secondary" variant="outlined" />
                  </Stack>

                  <UsageSimulationPanel
                    key={selectedAddon.addonSubscriptionId}
                    merchantSubscriptionId={merchantSubscriptionId}
                    limitsAndUsages={addonLimitsAndUsages}
                    refreshingUsage={refreshingUsage}
                    onUsageUpdated={onUsageUpdated}
                    initialAttributeCode={selectedUsageRow.attributeCode}
                    hideCurrentUsageTable
                    hideAttributePicker
                    attributeEmptyLabel="No simulatable add-on attributes"
                    contextLabel={`Add-on · ${getAddonAttributeTitle(selectedAddon)}`}
                  />
                </Stack>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Stack>
  )
}
