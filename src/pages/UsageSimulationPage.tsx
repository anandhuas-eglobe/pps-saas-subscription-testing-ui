import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import RefreshIcon from '@mui/icons-material/Refresh'
import StorefrontIcon from '@mui/icons-material/Storefront'
import { Link as RouterLink } from 'react-router-dom'
import { getActivePlanAddons, getActiveSubscription } from '../api/merchant'
import { ApiRequestError } from '../api/client'
import { PageHeader } from '../components/layout/PageHeader'
import { AddonUsageSimulationSection } from '../components/merchant/AddonUsageSimulationSection'
import { UsageSimulationPanel } from '../components/merchant/UsageSimulationPanel'
import type { ActivePlanAddonsResponse, ActiveSubscriptionResponse } from '../types/subscription'

export function UsageSimulationPage() {
  const [data, setData] = useState<ActiveSubscriptionResponse | null>(null)
  const [addonsData, setAddonsData] = useState<ActivePlanAddonsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [addonsLoading, setAddonsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addonsError, setAddonsError] = useState<string | null>(null)
  const [refreshingUsage, setRefreshingUsage] = useState(false)

  const loadAddons = useCallback(async () => {
    setAddonsLoading(true)
    setAddonsError(null)

    try {
      const result = await getActivePlanAddons()
      setAddonsData(result)
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load active add-ons'
      setAddonsError(message)
      setAddonsData(null)
    } finally {
      setAddonsLoading(false)
    }
  }, [])

  const loadSubscription = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotFound(false)
    setData(null)

    try {
      const result = await getActiveSubscription()
      setData(result)
      await loadAddons()
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
  }, [loadAddons])

  const refreshUsage = useCallback(async () => {
    setRefreshingUsage(true)

    try {
      const [subscriptionResult, addonsResult] = await Promise.all([
        getActiveSubscription(),
        getActivePlanAddons(),
      ])
      setData(subscriptionResult)
      setAddonsData(addonsResult)
      setAddonsError(null)
    } catch {
      // Keep the last known usage snapshot if a background refresh fails.
    } finally {
      setRefreshingUsage(false)
    }
  }, [])

  useEffect(() => {
    void loadSubscription()
  }, [loadSubscription])

  const hasSubscriptionAttributes = (data?.subscription.limitsAndUsages.length ?? 0) > 0

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Merchant usage"
        title="Usage simulation"
        description="Exercise the merchant usage tracking flow against INCLUDED subscription attributes and purchased add-on attributes: validate capacity, log pending usage, confirm consumption, and remove tracked entities."
        apiEndpoint="GET/POST/PUT/DELETE /api/v1/merchant/usage-tracking/* · GET /api/v1/merchant/subscription/active-plan/addons"
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
        <Stack spacing={3}>
          {hasSubscriptionAttributes ? (
            <>
              <Typography variant="h6">Subscription attributes</Typography>
              <UsageSimulationPanel
                merchantSubscriptionId={data.subscription.subscriptionId}
                limitsAndUsages={data.subscription.limitsAndUsages}
                refreshingUsage={refreshingUsage}
                onUsageUpdated={refreshUsage}
                contextLabel="Included in plan"
              />
            </>
          ) : (
            <Alert severity="info">
              No INCLUDED attribute usage rows on the base subscription. Add-on attribute usage
              simulation is available below when add-ons are active.
            </Alert>
          )}

          <Divider />

          <AddonUsageSimulationSection
            merchantSubscriptionId={data.subscription.subscriptionId}
            addons={addonsData?.addons ?? null}
            loading={addonsLoading}
            error={addonsError}
            onRetry={() => void loadAddons()}
            refreshingUsage={refreshingUsage}
            onUsageUpdated={refreshUsage}
          />
        </Stack>
      )}
    </Stack>
  )
}
