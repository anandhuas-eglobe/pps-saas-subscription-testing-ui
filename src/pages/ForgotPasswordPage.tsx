import { useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom'
import { forgotPasswordWithIam } from '../api/auth'
import { formatAuthError, useAuth } from '../auth/AuthContext'
import { AuthFormLayout } from '../components/auth/AuthFormLayout'
import { waitForPasswordResetToken } from '../utils/verificationToken'

export function ForgotPasswordPage() {
  const { isAuthenticated, isReady } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isReady && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('Email is required.')
      return
    }

    setError(null)
    setStatusMessage(null)
    setSubmitting(true)

    try {
      const message = await forgotPasswordWithIam(normalizedEmail)
      setStatusMessage(`${message} Fetching reset token from notification email logs…`)

      const resetToken = await waitForPasswordResetToken(normalizedEmail)

      navigate(
        `/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(normalizedEmail)}`,
        { replace: true },
      )
    } catch (err) {
      setError(formatAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFormLayout
      title="Forgot password"
      subtitle="Request a password reset email, then open the reset form automatically with the token from notification email logs — same pattern as merchant signup → /register."
    >
      <Stack spacing={2.5} component="form" onSubmit={handleSubmit}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {statusMessage ? <Alert severity="info">{statusMessage}</Alert> : null}

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

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={submitting || !email.trim()}
          startIcon={
            submitting ? <CircularProgress size={18} color="inherit" /> : <EmailOutlinedIcon />
          }
        >
          {submitting ? 'Sending…' : 'Send reset link'}
        </Button>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Remember your password?{' '}
          <Link component={RouterLink} to="/login">
            Back to sign in
          </Link>
        </Typography>
      </Stack>
    </AuthFormLayout>
  )
}
