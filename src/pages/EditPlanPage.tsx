import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import SaveIcon from '@mui/icons-material/Save'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { fetchFeatures } from '../api/features'
import { getPlanById, updatePlan } from '../api/plans'
import { ApiRequestError } from '../api/client'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { ValidationErrorsAlert } from '../components/ValidationErrorsAlert'
import { CreatePlanDetailsSection } from '../components/plans/CreatePlanDetailsSection'
import { CreatePlanFeatureCatalogSection } from '../components/plans/CreatePlanFeatureCatalogSection'
import { getRequiredAttributeEntries } from '../components/plans/RequiredAttributesSection'
import { PageHeader } from '../components/layout/PageHeader'
import { useApiTransaction } from '../hooks/useApiTransaction'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import type {
  AttributeConfig,
  CatalogFeature,
  CreatePlanPayload,
  FeatureConfig,
  PlanDetail,
} from '../types/subscription'
import { isDraftPlan } from '../utils/planDisplay'
import {
  applyLinkToMonthlyOrderVolumeFlag,
  buildCreatePlanPayload,
  defaultAttributeConfig,
  defaultFeatureConfig,
  getOptionalFeatureAttributes,
  isAttributeFeature,
  isSimpleFeature,
  mergeAttributeConfigUpdate,
  mergeFeatureConfigUpdate,
} from '../utils/planDefaults'
import {
  createPlanPayloadToUpdatePayload,
  planDetailToFormState,
  type SelectedAttributeFeatureState,
} from '../utils/planDetailForm'
import {
  extractApiErrors,
  getApiErrorSummary,
  getApiErrorTitle,
} from '../utils/apiErrors'

