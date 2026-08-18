import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { InAppNotification } from '../../types/notifications'
import { formatRelativeTime, isNotificationUnread, notificationTypeColor } from '../../utils/notifications'

interface NotificationListItemProps {
  notification: InAppNotification
  onSelect?: (notification: InAppNotification) => void
}

export function NotificationListItem({ notification, onSelect }: NotificationListItemProps) {
  const unread = isNotificationUnread(notification)

  return (
    <ListItemButton
      alignItems="flex-start"
      onClick={() => onSelect?.(notification)}
      sx={{
        py: 1.5,
        px: 2,
        bgcolor: unread ? 'rgba(79, 70, 229, 0.06)' : 'transparent',
        borderLeft: unread ? '3px solid' : '3px solid transparent',
        borderLeftColor: unread ? 'primary.main' : 'transparent',
      }}
    >
      <ListItemText
        primary={
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
            {unread && (
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  flexShrink: 0,
                }}
              />
            )}
            <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: unread ? 700 : 600 }}>
              {notification.title}
            </Typography>
            <Chip
              label={notification.type}
              size="small"
              color={notificationTypeColor(notification.type)}
            />
          </Stack>
        }
        secondary={
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              {notification.message}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatRelativeTime(notification.createdAt)}
            </Typography>
          </Stack>
        }
        slotProps={{
          secondary: { component: 'div' },
        }}
      />
    </ListItemButton>
  )
}
