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
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'
import { RedisCacheFlushButton } from './RedisCacheFlushButton'

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Create Plan', path: '/plans/create' },
  { label: 'List Plans', path: '/plans' },
  { label: 'Merchant Plans', path: '/merchant/plans' },
  { label: 'Plan Add-ons', path: '/merchant/addons' },
  { label: 'Attribute Changes', path: '/merchant/attributes' },
  { label: 'Active Subscription', path: '/merchant/subscription' },
  { label: 'Invoices', path: '/merchant/invoices' },
  { label: 'Confirm Payment', path: '/dev/payment-confirm' },
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
