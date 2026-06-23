import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
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
import Typography from '@mui/material/Typography'
import ListAltIcon from '@mui/icons-material/ListAlt'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RefreshIcon from '@mui/icons-material/Refresh'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { Link as RouterLink } from 'react-router-dom'
import { listPlans, updatePlanStatus } from '../../api/plans'
import { ApiRequestError } from '../../api/client'
import type { PlanListItem } from '../../types/subscription'
import { PlanStatus } from '../../types/subscription'
import { isDraftPlan, planStatusColor } from '../../utils/planDisplay'

interface NitroPlansListPanelProps {
  /** Increment to trigger a reload (e.g. after creating a plan). */
  refreshKey?: number
}

export function NitroPlansListPanel({ refreshKey = 0 }: NitroPlansListPanelProps) {
  const [plans, setPlans] = useState<PlanListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const loadPlans = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listPlans({
        page: 1,
        limit: 25,
        search: 'Nitro',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      setPlans(result.plans)
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
  }, [])

  useEffect(() => {
    void loadPlans()
  }, [loadPlans, refreshKey])

  const handleActivate = async (planId: string) => {
    setActivatingId(planId)
    try {
      await updatePlanStatus(planId, { status: PlanStatus.ACTIVE })
      setSnackbar({ open: true, message: 'Plan activated successfully', severity: 'success' })
      await loadPlans()
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to activate plan'
      setSnackbar({ open: true, message, severity: 'error' })
    } finally {
      setActivatingId(null)
    }
  }

  return (
    <>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <ListAltIcon color="primary" />
                <Typography variant="h6">Nitro plans</Typography>
                {!loading && (
                  <Chip label={`${plans.length} shown`} size="small" variant="outlined" />
                )}
              </Stack>
              <Button
                variant="outlined"
                size="small"
                startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}
                onClick={() => void loadPlans()}
                disabled={loading}
              >
                Refresh list
              </Button>
            </Stack>

            <Typography variant="body2" color="text.secondary">
              Plans whose names match <strong>Nitro</strong>, newest first. View details or activate
              draft plans without leaving this page.
            </Typography>

            {error && (
              <Alert severity="error" action={<Button onClick={() => void loadPlans()}>Retry</Button>}>
                {error}
              </Alert>
            )}

            {loading && (
              <Stack sx={{ py: 6, alignItems: 'center' }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  Loading Nitro plans…
                </Typography>
              </Stack>
            )}

            {!loading && !error && plans.length === 0 && (
              <Alert severity="info">
                No Nitro plans yet. Use the create buttons above to generate your first tier.
              </Alert>
            )}

            {!loading && !error && plans.length > 0 && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Plan name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Monthly</TableCell>
                      <TableCell>Yearly</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id} hover>
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
                          >
                            {plan.planName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {plan.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={plan.status}
                            size="small"
                            color={planStatusColor(plan.status)}
                          />
                        </TableCell>
                        <TableCell>
                          {plan.baseCurrency} {plan.baseMonthlyPrice}
                        </TableCell>
                        <TableCell>
                          {plan.baseCurrency} {plan.baseYearlyPrice}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              component={RouterLink}
                              to={`/plans/${plan.id}`}
                              startIcon={<VisibilityIcon />}
                            >
                              View
                            </Button>
                            {isDraftPlan(plan.status) && (
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={
                                  activatingId === plan.id ? (
                                    <CircularProgress size={14} color="inherit" />
                                  ) : (
                                    <PlayArrowIcon />
                                  )
                                }
                                disabled={activatingId !== null}
                                onClick={() => void handleActivate(plan.id)}
                              >
                                {activatingId === plan.id ? 'Activating…' : 'Activate'}
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        message={snackbar.message}
      />
    </>
  )
}
