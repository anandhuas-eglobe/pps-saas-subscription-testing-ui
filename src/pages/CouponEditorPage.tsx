import { useCallback, useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import SaveIcon from '@mui/icons-material/Save'
import { useNavigate, useParams } from 'react-router-dom'
import { createCoupon, getCouponById, updateCoupon } from '../api/commercial'
import { ApiRequestError } from '../api/client'
import { ApiErrorAlert } from '../components/ApiErrorAlert'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { CouponFormFields } from '../components/commercial/CouponFormFields'
import { PageHeader } from '../components/layout/PageHeader'
import { useApiTransaction } from '../hooks/useApiTransaction'
import type { CouponFormState } from '../types/commercial'
import { getApiErrorSummary } from '../utils/apiErrors'
import {
  buildCouponPayload,
  couponToFormState,
  createDefaultCouponForm,
} from '../utils/commercial'

interface CouponEditorPageProps {
  mode: 'create' | 'edit'
}

export function CreateCouponPage() {
  return <CouponEditorPage mode="create" />
}

export function EditCouponPage() {
  return <CouponEditorPage mode="edit" />
}

function CouponEditorPage({ mode }: CouponEditorPageProps) {
  const { couponId } = useParams<{ couponId: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<CouponFormState>(createDefaultCouponForm)
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

  const loadCoupon = useCallback(async () => {
    if (mode !== 'edit' || !couponId) {
      return
    }
    setLoading(true)
    setLoadError(null)
    try {
      const coupon = await execute(
        { couponId },
        () => getCouponById(couponId),
        `GET /api/v1/admin/coupons/${couponId}`,
      )
      setForm(couponToFormState(coupon))
    } catch (err) {
      setLoadError(getApiErrorSummary(err))
    } finally {
      setLoading(false)
    }
  }, [couponId, execute, mode])

  useEffect(() => {
    void loadCoupon()
  }, [loadCoupon])

  const livePayload = useMemo(() => {
    try {
      return buildCouponPayload(form)
    } catch {
      return undefined
    }
  }, [form])

  const handleSubmit = async () => {
    setFormError(null)
    setSubmitError(null)

    let payload
    try {
      payload = buildCouponPayload(form)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Invalid coupon form')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'create') {
        const created = await execute(
          payload,
          () => createCoupon(payload),
          'POST /api/v1/admin/coupons',
        )
        setSnackbar({ open: true, message: `Created coupon ${created.code}` })
        navigate(`/admin/coupons/${created.id}`)
        return
      }

      if (!couponId) {
        setFormError('Coupon ID is missing from the URL.')
        return
      }

      const updated = await execute(
        payload,
        () => updateCoupon(couponId, payload),
        `PUT /api/v1/admin/coupons/${couponId}`,
      )
      setSnackbar({ open: true, message: `Updated coupon ${updated.code}` })
      navigate(`/admin/coupons/${updated.id}`)
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
          title={isCreate ? 'Create coupon' : 'Edit coupon'}
          description={
            isCreate
              ? 'Create a coupon with usage limits, benefits, and optional plan or billing-cycle restrictions.'
              : 'Replace coupon fields, benefits, and restrictions. Status can also be changed from the coupon detail page.'
          }
          apiEndpoint={
            isCreate
              ? 'POST /api/v1/admin/coupons'
              : `PUT /api/v1/admin/coupons/${couponId ?? ':id'}`
          }
          backTo={isCreate || !couponId ? '/admin/coupons' : `/admin/coupons/${couponId}`}
          backLabel={isCreate ? 'Back to coupons' : 'Back to coupon'}
          actions={
            <Button
              variant="contained"
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={() => void handleSubmit()}
              disabled={submitting || loading}
            >
              {isCreate ? 'Create coupon' : 'Save coupon'}
            </Button>
          }
        />

        {loadError && <Alert severity="error">{loadError}</Alert>}
        {formError && <Alert severity="error">{formError}</Alert>}
        {submitError != null && (
          <ApiErrorAlert
            error={submitError}
            subtitle="The coupon request failed. Review the API errors below and try again."
          />
        )}

        {loading ? (
          <Stack sx={{ py: 8, alignItems: 'center' }}>
            <CircularProgress />
          </Stack>
        ) : (
          <CouponFormFields form={form} onChange={setForm} />
        )}

        <ApiTransactionInspector
          livePayload={livePayload}
          livePayloadTitle={isCreate ? 'Create coupon payload' : 'Update coupon payload'}
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
