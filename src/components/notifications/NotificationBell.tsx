import Badge from '@mui/material/Badge'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import NotificationsIcon from '@mui/icons-material/Notifications'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import { useNotifications } from '../../notifications/NotificationContext'

export function NotificationBell() {
  const { unreadCount, openDrawer, socketConnected } = useNotifications()
  const hasUnread = unreadCount > 0
  const Icon = hasUnread ? NotificationsIcon : NotificationsNoneIcon

  return (
    <Tooltip
      title={
        hasUnread
          ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
          : socketConnected
            ? 'Notifications (live)'
            : 'Notifications'
      }
    >
      <IconButton
        color="inherit"
        onClick={openDrawer}
        aria-label="Open notifications"
        sx={{
          bgcolor: 'rgba(255,255,255,0.08)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
        }}
      >
        <Badge
          color="error"
          badgeContent={unreadCount}
          max={99}
          overlap="circular"
        >
          <Icon />
        </Badge>
      </IconButton>
    </Tooltip>
  )
}
