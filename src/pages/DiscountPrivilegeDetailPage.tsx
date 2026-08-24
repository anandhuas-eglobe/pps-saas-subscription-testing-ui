import { useCallback, useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Link as RouterLink, useParams } from 'react-router-dom'
import {
  assignDiscountPrivilege,
  getDiscountPrivilegeById,
  listPrivilegeAssignments,
  unassignDiscountPrivilege,
  updateDiscountPrivilegeStatus,
} from '../api/commercial'
import { ApiRequestError } from '../api/client'
import { getMerchantIdFromAccessToken } from '../auth/jwtClaims'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { CopyJsonButton } from '../components/CopyJsonButton'
import { PageHeader } from '../components/layout/PageHeader'
import { useApiTransaction } from '../hooks/useApiTransaction'
import {
  DiscountPrivilegeStatus,
  type DiscountPrivilegeStatusValue,
  type PrivilegeAssignmentRead,
  type PrivilegeRead,
} from '../types/commercial'
import { getApiErrorSummary } from '../utils/apiErrors'
import { commercialStatusColor } from '../utils/commercial'
import { formatDateTime } from '../utils/planDisplay'

export function DiscountPrivilegeDetailPage() {
  const { privilegeId } = useParams<{ privilegeId: string }>()
  const [privilege, setPrivilege] = useState<PrivilegeRead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<DiscountPrivilegeStatusValue>(
    DiscountPrivilegeStatus.ACTIVE,
  )
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const [assignments, setAssignments] = useState<PrivilegeAssignmentRead[]>([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null)
  const [merchantId, setMerchantId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [unassigningMerchantId, setUnassigningMerchantId] = useState<string | null>(null)
  const { transaction, execute } = useApiTransaction()

  const loadPrivilege = useCallback(async () => {
    if (!privilegeId) {
      setError('Privilege ID is missing from the URL.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const detail = await execute(
        { privilegeId },
        () => getDiscountPrivilegeById(privilegeId),
        `GET /api/v1/admin/discount-privileges/${privilegeId}`,
      )
      setPrivilege(detail)
      setStatus(detail.status)
    } catch (err) {
      setError(getApiErrorSummary(err))
      setPrivilege(null)
    } finally {
      setLoading(false)
    }
  }, [execute, privilegeId])

  const loadAssignments = useCallback(async () => {
    if (!privilegeId) {
      return
    }
    setAssignmentsLoading(true)
    setAssignmentsError(null)
    try {
      const result = await execute(
        { privilegeId },
        () => listPrivilegeAssignments(privilegeId),
        `GET /api/v1/admin/discount-privileges/${privilegeId}/assignments`,
      )
      setAssignments(result.assignments)
    } catch (err) {
      setAssignmentsError(getApiErrorSummary(err))
      setAssignments([])
    } finally {
      setAssignmentsLoading(false)
    }
  }, [execute, privilegeId])

  useEffect(() => {
    void loadPrivilege()
  }, [loadPrivilege])

  useEffect(() => {
    void loadAssignments()
  }, [loadAssignments])

  const handleStatusUpdate = async () => {
    if (!privilegeId) {
      return
    }
    setStatusUpdating(true)
    setStatusMessage(null)
    setError(null)
    try {
      const updated = await execute(
        { status },
        () => updateDiscountPrivilegeStatus(privilegeId, status),
        `PATCH /api/v1/admin/discount-privileges/${privilegeId}/status`,
      )
      setPrivilege(updated)
      setStatus(updated.status)
      setStatusMessage(`Status updated to ${updated.status}`)
    } catch (err) {
      setError(err instanceof ApiRequestError ? getApiErrorSummary(err) : getApiErrorSummary(err))
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleAssign = async () => {
    if (!privilegeId) {
      return
    }
    if (!merchantId.trim()) {
      setAssignmentsError('Merchant ID is required.')
      return
    }
    setAssigning(true)
    setAssignmentsError(null)
    try {
      await execute(
        { merchantId: merchantId.trim() },
        () => assignDiscountPrivilege(privilegeId, merchantId.trim()),
        `POST /api/v1/admin/discount-privileges/${privilegeId}/assignments`,
      )
      setMerchantId('')
      await loadAssignments()
      await loadPrivilege()
    } catch (err) {
      setAssignmentsError(getApiErrorSummary(err))
    } finally {
      setAssigning(false)
    }
  }

  const handleUnassign = async (assignedMerchantId: string) => {
    if (!privilegeId) {
      return
    }
    setUnassigningMerchantId(assignedMerchantId)
    setAssignmentsError(null)
    try {
      await execute(
        { merchantId: assignedMerchantId },
        () => unassignDiscountPrivilege(privilegeId, assignedMerchantId),
        `DELETE /api/v1/admin/discount-privileges/${privilegeId}/assignments/${assignedMerchantId}`,
      )
      await loadAssignments()
      await loadPrivilege()
    } catch (err) {
      setAssignmentsError(getApiErrorSummary(err))
    } finally {
      setUnassigningMerchantId(null)
    }
  }

  const livePayload = useMemo(() => {
    if (!privilegeId) {
      return undefined
    }
    return { privilegeId, status, merchantId: merchantId.trim() || undefined }
  }, [merchantId, privilegeId, status])

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Admin"
        title={privilege ? privilege.code : 'Privilege detail'}
        description={
          privilege
            ? privilege.name
            : 'Inspect a privilege, change status, and manage merchant assignments.'
        }
        apiEndpoint={`GET /api/v1/admin/discount-privileges/${privilegeId ?? ':id'}`}
        backTo="/admin/discount-privileges"
        backLabel="Back to privileges"
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                void loadPrivilege()
                void loadAssignments()
              }}
              disabled={loading}
            >
              Refresh
            </Button>
            {privilegeId && (
              <Button
                variant="contained"
                startIcon={<EditOutlinedIcon />}
                component={RouterLink}
                to={`/admin/discount-privileges/${privilegeId}/edit`}
              >
                Edit
              </Button>
            )}
          </>
        }
      />

      {error && <Alert severity="error">{error}</Alert>}
      {statusMessage && <Alert severity="success">{statusMessage}</Alert>}

      {loading ? (
        <Stack sx={{ py: 8, alignItems: 'center' }}>
          <CircularProgress />
        </Stack>
      ) : privilege ? (
        <>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                spacing={1}
                sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Details
                </Typography>
                <CopyJsonButton value={privilege} label="Copy privilege JSON" />
              </Stack>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Stack>
                    <Chip
                      label={privilege.status}
                      size="small"
                      color={commercialStatusColor(privilege.status)}
                      sx={{ width: 'fit-content' }}
                    />
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Stackable
                  </Typography>
                  <Typography>{privilege.stackable ? 'Yes' : 'No'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Valid from
                  </Typography>
                  <Typography>{formatDateTime(privilege.validFrom)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Valid to
                  </Typography>
                  <Typography>{formatDateTime(privilege.validTo)}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">
                    Description
                  </Typography>
                  <Typography>{privilege.description || '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">
                    ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {privilege.id}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Update status
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ maxWidth: 480 }}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as DiscountPrivilegeStatusValue)
                    }
                  >
                    <MenuItem value={DiscountPrivilegeStatus.ACTIVE}>Active</MenuItem>
                    <MenuItem value={DiscountPrivilegeStatus.INACTIVE}>Inactive</MenuItem>
                    <MenuItem value={DiscountPrivilegeStatus.EXPIRED}>Expired</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  onClick={() => void handleStatusUpdate()}
                  disabled={statusUpdating || status === privilege.status}
                  sx={{ flexShrink: 0 }}
                >
                  {statusUpdating ? 'Updating…' : 'Patch status'}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Stack sx={{ px: 2, pt: 2, pb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Benefits
                </Typography>
              </Stack>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>Max discount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {privilege.benefits.map((benefit) => (
                      <TableRow key={benefit.id}>
                        <TableCell>{benefit.benefitType}</TableCell>
                        <TableCell>{benefit.value}</TableCell>
                        <TableCell>{benefit.maximumDiscountAmount ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Merchant assignments
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="Merchant ID"
                  placeholder="UUID"
                  value={merchantId}
                  onChange={(event) => setMerchantId(event.target.value)}
                />
                <Button
                  variant="outlined"
                  sx={{ flexShrink: 0 }}
                  onClick={() => {
                    const currentMerchantId = getMerchantIdFromAccessToken()
                    if (currentMerchantId) {
                      setMerchantId(currentMerchantId)
                    }
                  }}
                >
                  Use JWT merchant
                </Button>
                <Button
                  variant="contained"
                  startIcon={
                    assigning ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <PersonAddAltOutlinedIcon />
                    )
                  }
                  onClick={() => void handleAssign()}
                  disabled={assigning}
                  sx={{ flexShrink: 0 }}
                >
                  Assign
                </Button>
              </Stack>
              {assignmentsError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {assignmentsError}
                </Alert>
              )}
              {assignmentsLoading ? (
                <Stack sx={{ py: 4, alignItems: 'center' }}>
                  <CircularProgress size={24} />
                </Stack>
              ) : assignments.length === 0 ? (
                <Typography color="text.secondary">No merchants assigned.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Merchant ID</TableCell>
                        <TableCell>Assigned at</TableCell>
                        <TableCell>Assigned by</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {assignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell>{assignment.merchantId}</TableCell>
                          <TableCell>{formatDateTime(assignment.assignedAt)}</TableCell>
                          <TableCell>{assignment.assignedBy ?? '—'}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              color="error"
                              disabled={unassigningMerchantId === assignment.merchantId}
                              onClick={() => void handleUnassign(assignment.merchantId)}
                            >
                              {unassigningMerchantId === assignment.merchantId
                                ? 'Removing…'
                                : 'Unassign'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <ApiTransactionInspector
        livePayload={livePayload}
        livePayloadTitle="Privilege action payload"
        transaction={transaction}
      />
    </Stack>
  )
}
