import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import ListAltIcon from '@mui/icons-material/ListAlt'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Link as RouterLink } from 'react-router-dom'
import { fetchFeatures } from '../api/features'
import { createPlan } from '../api/plans'
import { ApiRequestError } from '../api/client'
import { ApiLogPanel } from '../components/ApiLogPanel'
import { ApiErrorAlert } from '../components/ApiErrorAlert'
import { CreatePlanDetailsSection } from '../components/plans/CreatePlanDetailsSection'
import { CreatePlanFeatureCatalogSection } from '../components/plans/CreatePlanFeatureCatalogSection'
import { CreatePlanPayloadPreview } from '../components/plans/CreatePlanPayloadPreview'
import { getRequiredAttributeEntries } from '../components/plans/RequiredAttributesSection'
import { PageHeader } from '../components/layout/PageHeader'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import type {
  ApiResponse,
  AttributeConfig,
  CatalogFeature,
  CreatePlanPayload,
  FeatureConfig,
} from '../types/subscription'
import {
  buildCreatePlanPayload,
  createDefaultPlanForm,
  defaultAttributeConfig,
  defaultFeatureConfig,
  getOptionalFeatureAttributes,
  isAttributeFeature,
  isSimpleFeature,
  mergeAttributeConfigUpdate,
  mergeFeatureConfigUpdate,
} from '../utils/planDefaults'
import {
  getApiErrorSummary,
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

  const [selectedSimpleFeatures, setSelectedSimpleFeatures] = useState<
    Record<string, FeatureConfig>
  >({})
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
        (feature) => getOptionalFeatureAttributes(feature).length > 0,
      ),
    [attributeFeatures],
  )

  const payloadSnapshot = useMemo(
    () => ({
      form,
      catalog,
      requiredAttributeConfigs,
      selectedAttributeFeatures,
      selectedSimpleFeatures,
    }),
    [form, catalog, requiredAttributeConfigs, selectedAttributeFeatures, selectedSimpleFeatures],
  )

  const debouncedPayloadSnapshot = useDebouncedValue(payloadSnapshot, 400)

  const submitPayload = useMemo(
    () =>
      buildCreatePlanPayload(
        payloadSnapshot.form,
        payloadSnapshot.catalog,
        payloadSnapshot.requiredAttributeConfigs,
        payloadSnapshot.selectedAttributeFeatures,
        payloadSnapshot.selectedSimpleFeatures,
      ),
    [payloadSnapshot],
  )

  const previewPayload = useMemo(
    () =>
      buildCreatePlanPayload(
        debouncedPayloadSnapshot.form,
        debouncedPayloadSnapshot.catalog,
        debouncedPayloadSnapshot.requiredAttributeConfigs,
        debouncedPayloadSnapshot.selectedAttributeFeatures,
        debouncedPayloadSnapshot.selectedSimpleFeatures,
      ),
    [debouncedPayloadSnapshot],
  )

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

  useEffect(() => {
    if (lastError != null || lastResponse?.success === false) {
      validationErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [lastError, lastResponse])

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

  const updateForm = useCallback(<K extends keyof CreatePlanPayload>(key: K, value: CreatePlanPayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }, [])

  const handleTrialToggle = useCallback((enabled: boolean) => {
    setForm((current) => ({
      ...current,
      isTrialPeriodEnabled: enabled,
      trialPeriod: enabled ? (current.trialPeriod ?? 14) : null,
    }))
  }, [])

  const handleGraceToggle = useCallback((enabled: boolean) => {
    setForm((current) => ({
      ...current,
      isGracePeriodEnabled: enabled,
      gracePeriod: enabled ? (current.gracePeriod ?? 15) : null,
    }))
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
              [attributeId]: mergeAttributeConfigUpdate(
                entry.configs[attributeId],
                patch,
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

        return {
          ...current,
          [featureId]: {
            ...entry,
            linkFlags: {
              ...entry.linkFlags,
              [attributeId]: value,
            },
          },
        }
      })
    },
    [],
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setLastError(null)
    setLastResponse(null)
    setLastPayload(submitPayload)

    try {
      const result = await createPlan(submitPayload)
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

        {(lastError != null || lastResponse?.success === false) && (
          <Box ref={validationErrorRef}>
            <ApiErrorAlert
              error={lastError ?? lastResponse}
              subtitle="The API rejected this plan payload. Review each item below and update the form."
            />
          </Box>
        )}

        <Stack component="form" spacing={3} onSubmit={handleSubmit}>
          <CreatePlanDetailsSection
            form={form}
            onFormChange={updateForm}
            onTrialToggle={handleTrialToggle}
            onGraceToggle={handleGraceToggle}
          />

          <CreatePlanFeatureCatalogSection
            catalogLoading={catalogLoading}
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

          <CreatePlanPayloadPreview payload={previewPayload} />

          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting || catalogLoading}
              startIcon={
                submitting ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <AddCircleOutlineOutlinedIcon />
                )
              }
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
