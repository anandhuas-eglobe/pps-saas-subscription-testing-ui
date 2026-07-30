import { useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import SubscriptionsIcon from '@mui/icons-material/Subscriptions'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { formatAuthError, useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { login, isAuthenticated, isReady } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo =
    typeof location.state === 'object' &&
    location.state &&
    'from' in location.state &&
    typeof (location.state as { from?: unknown }).from === 'string'
      ? (location.state as { from: string }).from
      : '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isReady && isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await login(email, password, rememberMe)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(formatAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        background:
          'radial-gradient(circle at top left, rgba(79, 70, 229, 0.16), transparent 32%), radial-gradient(circle at bottom right, rgba(37, 99, 235, 0.14), transparent 28%), #f3f4f8',
      }}
    >
      <Paper
        sx={{
          width: '100%',
          maxWidth: 440,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
        }}
      >
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(135deg, #312e81 0%, #4338ca 55%, #2563eb 100%)',
                color: 'white',
              }}
            >
              <SubscriptionsIcon />
            </Box>
            <Typography variant="h5">Subscription Test UI</Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in with your IAM account to access subscription lifecycle tools.
            </Typography>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            autoFocus
            required
            fullWidth
          />

          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            fullWidth
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
            }
            label="Remember me"
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting || !email || !password}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <LockOutlinedIcon />}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
