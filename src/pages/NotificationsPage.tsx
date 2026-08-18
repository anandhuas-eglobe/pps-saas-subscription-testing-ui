import { useCallback, useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
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
import Typography from '@mui/material/Typography'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import RefreshIcon from '@mui/icons-material/Refresh'
import { ApiRequestError } from '../api/client'
import {
  bulkMarkNotificationsRead,
  fetchNotifications,
  markNotificationRead,
} from '../api/notifications'
import { ApiErrorAlert } from '../components/ApiErrorAlert'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { PageHeader } from '../components/layout/PageHeader'
import { useApiTransaction } from '../hooks/useApiTransaction'
import { useNotifications } from '../notifications/NotificationContext'
import {
  NotificationType,
  type InAppNotification,
  type NotificationReadStatus,
  type NotificationTypeValue,
} from '../types/notifications'
import { formatDateTime } from '../utils/planDisplay'
import { isNotificationUnread, notificationTypeColor } from '../utils/notifications'

export function NotificationsPage() {
  const { merchantId, refreshPreview, requestPushPermission, desktopPermission, socketConnected } =
    useNotifications()
  const { transaction, execute } = useApiTransaction()

  const [items, setItems] = useState<InAppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState<NotificationReadStatus | ''>('')
  const [typeFilter, setTypeFilter] = useState<NotificationTypeValue | ''>('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const listQueryPayload = useMemo(
    () => ({
      page,
      limit: 15,
      status: statusFilter || undefined,
      type: typeFilter || undefined,
    }),
    [page, statusFilter, typeFilter],
  )

  const loadNotifications = useCallback(async () => {
    if (!merchantId) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await execute(
        listQueryPayload,
        () => fetchNotifications(merchantId, listQueryPayload),
        'GET /api/v1/notifications',
      )
      setItems(result.data)
      setTotalPages(Math.max(1, result.pagination.totalPages))
      setTotal(result.pagination.total)
      setUnreadCount(result.unreadCount)
      setSelectedIds((current) => current.filter((id) => result.data.some((item) => item.id === id)))
    } catch (err) {
      setError(err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [execute, listQueryPayload, merchantId])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  async function handleMarkRead(notificationId: string) {
    if (!merchantId) {
      return
    }
    try {
      const result = await markNotificationRead(merchantId, notificationId)
      setItems((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, readAt: result.readAt } : item,
        ),
      )
      setUnreadCount((count) => Math.max(0, count - 1))
      await refreshPreview()
    } catch (err) {
      setError(err)
    }
  }

  async function handleBulkMarkRead(notificationIds: string[]) {
    if (!merchantId || notificationIds.length === 0) {
      return
    }
    try {
      await bulkMarkNotificationsRead(merchantId, notificationIds)
      const readAt = new Date().toISOString()
      setItems((current) =>
        current.map((item) =>
          notificationIds.includes(item.id) ? { ...item, readAt } : item,
        ),
      )
      setSelectedIds([])
      await loadNotifications()
      await refreshPreview()
    } catch (err) {
      setError(err)
    }
  }

  const unreadOnPage = items.filter(isNotificationUnread)
  const allSelected = items.length > 0 && selectedIds.length === items.length
  const someSelected = selectedIds.length > 0 && !allSelected

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Notifications service"
        title="Notifications"
        description="In-app notification inbox from the notifications microservice. Desktop push alerts open the right-hand drawer; this page is the full listing."
        apiEndpoint="GET /api/v1/notifications · PATCH /:id · PATCH /bulk/read"
        backTo="/"
        backLabel="Back to home"
        actions={
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {desktopPermission === 'default' && (
              <Button
                variant="outlined"
                startIcon={<NotificationsActiveIcon />}
                onClick={() => void requestPushPermission()}
              >
                Enable desktop push
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => void loadNotifications()}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>
        }
      />

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <Chip
          label={`${unreadCount} unread`}
          color={unreadCount > 0 ? 'primary' : 'default'}
          size="small"
        />
        <Chip
          label={merchantId ? `Merchant ${merchantId.slice(0, 8)}…` : 'Merchant ID missing'}
          color={merchantId ? 'default' : 'warning'}
          size="small"
          variant="outlined"
          sx={{ fontFamily: 'monospace' }}
        />
        <Chip
          label={socketConnected ? 'Live socket connected' : 'Waiting for live socket'}
          color={socketConnected ? 'success' : 'default'}
          size="small"
          variant="outlined"
        />
      </Stack>

      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as NotificationReadStatus | '')
                    setPage(1)
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="unread">Unread</MenuItem>
                  <MenuItem value="read">Read</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  label="Type"
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(event.target.value as NotificationTypeValue | '')
                    setPage(1)
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value={NotificationType.CRITICAL}>Critical</MenuItem>
                  <MenuItem value={NotificationType.HIGH}>High</MenuItem>
                  <MenuItem value={NotificationType.MEDIUM}>Medium</MenuItem>
                  <MenuItem value={NotificationType.LOW}>Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ mb: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="h6">Notification list</Typography>
              <Chip label={`${total} total`} size="small" variant="outlined" />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Button
                size="small"
                startIcon={<MarkEmailReadIcon />}
                disabled={selectedIds.length === 0}
                onClick={() => void handleBulkMarkRead(selectedIds)}
              >
                Mark selected read
              </Button>
              <Button
                size="small"
                startIcon={<DoneAllIcon />}
                disabled={unreadOnPage.length === 0}
                onClick={() => void handleBulkMarkRead(unreadOnPage.map((item) => item.id))}
              >
                Mark page unread read
              </Button>
            </Stack>
          </Stack>

          {error != null && (
            <Box sx={{ mb: 2 }}>
              {error instanceof ApiRequestError ? (
                <ApiErrorAlert error={error} />
              ) : (
                <Alert severity="error">
                  {error instanceof Error ? error.message : 'Failed to load notifications'}
                </Alert>
              )}
            </Box>
          )}

          {loading ? (
            <Stack direction="row" spacing={2} sx={{ py: 6, justifyContent: 'center', alignItems: 'center' }}>
              <CircularProgress size={28} />
              <Typography color="text.secondary">Loading notifications…</Typography>
            </Stack>
          ) : items.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No notifications found for the current filters.
            </Typography>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={allSelected}
                          indeterminate={someSelected}
                          onChange={(event) => {
                            setSelectedIds(event.target.checked ? items.map((item) => item.id) : [])
                          }}
                          slotProps={{ input: { 'aria-label': 'Select all notifications on this page' } }}
                        />
                      </TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((notification) => {
                      const unread = isNotificationUnread(notification)
                      return (
                        <TableRow
                          key={notification.id}
                          hover
                          selected={selectedIds.includes(notification.id)}
                          sx={{ bgcolor: unread ? 'rgba(79, 70, 229, 0.04)' : undefined }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedIds.includes(notification.id)}
                              onChange={(event) => {
                                setSelectedIds((current) =>
                                  event.target.checked
                                    ? [...current, notification.id]
                                    : current.filter((id) => id !== notification.id),
                                )
                              }}
                              slotProps={{ input: { 'aria-label': `Select ${notification.title}` } }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={unread ? 'Unread' : 'Read'}
                              size="small"
                              color={unread ? 'primary' : 'default'}
                              variant={unread ? 'filled' : 'outlined'}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={notification.type}
                              size="small"
                              color={notificationTypeColor(notification.type)}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: unread ? 700 : 500, maxWidth: 220 }}>
                            {notification.title}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 360 }}>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {notification.message}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatDateTime(notification.createdAt)}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              startIcon={<MarkEmailReadIcon />}
                              disabled={!unread}
                              onClick={() => void handleMarkRead(notification.id)}
                            >
                              Mark read
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {totalPages > 1 && (
                <Stack direction="row" sx={{ mt: 3, justifyContent: 'center' }}>
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

      <ApiTransactionInspector
        livePayload={listQueryPayload}
        livePayloadTitle="List notifications query"
        transaction={transaction}
      />
    </Stack>
  )
}
