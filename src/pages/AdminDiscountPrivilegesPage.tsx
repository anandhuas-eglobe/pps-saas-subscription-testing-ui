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
import Pagination from '@mui/material/Pagination'
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
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { listDiscountPrivileges } from '../api/commercial'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { PageHeader } from '../components/layout/PageHeader'
import { useApiTransaction } from '../hooks/useApiTransaction'
import {
  DiscountPrivilegeStatus,
  PRIVILEGE_SORT_FIELDS,
  type DiscountPrivilegeStatusValue,
  type PrivilegeRead,
} from '../types/commercial'
import { getApiErrorSummary } from '../utils/apiErrors'
import { commercialStatusColor } from '../utils/commercial'
import { formatDateTime } from '../utils/planDisplay'

export function AdminDiscountPrivilegesPage() {
  const navigate = useNavigate()
  const [privileges, setPrivileges] = useState<PrivilegeRead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DiscountPrivilegeStatusValue | ''>('')
  const [sortBy, setSortBy] = useState<(typeof PRIVILEGE_SORT_FIELDS)[number]>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const { transaction, execute } = useApiTransaction()

  const listQueryPayload = useMemo(
    () => ({
      page,
      limit: 10,
      search: search || undefined,
      status: statusFilter || undefined,
      sortBy,
      sortOrder,
    }),
    [page, search, statusFilter, sortBy, sortOrder],
  )

  const loadPrivileges = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await execute(
        listQueryPayload,
        () => listDiscountPrivileges(listQueryPayload),
        'GET /api/v1/admin/discount-privileges',
      )
      setPrivileges(result.privileges)
      setTotalPages(result.pagination.totalPages)
      setTotal(result.pagination.total)
    } catch (err) {
      setError(getApiErrorSummary(err))
      setPrivileges([])
    } finally {
      setLoading(false)
    }
  }, [execute, listQueryPayload])

  useEffect(() => {
    void loadPrivileges()
  }, [loadPrivileges])

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Admin"
        title="Discount privileges"
        description="Create merchant discount privileges and assign them to specific merchants."
        apiEndpoint="GET · POST /api/v1/admin/discount-privileges"
        backTo="/"
        backLabel="Back to home"
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => void loadPrivileges()}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddCircleOutlineOutlinedIcon />}
              component={RouterLink}
              to="/admin/discount-privileges/create"
            >
              Create privilege
            </Button>
          </>
        }
      />

      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Search"
                placeholder="Code or name"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as DiscountPrivilegeStatusValue | '')
                    setPage(1)
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value={DiscountPrivilegeStatus.ACTIVE}>Active</MenuItem>
                  <MenuItem value={DiscountPrivilegeStatus.INACTIVE}>Inactive</MenuItem>
                  <MenuItem value={DiscountPrivilegeStatus.EXPIRED}>Expired</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Sort by</InputLabel>
                <Select
                  label="Sort by"
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(event.target.value as (typeof PRIVILEGE_SORT_FIELDS)[number])
                    setPage(1)
                  }}
                >
                  <MenuItem value="createdAt">Created date</MenuItem>
                  <MenuItem value="code">Code</MenuItem>
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="status">Status</MenuItem>
                  <MenuItem value="validFrom">Valid from</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {loading ? (
            <Stack sx={{ py: 8, alignItems: 'center' }}>
              <CircularProgress />
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                Loading privileges...
              </Typography>
            </Stack>
          ) : privileges.length === 0 ? (
            <Stack sx={{ py: 8, alignItems: 'center' }}>
              <Typography color="text.secondary">No privileges found.</Typography>
            </Stack>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Stackable</TableCell>
                      <TableCell>Valid from</TableCell>
                      <TableCell>Assignments</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {privileges.map((privilege) => (
                      <TableRow
                        key={privilege.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/admin/discount-privileges/${privilege.id}`)}
                      >
                        <TableCell>
                          <Typography
                            component={RouterLink}
                            to={`/admin/discount-privileges/${privilege.id}`}
                            sx={{
                              fontWeight: 600,
                              color: 'primary.main',
                              textDecoration: 'none',
                              '&:hover': { textDecoration: 'underline' },
                            }}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {privilege.code}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {privilege.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={privilege.status}
                            size="small"
                            color={commercialStatusColor(privilege.status)}
                          />
                        </TableCell>
                        <TableCell>{privilege.stackable ? 'Yes' : 'No'}</TableCell>
                        <TableCell>{formatDateTime(privilege.validFrom)}</TableCell>
                        <TableCell>{privilege.assignmentCount}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            component={RouterLink}
                            to={`/admin/discount-privileges/${privilege.id}`}
                            startIcon={<VisibilityIcon />}
                            onClick={(event) => event.stopPropagation()}
                          >
                            View
                          </Button>
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
                  Showing {privileges.length} of {total} privileges
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

      <ApiTransactionInspector
        livePayload={listQueryPayload}
        livePayloadTitle="List privileges query"
        transaction={transaction}
      />
    </Stack>
  )
}
