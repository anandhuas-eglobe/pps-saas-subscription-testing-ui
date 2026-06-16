import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import EventIcon from '@mui/icons-material/Event'
import type { ActiveSubscriptionDetail } from '../../types/subscription'
import {
  formatDateOnly,
  formatDateTime,
  subscriptionStatusColor,
} from '../../utils/planDisplay'

interface ActiveSubscriptionSummaryProps {
  subscription: ActiveSubscriptionDetail
  planName: string
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  )
}

export function ActiveSubscriptionSummary({
  subscription,
  planName,
}: ActiveSubscriptionSummaryProps) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <EventIcon color="primary" />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6">{planName}</Typography>
              <Typography variant="body2" color="text.secondary">
                Active merchant subscription
              </Typography>
            </Box>
            <Chip
              label={subscription.status}
              size="small"
              color={subscriptionStatusColor(subscription.status)}
            />
            {subscription.isTrial && <Chip label="Trial" size="small" color="warning" />}
            {subscription.isThresholdReached && (
              <Chip label="Threshold reached" size="small" color="error" variant="outlined" />
            )}
            <Chip
              icon={<AutorenewIcon />}
              label={subscription.autoRenew ? 'Auto-renew on' : 'Auto-renew off'}
              size="small"
              variant="outlined"
            />
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {subscription.subscriptionId}
          </Typography>

          <Divider />

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField label="Billing cycle" value={subscription.billingCycle} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField label="Start date" value={formatDateTime(subscription.startDate)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField label="End date" value={formatDateTime(subscription.endDate)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField
                label="Usage reset"
                value={formatDateOnly(subscription.usageResetDate)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField
                label="Grace period ends"
                value={formatDateOnly(subscription.gracePeriodDate)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField label="Plan ID" value={subscription.planId} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField
                label="Included attributes tracked"
                value={subscription.limitsAndUsages.length}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <DetailField label="Created" value={formatDateTime(subscription.createdAt)} />
            </Grid>
            {subscription.gracePeriodLastNotifiedAt && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <DetailField
                  label="Grace last notified"
                  value={formatDateTime(subscription.gracePeriodLastNotifiedAt)}
                />
              </Grid>
            )}
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  )
}
