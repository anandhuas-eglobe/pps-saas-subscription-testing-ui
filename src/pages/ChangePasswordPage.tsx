import { useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import PasswordIcon from '@mui/icons-material/Password'
import {
  Link as RouterLink,
  Navigate,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { changePasswordWithIam } from '../api/auth'
import { formatAuthError, useAuth } from '../auth/AuthContext'
import { getValidAccessToken } from '../auth/sessionManager'
import { getTokenType, setSession } from '../auth/tokenStorage'
import { AuthFormLayout } from '../components/auth/AuthFormLayout'
import {
  PASSWORD_REQUIREMENTS_HINT,
  validateNewPassword,
  validatePasswordConfirmation,
} from '../utils/passwordValidation'

interface ChangePasswordPageProps {
  /** When `app`, rendered inside the authenticated dashboard shell. */
  variant?: 'public' | 'app'
}

export function ChangePasswordPage({ variant = 'public' }: ChangePasswordPageProps) {
  const { isAuthenticated, isReady, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const limitedScopeToken = searchParams.get('token')

  const isForcedChange = variant === 'public' && Boolean(limitedScopeToken)
  const isSignedInChange = variant === 'app' && isReady && isAuthenticated

  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string
    password?: string
    confirmPassword?: string
  }>({})
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (variant === 'app' && isReady && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: '/account/change-password' }} />
  }

  if (variant === 'public' && isReady && !limitedScopeToken && isAuthenticated) {
    return <Navigate to="/account/change-password" replace />
  }

  if (variant === 'public' && isReady && !limitedScopeToken && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: '/change-password' }} />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)

    const passwordError = validateNewPassword(password)
    const confirmError = validatePasswordConfirmation(password, confirmPassword)
    const currentError =
      isSignedInChange && !currentPassword.trim() ? 'Current password is required.' : null

    setFieldErrors({
      currentPassword: currentError ?? undefined,
      password: passwordError ?? undefined,
      confirmPassword: confirmError ?? undefined,
    })
    if (currentError || passwordError || confirmError) {
      return
    }

    setSubmitting(true)
    try {
      let accessToken = limitedScopeToken
      if (!accessToken) {
        accessToken = await getValidAccessToken()
      }
      if (!accessToken) {
        throw new Error('Session expired. Sign in again.')
      }

      const result = await changePasswordWithIam({
        accessToken,
        tokenType: getTokenType(),
        currentPassword: isSignedInChange ? currentPassword : undefined,
        newPassword: password,
      })

      if (result.accessToken && result.refreshToken && result.expiresIn) {
        setSession({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          tokenType: result.tokenType,
          user: user ?? undefined,
        })
      }

      setSuccessMessage(result.message)
      const canContinueSession = Boolean(result.accessToken && result.refreshToken && result.expiresIn)
      setTimeout(() => {
        navigate(isForcedChange && !canContinueSession ? '/login' : '/', { replace: true })
      }, 1200)
    } catch (err) {
      setError(formatAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const layout = (
    <Stack spacing={2.5} component="form" onSubmit={handleSubmit}>
      {isForcedChange ? (
        <Alert severity="warning">
          Your account requires a password update before you can use the subscription test UI.
        </Alert>
      ) : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

      {isSignedInChange ? (
        <TextField
          label="Current password"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
          required
          fullWidth
          error={Boolean(fieldErrors.currentPassword)}
          helperText={fieldErrors.currentPassword}
        />
      ) : null}

      <TextField
        label="New password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="new-password"
        required
        fullWidth
        error={Boolean(fieldErrors.password)}
        helperText={fieldErrors.password ?? PASSWORD_REQUIREMENTS_HINT}
      />

      <TextField
        label="Confirm new password"
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        autoComplete="new-password"
        required
        fullWidth
        error={Boolean(fieldErrors.confirmPassword)}
        helperText={fieldErrors.confirmPassword}
      />

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={submitting}
        startIcon={
          submitting ? <CircularProgress size={18} color="inherit" /> : <PasswordIcon />
        }
      >
        {submitting ? 'Updating…' : 'Update password'}
      </Button>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        {isSignedInChange ? (
          <>
            Back to{' '}
            <Link component={RouterLink} to="/">
              dashboard
            </Link>
          </>
        ) : (
          <>
            Return to{' '}
            <Link component={RouterLink} to="/login">
              sign in
            </Link>
          </>
        )}
      </Typography>
    </Stack>
  )

  if (isSignedInChange) {
    return (
      <Box sx={{ maxWidth: 520, mx: 'auto' }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Change password
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Update your IAM password while signed in{user?.email ? ` (${user.email})` : ''}.
        </Typography>
        {layout}
      </Box>
    )
  }

  return (
    <AuthFormLayout
      title="Change password"
      subtitle="Choose a new password to continue into the subscription test UI."
    >
      {layout}
    </AuthFormLayout>
  )
}
