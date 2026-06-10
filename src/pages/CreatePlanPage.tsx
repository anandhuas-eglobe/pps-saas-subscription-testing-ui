import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import CategoryIcon from '@mui/icons-material/Category'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ListAltIcon from '@mui/icons-material/ListAlt'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Link as RouterLink } from 'react-router-dom'
import { fetchFeatures } from '../api/features'
import { createPlan } from '../api/plans'
import { ApiRequestError } from '../api/client'
import { ApiLogPanel } from '../components/ApiLogPanel'
import { ValidationErrorsAlert } from '../components/ValidationErrorsAlert'
import { AttributeFeatureAccordion } from '../components/plans/AttributeFeatureAccordion'
import {
  getRequiredAttributeEntries,
  RequiredAttributesSection,
} from '../components/plans/RequiredAttributesSection'
import { PageHeader } from '../components/layout/PageHeader'
import type {
  ApiResponse,
  AttributeConfig,
  CatalogFeature,
  CreatePlanPayload,
} from '../types/subscription'
import { PlanType } from '../types/subscription'
import {
  buildAttributePlanFeature,
  buildRequiredAttributeFeatures,
  buildSimplePlanFeature,
  createDefaultPlanForm,
  defaultAttributeConfig,
  defaultFeatureConfig,
  isAttributeFeature,
  isSimpleFeature,
  mergeAttributeConfigUpdate,
  mergePlanFeatures,
  REQUIRED_ATTRIBUTE_CODES,
  sanitizeCreatePlanPayload,
} from '../utils/planDefaults'
import {
  extractApiErrors,
  getApiErrorSummary,
  getApiErrorTitle,
} from '../utils/apiErrors'

type SelectedAttributeFeature = {
  featureId: string
  attributeIds: string[]
  configs: Record<string, AttributeConfig>
  linkFlags: Record<string, boolean>
}

