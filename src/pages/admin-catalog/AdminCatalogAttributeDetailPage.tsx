import { useCallback, useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import SaveIcon from '@mui/icons-material/Save'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { useParams } from 'react-router-dom'
import {
  deleteAdminCatalogAttributeIcon,
  getAdminCatalogFeatureAttribute,
  patchAdminCatalogFeatureAttribute,
  uploadAdminCatalogAttributeIcon,
} from '../../api/adminCatalogFeatures'
import { ApiRequestError } from '../../api/client'
import { ApiErrorAlert } from '../../components/ApiErrorAlert'
import { ApiTransactionInspector } from '../../components/ApiTransactionInspector'
import { PageHeader } from '../../components/layout/PageHeader'
import { useApiTransaction } from '../../hooks/useApiTransaction'
import type { AdminCatalogFeatureAttribute } from '../../types/subscription'
import { resolveCatalogMediaUrl } from '../../utils/catalogMediaUrl'

export function AdminCatalogAttributeDetailPage() {
  const { featureId = '', attributeId = '' } = useParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attribute, setAttribute] = useState<AdminCatalogFeatureAttribute | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })
  const { transaction, execute } = useApiTransaction()

  const load = useCallback(async () => {
    if (!featureId || !attributeId) return
    setLoading(true)
    setError(null)
    try {
      const row = await execute(
        { featureId, attributeId },
        () => getAdminCatalogFeatureAttribute(featureId, attributeId),
        'GET /api/v1/admin/features/:featureId/attributes/:attributeId',
      )
      setAttribute(row)
      setName(row.name)
      setDescription(row.description)
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? (err.body.message ?? err.message)
          : err instanceof Error
            ? err.message
            : 'Failed to load attribute',
      )
    } finally {
      setLoading(false)
    }
  }, [attributeId, execute, featureId])

  useEffect(() => {
    void load()
  }, [load])

  const savePatch = async () => {
    try {
      const updated = await execute(
        { name, description },
        () => patchAdminCatalogFeatureAttribute(featureId, attributeId, { name, description }),
        'PATCH /api/v1/admin/features/:featureId/attributes/:attributeId',
      )
      setAttribute(updated)
      setSnackbar({ open: true, message: 'Attribute updated', severity: 'success' })
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Update failed',
        severity: 'error',
      })
    }
  }

  const onUploadIcon = async (file: File) => {
    try {
      const { iconUrl } = await execute(
        { featureId, attributeId, fileName: file.name },
        () => uploadAdminCatalogAttributeIcon(featureId, attributeId, file),
        'POST /api/v1/admin/features/:featureId/attributes/:attributeId/icon',
      )
      setAttribute((prev) => (prev ? { ...prev, iconUrl } : prev))
      setSnackbar({ open: true, message: 'Icon uploaded', severity: 'success' })
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Upload failed',
        severity: 'error',
      })
    }
  }

  const onDeleteIcon = async () => {
    try {
      await execute(
        { featureId, attributeId },
        () => deleteAdminCatalogAttributeIcon(featureId, attributeId),
        'DELETE /api/v1/admin/features/:featureId/attributes/:attributeId/icon',
      )
      setAttribute((prev) => (prev ? { ...prev, iconUrl: null } : prev))
      setSnackbar({ open: true, message: 'Icon removed', severity: 'success' })
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Delete failed',
        severity: 'error',
      })
    }
  }

  const iconSrc = resolveCatalogMediaUrl(attribute?.iconUrl)

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Admin catalog"
        title={attribute?.name ?? 'Attribute detail'}
        description="Edit attribute display fields and icon (HTML description stored as returned by API)."
        apiEndpoint="GET/PATCH /api/v1/admin/features/:featureId/attributes/:attributeId"
        backTo={`/admin/catalog-features/${featureId}`}
        backLabel="Back to feature"
      />

      {error && <ApiErrorAlert error={error} />}

      {loading ? (
        <Stack sx={{ py: 6, alignItems: 'center' }}>
          <CircularProgress />
        </Stack>
      ) : attribute ? (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Avatar src={iconSrc ?? undefined} variant="rounded" sx={{ width: 56, height: 56 }}>
                  {attribute.attributeCode.slice(0, 1)}
                </Avatar>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle1" sx={{ fontFamily: 'monospace' }}>
                    {attribute.attributeCode}
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    {attribute.isLinkable && <Chip size="small" label="Linkable" />}
                    {attribute.isMonthlyLimit && <Chip size="small" label="Monthly limit" />}
                  </Stack>
                </Stack>
              </Stack>
              <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
              <TextField
                label="Description (HTML)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                minRows={6}
              />
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Button startIcon={<SaveIcon />} variant="contained" onClick={() => void savePatch()}>
                  Save changes
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void onUploadIcon(file)
                    e.target.value = ''
                  }}
                />
                <Button
                  startIcon={<UploadFileIcon />}
                  variant="outlined"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload icon
                </Button>
                {attribute.iconUrl && (
                  <Button
                    startIcon={<DeleteOutlineOutlinedIcon />}
                    color="error"
                    variant="outlined"
                    onClick={() => void onDeleteIcon()}
                  >
                    Remove icon
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Alert severity="warning">Attribute not found.</Alert>
      )}

      <ApiTransactionInspector transaction={transaction} />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        message={snackbar.message}
      />
    </Stack>
  )
}
