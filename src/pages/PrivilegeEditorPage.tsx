import { useCallback, useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import SaveIcon from '@mui/icons-material/Save'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createDiscountPrivilege,
  getDiscountPrivilegeById,
  updateDiscountPrivilege,
} from '../api/commercial'
import { ApiRequestError } from '../api/client'
import { ApiErrorAlert } from '../components/ApiErrorAlert'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { PrivilegeFormFields } from '../components/commercial/PrivilegeFormFields'
import { PageHeader } from '../components/layout/PageHeader'
import { useApiTransaction } from '../hooks/useApiTransaction'
import type { PrivilegeFormState } from '../types/commercial'
import { getApiErrorSummary } from '../utils/apiErrors'
import {
  buildPrivilegePayload,
  createDefaultPrivilegeForm,
  privilegeToFormState,
} from '../utils/commercial'

interface PrivilegeEditorPageProps {
  mode: 'create' | 'edit'
}

export function CreateDiscountPrivilegePage() {
  return <PrivilegeEditorPage mode="create" />
}

export function EditDiscountPrivilegePage() {
  return <PrivilegeEditorPage mode="edit" />
}

function PrivilegeEditorPage({ mode }: PrivilegeEditorPageProps) {
  const { privilegeId } = useParams<{ privilegeId: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<PrivilegeFormState>(createDefaultPrivilegeForm)
  const [loading, setLoading] = useState(mode === 'edit')
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  })
  const { transaction, execute } = useApiTransaction()

  const loadPrivilege = useCallback(async () => {
    if (mode !== 'edit' || !privilegeId) {
      return
    }
    setLoading(true)
    setLoadError(null)
    try {
      const privilege = await execute(
        { privilegeId },
        () => getDiscountPrivilegeById(privilegeId),
        `GET /api/v1/admin/discount-privileges/${privilegeId}`,
      )
      setForm(privilegeToFormState(privilege))
    } catch (err) {
      setLoadError(getApiErrorSummary(err))
    } finally {
      setLoading(false)
    }
  }, [execute, mode, privilegeId])

  useEffect(() => {
    void loadPrivilege()
  }, [loadPrivilege])

  const livePayload = useMemo(() => {
    try {
      return buildPrivilegePayload(form)
    } catch {
      return undefined
    }
  }, [form])

  const handleSubmit = async () => {
    setFormError(null)
    setSubmitError(null)

    let payload
    try {
      payload = buildPrivilegePayload(form)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Invalid privilege form')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'create') {
        const created = await execute(
          payload,
          () => createDiscountPrivilege(payload),
          'POST /api/v1/admin/discount-privileges',
        )
        setSnackbar({ open: true, message: `Created privilege ${created.code}` })
        navigate(`/admin/discount-privileges/${created.id}`)
        return
      }

      if (!privilegeId) {
        setFormError('Privilege ID is missing from the URL.')
        return
      }

      const updated = await execute(
        payload,
        () => updateDiscountPrivilege(privilegeId, payload),
        `PUT /api/v1/admin/discount-privileges/${privilegeId}`,
      )
      setSnackbar({ open: true, message: `Updated privilege ${updated.code}` })
      navigate(`/admin/discount-privileges/${updated.id}`)
    } catch (err) {
      setSubmitError(err)
      if (!(err instanceof ApiRequestError)) {
        setFormError(getApiErrorSummary(err))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const isCreate = mode === 'create'

  return (
    <>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Admin"
          title={isCreate ? 'Create discount privilege' : 'Edit discount privilege'}
          description={
            isCreate
              ? 'Create a merchant privilege with percentage or fixed discount benefits.'
              : 'Replace privilege fields and benefits. Assign merchants from the detail page.'
          }
          apiEndpoint={
            isCreate
              ? 'POST /api/v1/admin/discount-privileges'
              : `PUT /api/v1/admin/discount-privileges/${privilegeId ?? ':id'}`
          }
          backTo={
            isCreate || !privilegeId
              ? '/admin/discount-privileges'
              : `/admin/discount-privileges/${privilegeId}`
          }
          backLabel={isCreate ? 'Back to privileges' : 'Back to privilege'}
          actions={
            <Button
              variant="contained"
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={() => void handleSubmit()}
              disabled={submitting || loading}
            >
              {isCreate ? 'Create privilege' : 'Save privilege'}
            </Button>
          }
        />

        {loadError && <Alert severity="error">{loadError}</Alert>}
        {formError && <Alert severity="error">{formError}</Alert>}
        {submitError != null && (
          <ApiErrorAlert
            error={submitError}
            subtitle="The privilege request failed. Review the API errors below and try again."
          />
        )}

        {loading ? (
          <Stack sx={{ py: 8, alignItems: 'center' }}>
            <CircularProgress />
          </Stack>
        ) : (
          <PrivilegeFormFields form={form} onChange={setForm} />
        )}

        <ApiTransactionInspector
          livePayload={livePayload}
          livePayloadTitle={isCreate ? 'Create privilege payload' : 'Update privilege payload'}
          transaction={transaction}
        />
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}
