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
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import SaveIcon from '@mui/icons-material/Save'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { Link as RouterLink, useParams } from 'react-router-dom'
import {
  deleteAdminCatalogFeatureIcon,
  getAdminCatalogFeature,
  listAdminCatalogFeatureAttributes,
  patchAdminCatalogFeature,
  uploadAdminCatalogFeatureIcon,
} from '../../api/adminCatalogFeatures'
import { ApiRequestError } from '../../api/client'
import { ApiErrorAlert } from '../../components/ApiErrorAlert'
import { ApiTransactionInspector } from '../../components/ApiTransactionInspector'
import { PageHeader } from '../../components/layout/PageHeader'
import { useApiTransaction } from '../../hooks/useApiTransaction'
import type { AdminCatalogFeature, AdminCatalogFeatureAttribute } from '../../types/subscription'
import { resolveCatalogMediaUrl } from '../../utils/catalogMediaUrl'

export function AdminCatalogFeatureDetailPage() {
  const { featureId = '' } = useParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [feature, setFeature] = useState<AdminCatalogFeature | null>(null)
  const [attributes, setAttributes] = useState<AdminCatalogFeatureAttribute[]>([])
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
    if (!featureId) return
    setLoading(true)
    setError(null)
    try {
      const [featureRow, attributeRows] = await execute(
        { featureId },
        () =>
          Promise.all([
            getAdminCatalogFeature(featureId),
            listAdminCatalogFeatureAttributes(featureId),
          ]),
        'GET /api/v1/admin/features/:featureId',
      )
      setFeature(featureRow)
      setAttributes(attributeRows)
      setName(featureRow.name)
      setDescription(featureRow.description)
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? (err.body.message ?? err.message)
          : err instanceof Error
            ? err.message
            : 'Failed to load feature',
      )
    } finally {
      setLoading(false)
    }
  }, [execute, featureId])

  useEffect(() => {
    void load()
  }, [load])

  const savePatch = async () => {
    try {
      const updated = await execute(
        { name, description },
        () => patchAdminCatalogFeature(featureId, { name, description }),
        'PATCH /api/v1/admin/features/:featureId',
      )
      setFeature(updated)
      setSnackbar({ open: true, message: 'Feature updated', severity: 'success' })
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
        { featureId, fileName: file.name },
        () => uploadAdminCatalogFeatureIcon(featureId, file),
        'POST /api/v1/admin/features/:featureId/icon',
      )
      setFeature((prev) => (prev ? { ...prev, iconUrl } : prev))
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
        { featureId },
        () => deleteAdminCatalogFeatureIcon(featureId),
        'DELETE /api/v1/admin/features/:featureId/icon',
      )
      setFeature((prev) => (prev ? { ...prev, iconUrl: null } : prev))
      setSnackbar({ open: true, message: 'Icon removed', severity: 'success' })
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Delete failed',
        severity: 'error',
      })
    }
  }

  const iconSrc = resolveCatalogMediaUrl(feature?.iconUrl)

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Admin catalog"
        title={feature?.name ?? 'Feature detail'}
        description="Edit feature metadata, icon, and open attributes."
        apiEndpoint="GET/PATCH /api/v1/admin/features/:featureId"
        backTo="/admin/catalog-features"
        backLabel="Back to catalog list"
      />

      {error && <ApiErrorAlert error={error} />}

      {loading ? (
        <Stack sx={{ py: 6, alignItems: 'center' }}>
          <CircularProgress />
        </Stack>
      ) : feature ? (
        <>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <Avatar src={iconSrc ?? undefined} variant="rounded" sx={{ width: 64, height: 64 }}>
                    {feature.code.slice(0, 1)}
                  </Avatar>
                  <Stack spacing={0.5}>
                    <Typography variant="h6">{feature.code}</Typography>
                    <Chip size="small" label={feature.status ? 'Active' : 'Inactive'} />
                  </Stack>
                </Stack>
                <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
                <TextField
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  fullWidth
                  multiline
                  minRows={3}
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
                  {feature.iconUrl && (
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

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Attributes ({attributes.length})
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Flags</TableCell>
                      <TableCell align="right">Open</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attributes.map((attr) => (
                      <TableRow key={attr.id} hover>
                        <TableCell>{attr.attributeCode}</TableCell>
                        <TableCell>{attr.name}</TableCell>
                        <TableCell>
                          {attr.isLinkable && <Chip size="small" label="Linkable" sx={{ mr: 0.5 }} />}
                          {attr.isMonthlyLimit && <Chip size="small" label="Monthly limit" />}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            component={RouterLink}
                            to={`/admin/catalog-features/${featureId}/attributes/${attr.id}`}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      ) : (
        <Alert severity="warning">Feature not found.</Alert>
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
