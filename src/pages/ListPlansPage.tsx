import { useCallback, useEffect, useState } from 'react'
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
import Pagination from '@mui/material/Pagination'
import Select from '@mui/material/Select'
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
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import RefreshIcon from '@mui/icons-material/Refresh'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { createPlan, getPlanById, listPlans, updatePlanStatus } from '../api/plans'
import { ApiRequestError } from '../api/client'
import { ApiErrorAlert } from '../components/ApiErrorAlert'
import { PageHeader } from '../components/layout/PageHeader'
import type { PlanListItem } from '../types/subscription'
import { PlanStatus, PlanType } from '../types/subscription'
import { getApiErrorSummary } from '../utils/apiErrors'
import { isDraftPlan, planStatusColor } from '../utils/planDisplay'
import { planDetailToDuplicatePayload } from '../utils/planDetailForm'

export function ListPlansPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<PlanListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [planTypeFilter, setPlanTypeFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })
  const [duplicatingPlanId, setDuplicatingPlanId] = useState<string | null>(null)
  const [duplicateError, setDuplicateError] = useState<unknown>(null)

  const loadPlans = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listPlans({
        page,
        limit: 10,
        search: search || undefined,
        status: statusFilter || undefined,
        planType: planTypeFilter || undefined,
        sortBy,
        sortOrder,
      })
      setPlans(result.plans)
      setTotalPages(result.pagination.totalPages)
      setTotal(result.pagination.total)
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load plans'
      setError(message)
      setPlans([])
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, planTypeFilter, sortBy, sortOrder])

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  const handleActivatePlan = async (planId: string) => {
    try {
      await updatePlanStatus(planId, { status: PlanStatus.ACTIVE })
      setSnackbar({ open: true, message: 'Plan activated successfully', severity: 'success' })
      await loadPlans()
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to activate plan'
      setSnackbar({ open: true, message, severity: 'error' })
    }
  }

  const handleDuplicatePlan = async (planId: string) => {
    setDuplicatingPlanId(planId)
    setDuplicateError(null)

    try {
      const source = await getPlanById(planId)
      const payload = planDetailToDuplicatePayload(source)
      const result = await createPlan(payload)
      setSnackbar({
        open: true,
        message: `Duplicated as "${payload.planName}"`,
        severity: 'success',
      })
      await loadPlans()
      navigate(`/plans/${result.planId}`)
    } catch (err) {
      setDuplicateError(err)
      setSnackbar({
        open: true,
        message: getApiErrorSummary(err),
        severity: 'error',
      })
    } finally {
      setDuplicatingPlanId(null)
    }
  }

  const handleSearch = () => {
    setPage(1)
    void loadPlans()
  }

  return (
    <>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Plan management"
          title="List subscription plans"
          description="Browse and filter plans created in the system. Open a plan to view full details or activate draft plans."
          apiEndpoint="GET /api/v1/admin/plans"
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

        <Card>
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Search"
                  placeholder="Plan name or description"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value)
                      setPage(1)
                    }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value={PlanStatus.DRAFT}>Draft</MenuItem>
                    <MenuItem value={PlanStatus.ACTIVE}>Active</MenuItem>
                    <MenuItem value={PlanStatus.INACTIVE}>Inactive</MenuItem>
                    <MenuItem value={PlanStatus.DISCONTINUED}>Discontinued</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Plan type</InputLabel>
                  <Select
                    label="Plan type"
                    value={planTypeFilter}
                    onChange={(event) => {
                      setPlanTypeFilter(event.target.value)
                      setPage(1)
                    }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value={PlanType.PUBLIC}>Public</MenuItem>
                    <MenuItem value={PlanType.CUSTOM}>Custom</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Sort by</InputLabel>
                  <Select
                    label="Sort by"
                    value={sortBy}
                    onChange={(event) => {
                      setSortBy(event.target.value)
                      setPage(1)
                    }}
                  >
                    <MenuItem value="createdAt">Created date</MenuItem>
                    <MenuItem value="planName">Plan name</MenuItem>
                    <MenuItem value="status">Status</MenuItem>
                    <MenuItem value="baseMonthlyPrice">Monthly price</MenuItem>
                    <MenuItem value="baseYearlyPrice">Yearly price</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Order</InputLabel>
                  <Select
                    label="Order"
                    value={sortOrder}
                    onChange={(event) => {
                      setSortOrder(event.target.value as 'asc' | 'desc')
                      setPage(1)
                    }}
                  >
                    <MenuItem value="desc">Descending</MenuItem>
                    <MenuItem value="asc">Ascending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {error && <Alert severity="error">{error}</Alert>}

        {duplicateError != null && (
          <ApiErrorAlert
            error={duplicateError}
            subtitle="Could not duplicate this plan. Review the API errors below and try again."
          />
        )}

        <Card>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {loading ? (
              <Stack sx={{ py: 8, alignItems: 'center' }}>
                <CircularProgress />
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  Loading plans...
                </Typography>
              </Stack>
            ) : plans.length === 0 ? (
              <Stack sx={{ py: 8, alignItems: 'center' }}>
                <Typography color="text.secondary">No plans found.</Typography>
              </Stack>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Plan name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Monthly</TableCell>
                        <TableCell>Yearly</TableCell>
                        <TableCell>Trial</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {plans.map((plan) => (
                        <TableRow
                          key={plan.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/plans/${plan.id}`)}
                        >
                          <TableCell>
                            <Typography
                              component={RouterLink}
                              to={`/plans/${plan.id}`}
                              sx={{
                                fontWeight: 600,
                                color: 'primary.main',
                                textDecoration: 'none',
                                '&:hover': { textDecoration: 'underline' },
                              }}
                              onClick={(event) => event.stopPropagation()}
                            >
                              {plan.planName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {plan.id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={plan.planType} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip label={plan.status} size="small" color={planStatusColor(plan.status)} />
                          </TableCell>
                          <TableCell>
                            {plan.baseCurrency} {plan.baseMonthlyPrice}
                          </TableCell>
                          <TableCell>
                            {plan.baseCurrency} {plan.baseYearlyPrice}
                          </TableCell>
                          <TableCell>
                            {plan.trial.enabled
                              ? plan.trial.days
                                ? `${plan.trial.days} days`
                                : 'Enabled (missing days)'
                              : '—'}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                              <Button
                                size="small"
                                variant="outlined"
                                component={RouterLink}
                                to={`/plans/${plan.id}`}
                                startIcon={<VisibilityIcon />}
                                onClick={(event) => event.stopPropagation()}
                              >
                                View
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={
                                  duplicatingPlanId === plan.id ? (
                                    <CircularProgress size={14} />
                                  ) : (
                                    <ContentCopyIcon />
                                  )
                                }
                                disabled={duplicatingPlanId != null}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void handleDuplicatePlan(plan.id)
                                }}
                              >
                                {duplicatingPlanId === plan.id ? 'Duplicating…' : 'Duplicate'}
                              </Button>
                              {isDraftPlan(plan.status) && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<PlayArrowIcon />}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    void handleActivatePlan(plan.id)
                                  }}
                                >
                                  Activate
                                </Button>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{
                    p: 2,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Showing {plans.length} of {total} plans
                  </Typography>
                  <Pagination
                    count={Math.max(totalPages, 1)}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    color="primary"
                  />
                </Stack>
              </>
            )}
          </CardContent>
        </Card>
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}
