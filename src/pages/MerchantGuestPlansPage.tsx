import { useCallback, useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import RefreshIcon from '@mui/icons-material/Refresh'
import { listGuestPlans } from '../api/merchant'
import { ApiRequestError } from '../api/client'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { PageHeader } from '../components/layout/PageHeader'
import { useApiTransaction } from '../hooks/useApiTransaction'
import { PlanDetailView } from '../components/plans/PlanDetailView'
import type { PlanDetail } from '../types/subscription'

export function MerchantGuestPlansPage() {
  const [plans, setPlans] = useState<PlanDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { transaction, execute } = useApiTransaction()

  const livePayload = useMemo(() => ({}), [])

  const loadPlans = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await execute(
        {},
        () => listGuestPlans(),
        'GET /api/v1/merchant/subscription/guest-plans',
      )
      setPlans(result)
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load guest plans'
      setError(message)
      setPlans([])
    } finally {
      setLoading(false)
    }
  }, [execute])

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Public catalog"
        title="Guest plans"
        description="Public, active subscription plans available without merchant context. Custom and non-active plans are excluded."
        apiEndpoint="GET /api/v1/merchant/subscription/guest-plans"
        backTo="/"
        backLabel="Back to home"
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => void loadPlans()}
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
            Loading guest plans…
          </Typography>
        </Stack>
      )}

      {!loading && error && (
        <Alert severity="error" action={<Button onClick={() => void loadPlans()}>Retry</Button>}>
          {error}
        </Alert>
      )}

      {!loading && !error && plans.length === 0 && (
        <Alert severity="info">No public active plans are available.</Alert>
      )}

      {!loading &&
        !error &&
        plans.map((plan) => (
          <Stack key={plan.id} spacing={1}>
            <Typography variant="h6">{plan.planName}</Typography>
            <PlanDetailView plan={plan} />
          </Stack>
        ))}

      <ApiTransactionInspector
        livePayload={livePayload}
        livePayloadTitle="Guest plans request"
        transaction={transaction}
      />
    </Stack>
  )
}
