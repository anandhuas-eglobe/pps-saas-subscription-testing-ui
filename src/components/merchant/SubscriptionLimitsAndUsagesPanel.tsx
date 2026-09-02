import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import SpeedIcon from '@mui/icons-material/Speed'
import type { SubscriptionLimitAndUsage } from '../../types/subscription'
import { formatDateTime, formatUsageLimit } from '../../utils/planDisplay'

interface SubscriptionLimitsAndUsagesPanelProps {
  limitsAndUsages: SubscriptionLimitAndUsage[]
  isThresholdReached: boolean
}

function usageProgressPercent(row: SubscriptionLimitAndUsage): number | null {
  if (row.usageType.toUpperCase() === 'UNLIMITED' || row.usageLimit == null || row.usageLimit <= 0) {
    return null
  }

  return Math.min(100, Math.round((row.usedCount / row.usageLimit) * 100))
}

export function SubscriptionLimitsAndUsagesPanel({
  limitsAndUsages,
  isThresholdReached,
}: SubscriptionLimitsAndUsagesPanelProps) {
  if (limitsAndUsages.length === 0) {
    return (
      <Alert severity="info">
        No INCLUDED base-plan attribute usage rows are available for this subscription.
      </Alert>
    )
  }

  return (
    <Stack spacing={2}>
      {isThresholdReached && (
        <Alert severity="warning">
          Usage threshold has been reached on this subscription. Overage rules may apply to
          affected attributes.
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
            <SpeedIcon color="primary" fontSize="small" />
            <Typography variant="h6">Included attribute usage</Typography>
            <Chip label={`${limitsAndUsages.length} attributes`} size="small" variant="outlined" />
          </Stack>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Attribute</TableCell>
                  <TableCell>Usage type</TableCell>
                  <TableCell>Consumption</TableCell>
                  <TableCell align="right">Short-term qty</TableCell>
                  <TableCell>Overage</TableCell>
                  <TableCell>Last updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {limitsAndUsages.map((row) => {
                  const progress = usageProgressPercent(row)

                  return (
                    <TableRow key={row.usageId} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.attributeCode}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          {row.planFeatureAttributeId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={row.usageType} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ minWidth: 220 }}>
                        <Typography variant="body2">
                          {formatUsageLimit(
                            row.usageType,
                            row.usedCount,
                            row.usageLimit,
                            row.scheduledUsageLimit,
                          )}
                        </Typography>
                        {row.scheduledUsageLimit != null && row.scheduledUsageLimit !== row.usageLimit && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Scheduled limit: {row.scheduledUsageLimit.toLocaleString()}
                          </Typography>
                        )}
                        {progress != null && (
                          <Box sx={{ mt: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              color={progress >= 90 ? 'warning' : 'primary'}
                            />
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {(row.shortTermPurchaseQuantity ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.overageEnabled ? 'Enabled' : 'Disabled'}
                          size="small"
                          color={row.overageEnabled ? 'warning' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{formatDateTime(row.updatedAt)}</Typography>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Stack>
  )
}
