import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Link as RouterLink } from 'react-router-dom'
import { useNotifications } from '../../notifications/NotificationContext'
import { isNotificationUnread } from '../../utils/notifications'
import { NotificationListItem } from './NotificationListItem'

const DRAWER_WIDTH = 420

export function NotificationDrawer() {
  const {
    merchantId,
    previewItems,
    unreadCount,
    loading,
    error,
    drawerOpen,
    socketConnected,
    socketError,
    desktopPermission,
    closeDrawer,
    refreshPreview,
    markAsRead,
    markPreviewUnreadAsRead,
    requestPushPermission,
  } = useNotifications()

  const unreadPreviewCount = previewItems.filter(isNotificationUnread).length

  async function handleSelect(notificationId: string) {
    try {
      await markAsRead(notificationId)
    } catch {
      // Preview list still shows the item; listing page can retry.
    }
  }

  return (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={closeDrawer}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: DRAWER_WIDTH },
            maxWidth: '100%',
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ p: 2, alignItems: 'flex-start', justifyContent: 'space-between' }}
        >
          <Box>
            <Typography variant="h6">Notifications</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                color={unreadCount > 0 ? 'primary' : 'default'}
                label={`${unreadCount} unread`}
              />
              <Chip
                size="small"
                color={socketConnected ? 'success' : 'default'}
                label={socketConnected ? 'Live' : 'Polling'}
                variant="outlined"
              />
              {merchantId && (
                <Chip
                  size="small"
                  label={`Merchant ${merchantId.slice(0, 8)}…`}
                  variant="outlined"
                  sx={{ fontFamily: 'monospace' }}
                />
              )}
            </Stack>
          </Box>
          <IconButton onClick={closeDrawer} aria-label="Close notifications">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ px: 2, pb: 1.5 }}>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => void refreshPreview()}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            size="small"
            startIcon={<DoneAllIcon />}
            onClick={() => void markPreviewUnreadAsRead()}
            disabled={unreadPreviewCount === 0}
          >
            Mark visible read
          </Button>
        </Stack>

        {desktopPermission === 'default' && (
          <Box sx={{ px: 2, pb: 1.5 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<NotificationsActiveIcon />}
              onClick={() => void requestPushPermission()}
            >
              Enable desktop notifications
            </Button>
          </Box>
        )}

        {desktopPermission === 'denied' && (
          <Box sx={{ px: 2, pb: 1.5 }}>
            <Alert severity="info">
              Desktop notifications are blocked in this browser. Use the alerts icon to open this
              drawer.
            </Alert>
          </Box>
        )}

        {desktopPermission === 'unsupported' && (
          <Box sx={{ px: 2, pb: 1.5 }}>
            <Alert severity="info">This browser does not support desktop notifications.</Alert>
          </Box>
        )}

        {!socketConnected && socketError && (
          <Box sx={{ px: 2, pb: 1.5 }}>
            <Alert severity="warning">
              Live push unavailable ({socketError}). Falling back to polling every 60s — verify{' '}
              <code>VITE_NOTIFICATIONS_WS_URL</code> points at the notifications service, not the
              API gateway.
            </Alert>
          </Box>
        )}

        <Divider />

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}

          {loading && previewItems.length === 0 ? (
            <Stack sx={{ py: 8, alignItems: 'center' }} spacing={2}>
              <CircularProgress size={28} />
              <Typography color="text.secondary">Loading notifications…</Typography>
            </Stack>
          ) : previewItems.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 4, textAlign: 'center' }}>
              No notifications yet. New ones from the notifications service will appear here.
            </Typography>
          ) : (
            <List disablePadding>
              {previewItems.map((notification) => (
                <NotificationListItem
                  key={notification.id}
                  notification={notification}
                  onSelect={(item) => {
                    if (isNotificationUnread(item)) {
                      void handleSelect(item.id)
                    }
                  }}
                />
              ))}
            </List>
          )}
        </Box>

        <Divider />
        <Box sx={{ p: 2 }}>
          <Button
            component={RouterLink}
            to="/notifications"
            fullWidth
            variant="contained"
            endIcon={<OpenInNewIcon />}
            onClick={closeDrawer}
          >
            View all notifications
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}
