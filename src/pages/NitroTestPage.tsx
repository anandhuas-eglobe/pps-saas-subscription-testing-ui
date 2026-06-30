import { useCallback, useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import BoltIcon from '@mui/icons-material/Bolt'
import RefreshIcon from '@mui/icons-material/Refresh'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import { fetchFeatures } from '../api/features'
import { createPlan } from '../api/plans'
import { ApiRequestError } from '../api/client'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { NitroMerchantLifecyclePanel } from '../components/nitro/NitroMerchantLifecyclePanel'
import { NitroPlansListPanel } from '../components/nitro/NitroPlansListPanel'
import { NitroTestHero } from '../components/nitro/NitroTestHero'
import type { CatalogFeature } from '../types/subscription'
import { ApiErrorAlert } from '../components/ApiErrorAlert'
import { useApiTransaction } from '../hooks/useApiTransaction'
import {
  NITRO_PLAN_TIERS,
  buildNitroTestPlanPayload,
  summarizeNitroPlanPayload,
  validateNitroCatalog,
  type NitroPlanTier,
} from '../utils/nitroTestPlanBuilder'

interface NitroCreateResult {
  tier: NitroPlanTier
  planId: string
  planName: string
  message: string
  createdAt: string
  summary: ReturnType<typeof summarizeNitroPlanPayload>
}

export function NitroTestPage() {
  const [catalog, setCatalog] = useState<CatalogFeature[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [creatingTier, setCreatingTier] = useState<number | null>(null)
  const [previewTier, setPreviewTier] = useState<NitroPlanTier>(NITRO_PLAN_TIERS[0])
  const [trialEnabledByTier, setTrialEnabledByTier] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(NITRO_PLAN_TIERS.map((tier) => [tier.level, false])),
  )
  const [plansRefreshKey, setPlansRefreshKey] = useState(0)
  const [lastResult, setLastResult] = useState<NitroCreateResult | null>(null)
  const { transaction, execute } = useApiTransaction()

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true)
    setCatalogError(null)
    try {
      const features = await fetchFeatures()
      setCatalog(features)
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.body.message ?? error.message
          : error instanceof Error
            ? error.message
            : 'Failed to load feature catalog'
      setCatalogError(message)
      setCatalog([])
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  const catalogIssues = validateNitroCatalog(catalog)
  const canCreate = catalog.length > 0 && catalogIssues.length === 0 && !catalogLoading

  const previewPayload = useMemo(() => {
    if (!canCreate) return null
    return buildNitroTestPlanPayload(catalog, previewTier, {
      uniqueSuffix: 'preview',
      trialEnabled: trialEnabledByTier[previewTier.level] ?? false,
    })
  }, [canCreate, catalog, previewTier, trialEnabledByTier])

  const handleCreatePlan = async (tier: NitroPlanTier) => {
    if (!canCreate) return

    setCreatingTier(tier.level)
    setPreviewTier(tier)

    try {
      const tierTrialEnabled = trialEnabledByTier[tier.level] ?? false
      const payload = buildNitroTestPlanPayload(catalog, tier, { trialEnabled: tierTrialEnabled })
      const response = await execute(
        payload,
        () => createPlan(payload),
        'POST /api/v1/admin/plans/create-plan',
      )
      const summary = summarizeNitroPlanPayload(payload)

      setLastResult({
        tier,
        planId: response.planId,
        planName: payload.planName,
        message: response.message,
        createdAt: new Date().toISOString(),
        summary,
      })
      setPlansRefreshKey((current) => current + 1)
    } catch {
      // Transaction state captures the error for ApiTransactionInspector.
    } finally {
      setCreatingTier(null)
    }
  }

  return (
    <Stack spacing={3}>
      <NitroTestHero
        catalogCount={catalog.length}
        catalogReady={!catalogLoading && !catalogError && catalogIssues.length === 0}
        actions={
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={() => void loadCatalog()}
            disabled={catalogLoading}
            sx={{
              flexShrink: 0,
              bgcolor: 'rgba(255,255,255,0.16)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.22)',
              backdropFilter: 'blur(8px)',
              boxShadow: 'none',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.24)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              },
            }}
          >
            Reload catalog
          </Button>
        }
      />

      <Alert severity="info" icon={<BoltIcon />}>
        <strong>MONTHLY_ORDER_VOLUME</strong> always uses <strong>VOLUME_PRICE</strong> (standard
        flow). Required attributes <strong>NUM_USERS</strong> and{' '}
        <strong>MONTHLY_ORDER_VOLUME</strong> are always INCLUDED. Higher tiers add ADDON attribute
        features, volume-priced linkable attributes, and simple features with varied pricing.
      </Alert>

      {catalogLoading && (
        <Stack sx={{ py: 8, alignItems: 'center' }}>
          <CircularProgress />
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Loading feature catalog…
          </Typography>
        </Stack>
      )}

      {!catalogLoading && catalogError && (
        <Alert severity="error" action={<Button onClick={() => void loadCatalog()}>Retry</Button>}>
          {catalogError}
        </Alert>
      )}

      {!catalogLoading && catalogIssues.length > 0 && (
        <Alert severity="warning">
          <Typography variant="subtitle2" gutterBottom>
            Catalog incomplete for Nitro Test
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {catalogIssues.map((issue) => (
              <li key={issue}>
                <Typography variant="body2">{issue}</Typography>
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {!catalogLoading && !catalogError && (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <RocketLaunchIcon color="primary" />
                <Typography variant="h6">Create plans</Typography>
                <Chip label={`${catalog.length} catalog features`} size="small" variant="outlined" />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Each button creates a draft plan immediately — no form wizard. Tiers are cumulative:
                Enterprise includes everything from Pro and below, with scaled-up pricing.
              </Typography>

              <Divider />

              <Grid container spacing={2}>
                {NITRO_PLAN_TIERS.map((tier) => {
                  const isCreating = creatingTier === tier.level
                  const tierTrialEnabled = trialEnabledByTier[tier.level] ?? false
                  const preview = canCreate
                    ? summarizeNitroPlanPayload(
                        buildNitroTestPlanPayload(catalog, tier, {
                          uniqueSuffix: 'preview',
                          trialEnabled: tierTrialEnabled,
                        }),
                      )
                    : null

                  return (
                    <Grid key={tier.level} size={{ xs: 12, sm: 6, lg: 4 }}>
                      <Card
                        variant="outlined"
                        sx={{ height: '100%' }}
                        onMouseEnter={() => setPreviewTier(tier)}
                      >
                        <CardContent>
                          <Stack spacing={1.5} sx={{ height: '100%' }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                              <Chip label={`T${tier.level}`} size="small" color={tier.accent === 'default' ? 'default' : tier.accent} />
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {tier.label}
                              </Typography>
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              {tier.description}
                            </Typography>
                            {preview && (
                              <Typography variant="caption" color="text.secondary">
                                {preview.attributeCount} attrs · {preview.simpleCount} simple ·{' '}
                                {preview.addonCount} addons · {preview.volumePriceCount} volume-priced
                              </Typography>
                            )}
                            <Box sx={{ flex: 1 }} />
                            <FormControlLabel
                              sx={{ m: 0 }}
                              control={
                                <Switch
                                  size="small"
                                  checked={tierTrialEnabled}
                                  onChange={(event) => {
                                    setPreviewTier(tier)
                                    setTrialEnabledByTier((current) => ({
                                      ...current,
                                      [tier.level]: event.target.checked,
                                    }))
                                  }}
                                />
                              }
                              label={
                                <Typography variant="body2">Plan trial</Typography>
                              }
                            />
                            <Button
                              fullWidth
                              variant="contained"
                              color={tier.accent === 'default' ? 'primary' : tier.accent}
                              disabled={!canCreate || creatingTier !== null}
                              startIcon={
                                isCreating ? (
                                  <CircularProgress size={16} color="inherit" />
                                ) : (
                                  <BoltIcon />
                                )
                              }
                              onClick={() => void handleCreatePlan(tier)}
                            >
                              {isCreating ? 'Creating…' : tier.buttonLabel}
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            </Stack>
          </CardContent>
        </Card>
      )}

      <NitroPlansListPanel refreshKey={plansRefreshKey} />

      <NitroMerchantLifecyclePanel />

      {transaction?.lastError != null && <ApiErrorAlert error={transaction.lastError} />}

      {lastResult && (
        <Alert severity="success">
          Created {lastResult.planName} ({lastResult.planId}) — {lastResult.message}
        </Alert>
      )}

      {previewPayload && (
        <ApiTransactionInspector
          livePayload={previewPayload}
          livePayloadTitle={`Create plan payload preview (${previewTier.label})`}
          transaction={transaction}
        />
      )}
    </Stack>
  )
}
