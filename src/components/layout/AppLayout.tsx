import type { ReactNode } from 'react'
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
import { Link as RouterLink, useLocation } from 'react-router-dom'

interface AppLayoutProps {
  children: ReactNode
}

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

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(135deg, #312e81 0%, #4338ca 55%, #2563eb 100%)',
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <SubscriptionsIcon sx={{ fontSize: 28 }} />
          <Box
            component={RouterLink}
            to="/"
            sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}
          >
            <Typography variant="h6" component="div">
              Subscription Lifecycle Tester
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              Admin tools for plan creation and API validation
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
            {navItems.map((item) => {
              const active =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path)

              return (
                <Button
                  key={item.path}
                  component={RouterLink}
                  to={item.path}
                  startIcon={item.path === '/' ? <HomeOutlinedIcon /> : undefined}
                  sx={{
                    color: 'white',
                    bgcolor: active ? 'rgba(255,255,255,0.16)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                  }}
                >
                  {item.label}
                </Button>
              )
            })}
          </Stack>

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
        </Toolbar>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            display: { xs: 'flex', md: 'none' },
            px: 2,
            pb: 1.5,
            overflowX: 'auto',
          }}
        >
          {navItems.map((item) => {
            const active =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)

            return (
              <Button
                key={item.path}
                component={RouterLink}
                to={item.path}
                size="small"
                sx={{
                  color: 'white',
                  flexShrink: 0,
                  bgcolor: active ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)',
                }}
              >
                {item.label}
              </Button>
            )
          })}
        </Stack>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3, flex: 1 }}>
        {children}
      </Container>
    </Box>
  )
}
