import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import RefreshIcon from '@mui/icons-material/Refresh'
import StorefrontIcon from '@mui/icons-material/Storefront'
import { Link as RouterLink } from 'react-router-dom'
import { getActiveSubscription } from '../api/merchant'
import { ApiRequestError } from '../api/client'
import { PageHeader } from '../components/layout/PageHeader'
import { ActiveSubscriptionSummary } from '../components/merchant/ActiveSubscriptionSummary'
import { PlanDetailView } from '../components/plans/PlanDetailView'
import type { ActiveSubscriptionResponse } from '../types/subscription'

export function ActiveSubscriptionPage() {
  const [data, setData] = useState<ActiveSubscriptionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSubscription = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotFound(false)
    setData(null)

    try {
      const result = await getActiveSubscription()
      setData(result)
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setNotFound(true)
        return
      }

      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load active subscription'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSubscription()
  }, [loadSubscription])

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Merchant subscription"
        title="Active subscription"
        description="View the merchant's current subscription status, billing period, and the full subscribed plan configuration."
        apiEndpoint="GET /api/v1/merchant/subscription/active"
        backTo="/"
        backLabel="Back to home"
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => void loadSubscription()}
            disabled={loading}
          >
            Refresh
          </Button>
        }
      />

      {loading && (
        <Stack sx={{ py: 10, alignItems: 'center' }}>
          <CircularProgress />
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Loading active subscription...
          </Typography>
        </Stack>
      )}

      {!loading && error && (
        <Stack spacing={2}>
          <Alert severity="error">{error}</Alert>
          <Button variant="outlined" onClick={() => void loadSubscription()}>
            Retry
          </Button>
        </Stack>
      )}

      {!loading && notFound && (
        <Alert
          severity="info"
          action={
            <Button
              component={RouterLink}
              to="/merchant/plans"
              color="inherit"
              size="small"
              startIcon={<StorefrontIcon />}
            >
              Browse plans
            </Button>
          }
        >
          No active subscription found for this merchant. Purchase a plan from the merchant plans
          page to create one.
        </Alert>
      )}

      {!loading && !error && !notFound && data && (
        <Stack spacing={3}>
          <ActiveSubscriptionSummary
            subscription={data.subscription}
            planName={data.plan.planName}
          />
          <Box>
            <Typography variant="h6" gutterBottom>
              Subscribed plan details
            </Typography>
            <PlanDetailView plan={data.plan} />
          </Box>
        </Stack>
      )}
    </Stack>
  )
}
