import { useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import SubscriptionsIcon from '@mui/icons-material/Subscriptions'
import ScienceIcon from '@mui/icons-material/Science'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { CopyAccessTokenButton } from './CopyAccessTokenButton'
import { DatabaseResetButton } from './DatabaseResetButton'
import { RedisCacheFlushButton } from './RedisCacheFlushButton'

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Nitro Test', path: '/nitro-test' },
  { label: 'Create Plan', path: '/plans/create' },
  { label: 'List Plans', path: '/plans' },
  { label: 'Merchant Plans', path: '/merchant/plans' },
  { label: 'Plan Add-ons', path: '/merchant/addons' },
  { label: 'Attribute Changes', path: '/merchant/attributes' },
  { label: 'Active Subscription', path: '/merchant/subscription' },
  { label: 'Renewal Testing', path: '/merchant/renewal-testing' },
  { label: 'Overage Testing', path: '/merchant/overage-testing' },
  { label: 'Overage', path: '/merchant/overage' },
  { label: 'Usage Simulation', path: '/merchant/usage-simulation' },
  { label: 'Invoices', path: '/merchant/invoices' },
  { label: 'Extend Subscription', path: '/admin/extend-subscription' },
  { label: 'Confirm Payment', path: '/dev/payment-confirm' },
  { label: 'Cleanup Pending', path: '/dev/cleanup-pending-invoices' },
  { label: 'Reseller Overage', path: '/dev/reseller-overage' },
]

function isNavItemActive(pathname: string, itemPath: string): boolean {
  if (itemPath === '/') {
    return pathname === '/'
  }

  if (itemPath === '/plans') {
    return (
      pathname === '/plans' ||
      pathname.startsWith('/plans/') &&
        pathname !== '/plans/create' &&
        !pathname.endsWith('/edit')
    )
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`)
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setLoggingOut(false)
    }
  }

  const displayName =
    user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    'Signed in'

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        maxWidth: '100%',
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(135deg, #312e81 0%, #4338ca 55%, #2563eb 100%)',
        }}
      >
        <Toolbar sx={{ gap: 2, minHeight: { xs: 56, sm: 64 } }}>
          <SubscriptionsIcon sx={{ fontSize: 28, flexShrink: 0 }} />
          <Box
            component={RouterLink}
            to="/"
            sx={{
              flex: 1,
              minWidth: 0,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <Typography variant="h6" component="div" noWrap>
              Subscription Lifecycle Tester
            </Typography>
            <Typography
              variant="caption"
              sx={{
                opacity: 0.85,
                display: { xs: 'none', sm: 'block' },
              }}
              noWrap
            >
              Admin tools for plan creation and API validation
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            sx={{ flexShrink: 0, alignItems: 'center' }}
          >
            <CopyAccessTokenButton />
            <DatabaseResetButton />
            <RedisCacheFlushButton />
            <Chip
              icon={<ScienceIcon sx={{ fontSize: '16px !important' }} />}
              label="Testing UI"
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.14)',
                color: 'white',
                '& .MuiChip-icon': { color: 'white' },
                display: { xs: 'none', sm: 'flex' },
              }}
            />
            <Chip
              label={displayName}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.14)',
                color: 'white',
                maxWidth: 180,
                display: { xs: 'none', md: 'flex' },
              }}
            />
            <Button
              size="small"
              color="inherit"
              startIcon={<LogoutIcon />}
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              sx={{
                bgcolor: 'rgba(255,255,255,0.08)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
              }}
            >
              {loggingOut ? 'Signing out…' : 'Logout'}
            </Button>
          </Stack>
        </Toolbar>

        <Box
          sx={{
            px: 2,
            pb: 1.5,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <Stack direction="row" spacing={1} sx={{ width: 'max-content' }}>
            {navItems.map((item) => {
              const active = isNavItemActive(location.pathname, item.path)

              return (
                <Button
                  key={item.path}
                  component={RouterLink}
                  to={item.path}
                  size="small"
                  startIcon={item.path === '/' ? <HomeOutlinedIcon /> : undefined}
                  sx={{
                    color: 'white',
                    flexShrink: 0,
                    bgcolor: active ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                  }}
                >
                  {item.label}
                </Button>
              )
            })}
          </Stack>
        </Box>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3, flex: 1, minWidth: 0, maxWidth: '100%' }}>
        <Outlet />
      </Container>
    </Box>
  )
}