export function CreatePlanPage() {
  const [form, setForm] = useState<CreatePlanPayload>(createDefaultPlanForm)
  const [catalog, setCatalog] = useState<CatalogFeature[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const [selectedSimpleIds, setSelectedSimpleIds] = useState<string[]>([])
  const [selectedAttributeFeatures, setSelectedAttributeFeatures] = useState<
    Record<string, SelectedAttributeFeature>
  >({})
  const [requiredAttributeConfigs, setRequiredAttributeConfigs] = useState<
    Record<string, AttributeConfig>
  >({})

  const [submitting, setSubmitting] = useState(false)
  const [createdPlanId, setCreatedPlanId] = useState<string | null>(null)
  const [lastPayload, setLastPayload] = useState<CreatePlanPayload | null>(null)
  const [lastResponse, setLastResponse] = useState<ApiResponse<unknown> | null>(null)
  const [lastError, setLastError] = useState<unknown>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })
  const validationErrorRef = useRef<HTMLDivElement | null>(null)

  const attributeFeatures = useMemo(() => catalog.filter(isAttributeFeature), [catalog])
  const simpleFeatures = useMemo(() => catalog.filter(isSimpleFeature), [catalog])
  const requiredAttributeEntries = useMemo(
    () => getRequiredAttributeEntries(catalog),
    [catalog],
  )
  const optionalAttributeFeatures = useMemo(
    () =>
      attributeFeatures.filter(
        (feature) =>
          !feature.featureAttributes.every((attr) =>
            REQUIRED_ATTRIBUTE_CODES.includes(
              attr.attributeCode as (typeof REQUIRED_ATTRIBUTE_CODES)[number],
            ),
          ),
      ),
    [attributeFeatures],
  )

  const payloadPreview = useMemo(() => {
    const required = buildRequiredAttributeFeatures(catalog, requiredAttributeConfigs)
    const optional = Object.values(selectedAttributeFeatures)
      .map((entry) => {
        const feature = catalog.find((item) => item.id === entry.featureId)
        if (!feature) return null
        return buildAttributePlanFeature(
          feature,
          entry.attributeIds,
          entry.configs,
          entry.linkFlags,
        )
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    const simple = selectedSimpleIds.map((featureId) => buildSimplePlanFeature(featureId))
    const features = mergePlanFeatures([...required, ...optional, ...simple])

    return sanitizeCreatePlanPayload({ ...form, features })
  }, [catalog, form, requiredAttributeConfigs, selectedAttributeFeatures, selectedSimpleIds])

  useEffect(() => {
    if (catalog.length === 0) return

    setRequiredAttributeConfigs((current) => {
      const next = { ...current }
      for (const entry of getRequiredAttributeEntries(catalog)) {
        if (!next[entry.attributeId]) {
          next[entry.attributeId] = defaultAttributeConfig(entry.attributeCode)
        }
      }
      return next
    })
  }, [catalog])

  const validationErrors = useMemo(() => {
    const fromError = extractApiErrors(lastError)
    const fromResponse =
      lastResponse?.success === false ? extractApiErrors(lastResponse) : []
    return [...fromError, ...fromResponse].filter(
      (item, index, list) =>
        list.findIndex(
          (other) =>
            other.field === item.field &&
            other.message === item.message &&
            other.code === item.code,
        ) === index,
    )
  }, [lastError, lastResponse])

  const validationErrorCode =
    (lastError instanceof ApiRequestError ? lastError.body.errorCode : undefined) ??
    lastResponse?.errorCode

  useEffect(() => {
    if (validationErrors.length > 0) {
      validationErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [validationErrors])

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true)
    setCatalogError(null)
    try {
      const features = await fetchFeatures()
      setCatalog(features)
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Failed to load feature catalog')
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  const updateForm = <K extends keyof CreatePlanPayload>(key: K, value: CreatePlanPayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const toggleSimpleFeature = (featureId: string) => {
    setSelectedSimpleIds((current) =>
      current.includes(featureId)
        ? current.filter((id) => id !== featureId)
        : [...current, featureId],
    )
  }

  const toggleOptionalAttributeFeature = (feature: CatalogFeature, enabled: boolean) => {
    setSelectedAttributeFeatures((current) => {
      const next = { ...current }
      if (!enabled) {
        delete next[feature.id]
        return next
      }

      next[feature.id] = {
        featureId: feature.id,
        attributeIds: feature.featureAttributes.map((attr) => attr.id),
        configs: Object.fromEntries(
          feature.featureAttributes.map((attr) => [
            attr.id,
            defaultAttributeConfig(attr.attributeCode),
          ]),
        ),
        linkFlags: Object.fromEntries(
          feature.featureAttributes.map((attr) => [attr.id, false]),
        ),
      }
      return next
    })
  }

  const updateRequiredAttributeConfig = (
    attributeId: string,
    patch: Partial<AttributeConfig>,
  ) => {
    setRequiredAttributeConfigs((current) => {
      const entry = requiredAttributeEntries.find((item) => item.attributeId === attributeId)
      const attributeCode = entry?.attributeCode ?? ''
      return {
        ...current,
        [attributeId]: mergeAttributeConfigUpdate(current[attributeId], patch, attributeCode),
      }
    })
  }

  const updateAttributeConfig = (
    featureId: string,
    attributeId: string,
    patch: Partial<AttributeConfig>,
  ) => {
    setSelectedAttributeFeatures((current) => {
      const entry = current[featureId]
      if (!entry) return current

      const feature = catalog.find((item) => item.id === featureId)
      const attribute = feature?.featureAttributes.find((item) => item.id === attributeId)
      const attributeCode = attribute?.attributeCode ?? ''

      return {
        ...current,
        [featureId]: {
          ...entry,
          configs: {
            ...entry.configs,
            [attributeId]: mergeAttributeConfigUpdate(
              entry.configs[attributeId],
              patch,
              attributeCode,
            ),
          },
        },
      }
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setLastError(null)
    setLastResponse(null)
    setLastPayload(payloadPreview)

    try {
      const result = await createPlan(payloadPreview)
      setLastResponse({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      })
      setCreatedPlanId(result.planId)
      setSnackbar({ open: true, message: result.message, severity: 'success' })
    } catch (error) {
      setLastError(error)
      if (error instanceof ApiRequestError) {
        setLastResponse(error.body)
      }
      setSnackbar({
        open: true,
        message: getApiErrorSummary(error),
        severity: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Plan creation"
          title="Create subscription plan"
          description="Build and test plans against the admin API, feature catalog, and status workflows."
          apiEndpoint="POST /api/v1/admin/plans/create-plan"
          actions={
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => void loadCatalog()}
              disabled={catalogLoading}
            >
              Reload features
            </Button>
          }
        />

        {createdPlanId && (
          <Alert
            severity="success"
            action={
              <Button
                color="inherit"
                size="small"
                component={RouterLink}
                to="/plans"
                startIcon={<ListAltIcon />}
              >
                View in list
              </Button>
            }
          >
            Plan created successfully. ID: {createdPlanId}
          </Alert>
        )}

        {validationErrors.length > 0 && (
          <Box ref={validationErrorRef}>
            <ValidationErrorsAlert
              title={getApiErrorTitle(lastError ?? lastResponse)}
              errors={validationErrors}
              errorCode={validationErrorCode}
              subtitle="The API rejected this plan payload. Review each item below and update the form."
            />
          </Box>
        )}

        <Stack component="form" spacing={3} onSubmit={handleSubmit}>
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
                    <AddCircleOutlineOutlinedIcon color="primary" />
                    <Typography variant="h6">Plan details</Typography>
                  </Stack>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 8 }}>
                      <TextField
                        fullWidth
                        label="Plan name"
                        value={form.planName}
                        onChange={(event) => updateForm('planName', event.target.value)}
                        required
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <FormControl fullWidth>
                        <InputLabel>Plan type</InputLabel>
                        <Select
                          label="Plan type"
                          value={form.planType}
                          onChange={(event) =>
                            updateForm('planType', event.target.value as CreatePlanPayload['planType'])
                          }
                        >
                          <MenuItem value={PlanType.PUBLIC}>PUBLIC</MenuItem>
                          <MenuItem value={PlanType.CUSTOM}>CUSTOM</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Description"
                        multiline
                        rows={3}
                        value={form.planDescription}
                        onChange={(event) => updateForm('planDescription', event.target.value)}
                        required
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Monthly price"
                        type="number"
                        value={form.baseMonthlyPrice}
                        onChange={(event) =>
                          updateForm('baseMonthlyPrice', Number(event.target.value))
                        }
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Yearly price"
                        type="number"
                        value={form.baseYearlyPrice}
                        onChange={(event) =>
                          updateForm('baseYearlyPrice', Number(event.target.value))
                        }
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Currency"
                        value={form.baseCurrency ?? 'USD'}
                        onChange={(event) => updateForm('baseCurrency', event.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Overage auto-charge"
                        type="number"
                        value={form.overageAutoChargeAmount}
                        onChange={(event) =>
                          updateForm('overageAutoChargeAmount', Number(event.target.value))
                        }
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Overage max allowed"
                        type="number"
                        value={form.overageMaxAllowedAmount}
                        onChange={(event) =>
                          updateForm('overageMaxAllowedAmount', Number(event.target.value))
                        }
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2.5 }} />

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={form.isTrialPeriodEnabled}
                            onChange={(event) => {
                              const enabled = event.target.checked
                              setForm((current) => ({
                                ...current,
                                isTrialPeriodEnabled: enabled,
                                trialPeriod: enabled ? (current.trialPeriod ?? 14) : null,
                              }))
                            }}
                          />
                        }
                        label="Trial period enabled"
                      />
                      {form.isTrialPeriodEnabled && (
                        <TextField
                          fullWidth
                          sx={{ mt: 1 }}
                          label="Trial days"
                          type="number"
                          slotProps={{ htmlInput: { min: 1 } }}
                          value={form.trialPeriod ?? 14}
                          onChange={(event) =>
                            updateForm('trialPeriod', Math.max(1, Number(event.target.value)))
                          }
                        />
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={form.isGracePeriodEnabled}
                            onChange={(event) => {
                              const enabled = event.target.checked
                              setForm((current) => ({
                                ...current,
                                isGracePeriodEnabled: enabled,
                                gracePeriod: enabled ? (current.gracePeriod ?? 15) : null,
                              }))
                            }}
                          />
                        }
                        label="Grace period enabled"
                      />
                      {form.isGracePeriodEnabled && (
                        <TextField
                          fullWidth
                          sx={{ mt: 1 }}
                          label="Grace days"
                          type="number"
                          slotProps={{ htmlInput: { min: 1 } }}
                          value={form.gracePeriod ?? 15}
                          onChange={(event) =>
                            updateForm('gracePeriod', Math.max(1, Number(event.target.value)))
                          }
                        />
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
                    <CategoryIcon color="primary" />
                    <Typography variant="h6">Feature catalog</Typography>
                  </Stack>

                  {catalogLoading && (
                    <Stack direction="row" spacing={1.5} sx={{ py: 2, alignItems: 'center' }}>
                      <CircularProgress size={22} />
                      <Typography color="text.secondary">
                        Loading features from GET /api/v1/features...
                      </Typography>
                    </Stack>
                  )}

                  {catalogError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {catalogError}
                    </Alert>
                  )}

                  <Alert icon={<InfoOutlinedIcon />} severity="info" sx={{ mb: 2 }}>
                    These attributes are always included in every plan and must use{' '}
                    <strong>INCLUDED</strong> pricing.
                  </Alert>

                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                    Required attributes
                  </Typography>
                  <Box sx={{ mb: 3 }}>
                    <RequiredAttributesSection
                      entries={requiredAttributeEntries}
                      configs={requiredAttributeConfigs}
                      onConfigChange={updateRequiredAttributeConfig}
                    />
                  </Box>

                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                    Optional attribute features
                  </Typography>
                  <Stack spacing={1.5} sx={{ mb: 3 }}>
                    {optionalAttributeFeatures.map((feature) => (
                      <AttributeFeatureAccordion
                        key={feature.id}
                        feature={feature}
                        selected={Boolean(selectedAttributeFeatures[feature.id])}
                        configs={selectedAttributeFeatures[feature.id]?.configs ?? {}}
                        linkFlags={selectedAttributeFeatures[feature.id]?.linkFlags ?? {}}
                        onToggle={(enabled) => toggleOptionalAttributeFeature(feature, enabled)}
                        onConfigChange={(attributeId, patch) =>
                          updateAttributeConfig(feature.id, attributeId, patch)
                        }
                        onLinkFlagChange={(attributeId, value) =>
                          setSelectedAttributeFeatures((current) => ({
                            ...current,
                            [feature.id]: {
                              ...current[feature.id],
                              linkFlags: {
                                ...current[feature.id].linkFlags,
                                [attributeId]: value,
                              },
                            },
                          }))
                        }
                      />
                    ))}
                  </Stack>

                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                    Simple features
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, minmax(0, 1fr))',
                        md: 'repeat(3, minmax(0, 1fr))',
                      },
                      gap: 1.5,
                    }}
                  >
                    {simpleFeatures.map((feature) => {
                      const checked = selectedSimpleIds.includes(feature.id)
                      return (
                        <Card
                          key={feature.id}
                          variant="outlined"
                          sx={{
                            cursor: 'pointer',
                            borderColor: checked ? 'primary.main' : 'divider',
                            bgcolor: checked ? 'rgba(79, 70, 229, 0.05)' : 'background.paper',
                          }}
                          onClick={() => toggleSimpleFeature(feature.id)}
                        >
                          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <FormControlLabel
                              control={<Switch checked={checked} />}
                              label={
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {feature.name}
                                  </Typography>
                                  <Chip label={feature.code} size="small" sx={{ mt: 0.5 }} />
                                </Box>
                              }
                              sx={{ m: 0, alignItems: 'flex-start' }}
                            />
                          </CardContent>
                        </Card>
                      )
                    })}
                  </Box>

                  {selectedSimpleIds.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                      Selected simple features use default INCLUDED config (
                      {defaultFeatureConfig().planFeaturePriceMonthly} monthly /{' '}
                      {defaultFeatureConfig().planFeaturePriceYearly} yearly).
                    </Typography>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Payload preview
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: '#0f172a',
                      color: '#e2e8f0',
                      fontSize: '0.78rem',
                      overflow: 'auto',
                      maxHeight: 360,
                    }}
                  >
                    {JSON.stringify(payloadPreview, null, 2)}
                  </Box>
                </CardContent>
              </Card>

              <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={submitting || catalogLoading}
                  startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <AddCircleOutlineOutlinedIcon />}
                >
                  {submitting ? 'Creating plan...' : 'Create plan'}
                </Button>
              </Stack>
        </Stack>

        {(lastPayload != null || lastResponse != null || lastError != null) && (
          <ApiLogPanel
            title="Last API interaction"
            payload={lastPayload ?? undefined}
            response={lastResponse}
            error={lastError}
          />
        )}
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.severity === 'error' ? 8000 : 5000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
          variant="filled"
          sx={{ width: '100%', maxWidth: 420 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}
