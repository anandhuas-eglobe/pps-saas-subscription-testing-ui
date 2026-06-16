import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import RefreshIcon from '@mui/icons-material/Refresh'
import StorefrontIcon from '@mui/icons-material/Storefront'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { getActivePlanAddons, getActiveSubscription } from '../api/merchant'
import { ApiRequestError } from '../api/client'
import { PageHeader } from '../components/layout/PageHeader'
import { ActivePlanAddonsPanel } from '../components/merchant/ActivePlanAddonsPanel'
import { ActiveSubscriptionSummary } from '../components/merchant/ActiveSubscriptionSummary'
import { SubscriptionLimitsAndUsagesPanel } from '../components/merchant/SubscriptionLimitsAndUsagesPanel'
import { PlanDetailView } from '../components/plans/PlanDetailView'
import type { ActivePlanAddonsResponse, ActiveSubscriptionResponse } from '../types/subscription'

type ActiveSubscriptionTab = 'overview' | 'limits' | 'addons'

function parseActiveSubscriptionTab(value: string | null): ActiveSubscriptionTab {
  if (value === 'limits' || value === 'addons') {
    return value
  }
  return 'overview'
}

export function ActiveSubscriptionPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<ActiveSubscriptionResponse | null>(null)
  const [addonsData, setAddonsData] = useState<ActivePlanAddonsResponse | null>(null)
  const activeTab = parseActiveSubscriptionTab(searchParams.get('tab'))
  const [loading, setLoading] = useState(true)
  const [addonsLoading, setAddonsLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addonsError, setAddonsError] = useState<string | null>(null)

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
    setAddonsData(null)
    setAddonsError(null)

    try {
      const result = await getActiveSubscription()
      setData(result)
      void loadAddons()
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

  useEffect(() => {
    void loadSubscription()
  }, [loadSubscription])

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Merchant subscription"
        title="Active subscription"
        description="View subscription status, INCLUDED attribute usage, subscribed plan details, and purchased add-ons."
        apiEndpoint="GET /api/v1/merchant/subscription/active · GET /api/v1/merchant/subscription/active-plan/addons"
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
          <ActiveSubscriptionSummary subscription={data.subscription} planName={data.plan.planName} />

          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={(_, value: ActiveSubscriptionTab) => {
                if (value === 'overview') {
                  setSearchParams({})
                  return
                }
                setSearchParams({ tab: value })
              }}
              aria-label="Active subscription sections"
            >
              <Tab label="Overview" value="overview" />
              <Tab
                label={`Limits & usage (${data.subscription.limitsAndUsages.length})`}
                value="limits"
              />
              <Tab
                label={`Active add-ons (${addonsData?.addons.length ?? '…'})`}
                value="addons"
              />
            </Tabs>
          </Box>

          {activeTab === 'overview' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Subscribed plan details
              </Typography>
              <PlanDetailView plan={data.plan} />
            </Box>
          )}

          {activeTab === 'limits' && (
            <SubscriptionLimitsAndUsagesPanel
              limitsAndUsages={data.subscription.limitsAndUsages}
              isThresholdReached={data.subscription.isThresholdReached}
            />
          )}

          {activeTab === 'addons' && (
            <ActivePlanAddonsPanel
              addons={addonsData?.addons ?? []}
              planCurrency={addonsData?.plan.baseCurrency ?? data.plan.baseCurrency}
              loading={addonsLoading}
              error={addonsError}
              onRetry={() => void loadAddons()}
            />
          )}
        </Stack>
      )}
    </Stack>
  )
}
