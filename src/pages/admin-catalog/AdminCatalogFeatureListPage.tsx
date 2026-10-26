import { useCallback, useEffect, useMemo, useState } from 'react'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
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
import RefreshIcon from '@mui/icons-material/Refresh'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { Link as RouterLink } from 'react-router-dom'
import { listAdminCatalogFeatures } from '../../api/adminCatalogFeatures'
import { ApiRequestError } from '../../api/client'
import { ApiErrorAlert } from '../../components/ApiErrorAlert'
import { ApiTransactionInspector } from '../../components/ApiTransactionInspector'
import { PageHeader } from '../../components/layout/PageHeader'
import { useApiTransaction } from '../../hooks/useApiTransaction'
import type { AdminCatalogFeature } from '../../types/subscription'
import { resolveCatalogMediaUrl } from '../../utils/catalogMediaUrl'

export function AdminCatalogFeatureListPage() {
  const [features, setFeatures] = useState<AdminCatalogFeature[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'code'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const { transaction, execute } = useApiTransaction()

  const listQuery = useMemo(
    () => ({ page, limit: 10, search: search || undefined, sortBy, sortOrder }),
    [page, search, sortBy, sortOrder],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await execute(
        listQuery,
        () => listAdminCatalogFeatures(listQuery),
        'GET /api/v1/admin/features',
      )
      setFeatures(result.features)
      setTotalPages(result.pagination.totalPages)
      setTotal(result.pagination.total)
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? (err.body.message ?? err.message)
          : err instanceof Error
            ? err.message
            : 'Failed to load catalog features',
      )
      setFeatures([])
    } finally {
      setLoading(false)
    }
  }, [execute, listQuery])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Admin"
        title="Catalog features"
        description="Browse and edit subscription catalog features and attributes (admin features API)."
        apiEndpoint="GET /api/v1/admin/features"
        actions={
          <Button startIcon={<RefreshIcon />} onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {error && <ApiErrorAlert error={error} />}

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="Search"
              size="small"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Name, code, or description"
              sx={{ flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Sort by</InputLabel>
              <Select
                label="Sort by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              >
                <MenuItem value="createdAt">Created</MenuItem>
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="code">Code</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Order</InputLabel>
              <Select
                label="Order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              >
                <MenuItem value="desc">Desc</MenuItem>
                <MenuItem value="asc">Asc</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {loading ? (
            <Stack sx={{ py: 4, alignItems: 'center' }}>
              <CircularProgress />
            </Stack>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {total} feature(s)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      <TableCell>Code</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Attributes</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {features.map((feature) => {
                      const iconSrc = resolveCatalogMediaUrl(feature.iconUrl)
                      return (
                        <TableRow key={feature.id} hover>
                          <TableCell>
                            <Avatar src={iconSrc ?? undefined} variant="rounded" sx={{ width: 36, height: 36 }}>
                              {feature.code.slice(0, 1)}
                            </Avatar>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {feature.code}
                            </Typography>
                          </TableCell>
                          <TableCell>{feature.name}</TableCell>
                          <TableCell>{feature.attributeCount ?? '—'}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={feature.status ? 'Active' : 'Inactive'}
                              color={feature.status ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              startIcon={<VisibilityIcon />}
                              component={RouterLink}
                              to={`/admin/catalog-features/${feature.id}`}
                            >
                              Open
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {features.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                            No features found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {totalPages > 1 && (
                <Stack sx={{ mt: 2, alignItems: 'center' }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    color="primary"
                  />
                </Stack>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ApiTransactionInspector transaction={transaction} />
    </Stack>
  )
}
