import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { Link as RouterLink } from 'react-router-dom'

interface SettingsIconButtonProps {
  /** Match light (AppBar) or dark (public pages) backgrounds. */
  tone?: 'light' | 'dark'
  size?: 'small' | 'medium' | 'large'
}

export function SettingsIconButton({ tone = 'light', size = 'medium' }: SettingsIconButtonProps) {
  const isLight = tone === 'light'

  return (
    <Tooltip title="Settings & API servers">
      <IconButton
        component={RouterLink}
        to="/settings"
        aria-label="Settings and API servers"
        size={size}
        sx={{
          color: isLight ? 'white' : 'text.secondary',
          bgcolor: isLight ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.04)',
          '&:hover': {
            bgcolor: isLight ? 'rgba(255,255,255,0.14)' : 'rgba(15, 23, 42, 0.08)',
          },
        }}
      >
        <SettingsOutlinedIcon fontSize={size === 'small' ? 'small' : 'medium'} />
      </IconButton>
    </Tooltip>
  )
}