export function EditPlanPage() {
  const { planId } = useParams<{ planId: string }>()
  const navigate = useNavigate()

  const [plan, setPlan] = useState<PlanDetail | null>(null)
  const [planLoading, setPlanLoading] = useState(true)
  const [planError, setPlanError] = useState<string | null>(null)
  const [formInitialized, setFormInitialized] = useState(false)

  const [form, setForm] = useState<CreatePlanPayload | null>(null)
  const [catalog, setCatalog] = useState<CatalogFeature[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const [selectedSimpleFeatures, setSelectedSimpleFeatures] = useState<
    Record<string, FeatureConfig>
  >({})
  const [selectedAttributeFeatures, setSelectedAttributeFeatures] = useState<
    Record<string, SelectedAttributeFeatureState>
  >({})
  const [requiredAttributeConfigs, setRequiredAttributeConfigs] = useState<
    Record<string, AttributeConfig>
  >({})

  const [submitting, setSubmitting] = useState(false)
  const { transaction, execute, recordSuccess, recordError } = useApiTransaction()
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
        (feature) => getOptionalFeatureAttributes(feature).length > 0,
      ),
    [attributeFeatures],
  )

  const payloadSnapshot = useMemo(() => {
    if (!form) return null

    return {
      form,
      catalog,
      requiredAttributeConfigs,
      selectedAttributeFeatures,
      selectedSimpleFeatures,
    }
  }, [form, catalog, requiredAttributeConfigs, selectedAttributeFeatures, selectedSimpleFeatures])

  const debouncedPayloadSnapshot = useDebouncedValue(payloadSnapshot, 400)

  const submitPayload = useMemo(() => {
    if (!payloadSnapshot) return null

    return createPlanPayloadToUpdatePayload(
      buildCreatePlanPayload(
        payloadSnapshot.form,
        payloadSnapshot.catalog,
        payloadSnapshot.requiredAttributeConfigs,
        payloadSnapshot.selectedAttributeFeatures,
        payloadSnapshot.selectedSimpleFeatures,
      ),
    )
  }, [payloadSnapshot])

  const previewPayload = useMemo(() => {
    if (!debouncedPayloadSnapshot) return null

    return buildCreatePlanPayload(
      debouncedPayloadSnapshot.form,
      debouncedPayloadSnapshot.catalog,
      debouncedPayloadSnapshot.requiredAttributeConfigs,
      debouncedPayloadSnapshot.selectedAttributeFeatures,
      debouncedPayloadSnapshot.selectedSimpleFeatures,
    )
  }, [debouncedPayloadSnapshot])

  const validationErrors = useMemo(() => {
    const fromError = extractApiErrors(transaction?.lastError)
    const fromResponse =
      transaction?.lastResponse?.success === false
        ? extractApiErrors(transaction.lastResponse)
        : []
    return [...fromError, ...fromResponse].filter(
      (item, index, list) =>
        list.findIndex(
          (other) =>
            other.field === item.field &&
            other.message === item.message &&
            other.code === item.code,
        ) === index,
    )
  }, [transaction])

  const validationErrorCode =
    (transaction?.lastError instanceof ApiRequestError
      ? transaction.lastError.body.errorCode
      : undefined) ?? transaction?.lastResponse?.errorCode

  useEffect(() => {
    if (validationErrors.length > 0) {
      validationErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [validationErrors])

  const loadPlan = useCallback(async () => {
    if (!planId) {
      setPlanError('Plan ID is missing from the URL.')
      setPlanLoading(false)
      return
    }

    setPlanLoading(true)
    setPlanError(null)
    setFormInitialized(false)

    try {
      const detail = await execute(
        { planId },
        () => getPlanById(planId),
        `GET /api/v1/admin/plans/${planId}`,
      )
      setPlan(detail)
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load plan'
      setPlanError(message)
      setPlan(null)
    } finally {
      setPlanLoading(false)
    }
  }, [planId, execute])

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true)
    setCatalogError(null)
    try {
      const features = await execute({}, () => fetchFeatures(), 'GET /api/v1/features')
      setCatalog(features)
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Failed to load feature catalog')
    } finally {
      setCatalogLoading(false)
    }
  }, [execute])

  useEffect(() => {
    void loadPlan()
    void loadCatalog()
  }, [loadPlan, loadCatalog])

  useEffect(() => {
    if (!plan || catalog.length === 0 || formInitialized) {
      return
    }

    const state = planDetailToFormState(plan)
    setForm(state.form)
    setRequiredAttributeConfigs(state.requiredAttributeConfigs)
    setSelectedAttributeFeatures(state.selectedAttributeFeatures)
    setSelectedSimpleFeatures(state.selectedSimpleFeatures)
    setFormInitialized(true)
  }, [plan, catalog, formInitialized])

  useEffect(() => {
    if (catalog.length === 0 || !formInitialized) return

    setRequiredAttributeConfigs((current) => {
      const next = { ...current }
      for (const entry of getRequiredAttributeEntries(catalog)) {
        if (!next[entry.attributeId]) {
          next[entry.attributeId] = defaultAttributeConfig(entry.attributeCode)
        }
      }
      return next
    })
  }, [catalog, formInitialized])

  const updateForm = useCallback(<K extends keyof CreatePlanPayload>(key: K, value: CreatePlanPayload[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current))
  }, [])

  const handleTrialToggle = useCallback((enabled: boolean) => {
    setForm((current) =>
      current
        ? {
            ...current,
            isTrialPeriodEnabled: enabled,
            trialPeriod: enabled ? (current.trialPeriod ?? 14) : null,
          }
        : current,
    )
  }, [])

  const handleGraceToggle = useCallback((enabled: boolean) => {
    setForm((current) =>
      current
        ? {
            ...current,
            isGracePeriodEnabled: enabled,
            gracePeriod: enabled ? (current.gracePeriod ?? 15) : null,
          }
        : current,
    )
  }, [])

  const toggleSimpleFeature = useCallback((featureId: string, enabled: boolean) => {
    setSelectedSimpleFeatures((current) => {
      const next = { ...current }
      if (!enabled) {
        delete next[featureId]
        return next
      }

      next[featureId] = current[featureId] ?? defaultFeatureConfig()
      return next
    })
  }, [])

  const updateSimpleFeatureConfig = useCallback(
    (featureId: string, patch: Partial<FeatureConfig>) => {
      setSelectedSimpleFeatures((current) => {
        if (!(featureId in current)) return current

        return {
          ...current,
          [featureId]: mergeFeatureConfigUpdate(current[featureId], patch),
        }
      })
    },
    [],
  )

  const toggleOptionalAttributeFeature = useCallback((featureId: string, enabled: boolean) => {
    setSelectedAttributeFeatures((current) => {
      const next = { ...current }
      if (!enabled) {
        delete next[featureId]
        return next
      }

      const feature = catalog.find((item) => item.id === featureId)
      if (!feature) {
        return current
      }

      const optionalAttributes = getOptionalFeatureAttributes(feature)

      next[featureId] = {
        featureId: feature.id,
        attributeIds: optionalAttributes.map((attr) => attr.id),
        configs: Object.fromEntries(
          optionalAttributes.map((attr) => [
            attr.id,
            defaultAttributeConfig(attr.attributeCode),
          ]),
        ),
        linkFlags: Object.fromEntries(
          optionalAttributes.map((attr) => [attr.id, false]),
        ),
      }
      return next
    })
  }, [catalog])

  const toggleOptionalAttribute = useCallback(
    (featureId: string, attributeId: string, enabled: boolean) => {
      setSelectedAttributeFeatures((current) => {
        const entry = current[featureId]
        if (!entry) return current

        const feature = catalog.find((item) => item.id === featureId)
        const attribute = feature?.featureAttributes.find((item) => item.id === attributeId)
        if (!feature || !attribute) return current

        const attributeIds = enabled
          ? [...new Set([...entry.attributeIds, attributeId])]
          : entry.attributeIds.filter((id) => id !== attributeId)

        if (attributeIds.length === 0) {
          const next = { ...current }
          delete next[featureId]
          return next
        }

        return {
          ...current,
          [featureId]: {
            ...entry,
            attributeIds,
            configs: {
              ...entry.configs,
              ...(enabled && !entry.configs[attributeId]
                ? { [attributeId]: defaultAttributeConfig(attribute.attributeCode) }
                : {}),
            },
            linkFlags: {
              ...entry.linkFlags,
              ...(enabled && entry.linkFlags[attributeId] == null
                ? { [attributeId]: false }
                : {}),
            },
          },
        }
      })
    },
    [catalog],
  )

  const updateRequiredAttributeConfig = useCallback(
    (attributeId: string, patch: Partial<AttributeConfig>) => {
      setRequiredAttributeConfigs((current) => {
        const entry = requiredAttributeEntries.find((item) => item.attributeId === attributeId)
        const attributeCode = entry?.attributeCode ?? ''
        return {
          ...current,
          [attributeId]: mergeAttributeConfigUpdate(current[attributeId], patch, attributeCode),
        }
      })
    },
    [requiredAttributeEntries],
  )

  const updateAttributeConfig = useCallback(
    (featureId: string, attributeId: string, patch: Partial<AttributeConfig>) => {
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
              [attributeId]: applyLinkToMonthlyOrderVolumeFlag(
                mergeAttributeConfigUpdate(
                  entry.configs[attributeId],
                  patch,
                  attributeCode,
                ),
                entry.linkFlags[attributeId] ?? false,
                attributeCode,
              ),
            },
          },
        }
      })
    },
    [catalog],
  )

  const updateOptionalLinkFlag = useCallback(
    (featureId: string, attributeId: string, value: boolean) => {
      setSelectedAttributeFeatures((current) => {
        const entry = current[featureId]
        if (!entry) return current

        const feature = catalog.find((item) => item.id === featureId)
        const attribute = feature?.featureAttributes.find((item) => item.id === attributeId)
        const attributeCode = attribute?.attributeCode ?? ''
        const currentConfig =
          entry.configs[attributeId] ?? defaultAttributeConfig(attributeCode)

        return {
          ...current,
          [featureId]: {
            ...entry,
            linkFlags: {
              ...entry.linkFlags,
              [attributeId]: value,
            },
            configs: {
              ...entry.configs,
              [attributeId]: applyLinkToMonthlyOrderVolumeFlag(
                currentConfig,
                value,
                attributeCode,
              ),
            },
          },
        }
      })
    },
    [catalog],
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!planId || !submitPayload) {
      return
    }

    setSubmitting(true)
    const endpoint = `PUT /api/v1/admin/plans/${planId}`

    try {
      const result = await updatePlan(planId, submitPayload)
      recordSuccess(submitPayload, result, endpoint)
      setSnackbar({ open: true, message: result.message, severity: 'success' })
      navigate(`/plans/${planId}`)
    } catch (error) {
      recordError(submitPayload, error, endpoint)
      setSnackbar({
        open: true,
        message: getApiErrorSummary(error),
        severity: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const loading = planLoading || catalogLoading || !formInitialized
  const isDraft = plan ? isDraftPlan(plan.status) : false

  if (!planId) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">Invalid plan URL.</Alert>
        <Button component={RouterLink} to="/plans">
          Back to plans
        </Button>
      </Stack>
    )
  }

  return (
    <>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Plan edit"
          title={plan ? `Edit ${plan.planName}` : 'Edit plan'}
          description="Update draft plan details, features, and pricing. Only plans in Draft status can be edited."
          apiEndpoint={`PUT /api/v1/admin/plans/${planId}`}
          backTo={`/plans/${planId}`}
          backLabel="Back to plan details"
          actions={
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                void loadPlan()
                void loadCatalog()
              }}
              disabled={planLoading || catalogLoading}
            >
              Reload
            </Button>
          }
        />

        {planLoading && (
          <Stack sx={{ py: 10, alignItems: 'center' }}>
            <CircularProgress />
          </Stack>
        )}

        {!planLoading && planError && (
          <Stack spacing={2}>
            <Alert severity="error">{planError}</Alert>
            <Button variant="outlined" onClick={() => void loadPlan()}>
              Retry
            </Button>
          </Stack>
        )}

        {!planLoading && !planError && plan && !isDraft && (
          <Alert severity="warning">
            This plan is <strong>{plan.status}</strong> and cannot be edited. Only draft plans support
            updates via PUT /api/v1/admin/plans/:id.
          </Alert>
        )}

        {validationErrors.length > 0 && (
          <Box ref={validationErrorRef}>
            <ValidationErrorsAlert
              title={getApiErrorTitle(transaction?.lastError ?? transaction?.lastResponse)}
              errors={validationErrors}
              errorCode={validationErrorCode}
              subtitle="The API rejected this plan update. Review each item below and update the form."
            />
          </Box>
        )}

        {!planLoading && !planError && plan && isDraft && form && (
          <Stack component="form" spacing={3} onSubmit={handleSubmit}>
            <CreatePlanDetailsSection
              form={form}
              onFormChange={updateForm}
              onTrialToggle={handleTrialToggle}
              onGraceToggle={handleGraceToggle}
            />

            <CreatePlanFeatureCatalogSection
              catalogLoading={loading}
              catalogError={catalogError}
              requiredAttributeEntries={requiredAttributeEntries}
              requiredAttributeConfigs={requiredAttributeConfigs}
              optionalAttributeFeatures={optionalAttributeFeatures}
              selectedAttributeFeatures={selectedAttributeFeatures}
              selectedSimpleFeatures={selectedSimpleFeatures}
              simpleFeatures={simpleFeatures}
              onRequiredConfigChange={updateRequiredAttributeConfig}
              onOptionalToggle={toggleOptionalAttributeFeature}
              onOptionalAttributeToggle={toggleOptionalAttribute}
              onOptionalConfigChange={updateAttributeConfig}
              onOptionalLinkFlagChange={updateOptionalLinkFlag}
              onSimpleFeatureToggle={toggleSimpleFeature}
              onSimpleFeatureConfigChange={updateSimpleFeatureConfig}
            />

            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button component={RouterLink} to={`/plans/${planId}`} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting || loading}
                startIcon={
                  submitting ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <SaveIcon />
                  )
                }
              >
                {submitting ? 'Saving changes...' : 'Save plan'}
              </Button>
            </Stack>
          </Stack>
        )}

        {previewPayload && (
          <ApiTransactionInspector livePayload={previewPayload} transaction={transaction} />
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
