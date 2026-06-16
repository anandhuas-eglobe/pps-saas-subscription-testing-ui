import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
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
import { UsageSimulationPanel } from '../components/merchant/UsageSimulationPanel'
import type { ActiveSubscriptionResponse } from '../types/subscription'

export function UsageSimulationPage() {
  const [data, setData] = useState<ActiveSubscriptionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshingUsage, setRefreshingUsage] = useState(false)

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

  const refreshUsage = useCallback(async () => {
    setRefreshingUsage(true)

    try {
      const result = await getActiveSubscription()
      setData(result)
    } catch {
      // Keep the last known usage snapshot if a background refresh fails.
    } finally {
      setRefreshingUsage(false)
    }
  }, [])

  useEffect(() => {
    void loadSubscription()
  }, [loadSubscription])

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Merchant usage"
        title="Usage simulation"
        description="Exercise the merchant usage tracking flow against your active subscription: validate capacity, log pending usage, confirm consumption, and remove tracked entities."
        apiEndpoint="GET/POST/PUT/DELETE /api/v1/merchant/usage-tracking/*"
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
            Loading active subscription context...
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
          No active subscription found for this merchant. Purchase a plan before simulating usage
          tracking.
        </Alert>
      )}

      {!loading && !error && !notFound && data && (
        <UsageSimulationPanel
          merchantSubscriptionId={data.subscription.subscriptionId}
          limitsAndUsages={data.subscription.limitsAndUsages}
          refreshingUsage={refreshingUsage}
          onUsageUpdated={refreshUsage}
        />
      )}
    </Stack>
  )
}
