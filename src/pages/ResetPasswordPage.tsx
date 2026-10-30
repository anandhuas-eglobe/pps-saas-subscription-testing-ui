import { useEffect, useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import LockResetIcon from '@mui/icons-material/LockReset'
import { Link as RouterLink, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPasswordWithIam, verifyResetTokenWithIam } from '../api/auth'
import { formatAuthError, useAuth } from '../auth/AuthContext'
import { AuthFormLayout } from '../components/auth/AuthFormLayout'
import {
  PASSWORD_REQUIREMENTS_HINT,
  validateNewPassword,
  validatePasswordConfirmation,
} from '../utils/passwordValidation'

export function ResetPasswordPage() {
  const { isAuthenticated, isReady } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tokenFromQuery = searchParams.get('token') ?? ''
  const emailFromQuery = searchParams.get('email') ?? ''

  const [resetToken, setResetToken] = useState(tokenFromQuery)
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string
    confirmPassword?: string
  }>({})
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (tokenFromQuery) {
      setResetToken(tokenFromQuery)
    }
  }, [tokenFromQuery])

  useEffect(() => {
    const trimmedToken = resetToken.trim()
    if (!trimmedToken) {
      setVerifiedEmail(null)
      setVerifyError(null)
      setVerifying(false)
      return
    }

    let cancelled = false
    setVerifying(true)
    setVerifyError(null)
    setVerifiedEmail(null)

    void verifyResetTokenWithIam(trimmedToken)
      .then((result) => {
        if (cancelled) {
          return
        }
        if (!result.valid || !result.email) {
          setVerifyError('This reset link is invalid or has expired.')
          return
        }
        setVerifiedEmail(result.email)
      })
      .catch((err) => {
        if (!cancelled) {
          setVerifyError(formatAuthError(err))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setVerifying(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [resetToken])

  if (isReady && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)

    const trimmedToken = resetToken.trim()
    const passwordError = validateNewPassword(password)
    const confirmError = validatePasswordConfirmation(password, confirmPassword)
    setFieldErrors({
      password: passwordError ?? undefined,
      confirmPassword: confirmError ?? undefined,
    })
    if (passwordError || confirmError) {
      return
    }

    if (!trimmedToken) {
      setError('Password reset token is required.')
      return
    }

    setSubmitting(true)
    try {
      const message = await resetPasswordWithIam(trimmedToken, password)
      setSuccessMessage(message)
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1500)
    } catch (err) {
      setError(formatAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const tokenReady = Boolean(resetToken.trim()) && Boolean(verifiedEmail) && !verifyError

  return (
    <AuthFormLayout
      title="Reset password"
      subtitle="Set a new IAM password using the reset token from your email. The token is filled automatically after forgot-password, or from /reset-password?token=…"
    >
      <Stack spacing={2.5} component="form" onSubmit={handleSubmit}>
        {emailFromQuery ? (
          <Alert severity="info">
            Resetting password for <strong>{emailFromQuery}</strong>
          </Alert>
        ) : null}

        {!resetToken.trim() ? (
          <Alert severity="warning">
            No reset token in the URL. Start from{' '}
            <Link component={RouterLink} to="/forgot-password">
              forgot password
            </Link>{' '}
            or paste a token below.
          </Alert>
        ) : null}

        {verifying ? (
          <Alert severity="info" icon={<CircularProgress size={18} />}>
            Verifying reset token…
          </Alert>
        ) : null}
        {verifyError ? <Alert severity="error">{verifyError}</Alert> : null}
        {verifiedEmail && !emailFromQuery ? (
          <Alert severity="info">Resetting password for {verifiedEmail}</Alert>
        ) : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

        <TextField
          label="Password reset token"
          value={resetToken}
          onChange={(event) => setResetToken(event.target.value)}
          fullWidth
          multiline
          minRows={2}
          helperText="Populated automatically after forgot-password, or from /reset-password?token=…"
        />

        <TextField
          label="New password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
          fullWidth
          disabled={!tokenReady || verifying}
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
          disabled={!tokenReady || verifying}
          error={Boolean(fieldErrors.confirmPassword)}
          helperText={fieldErrors.confirmPassword}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={submitting || verifying || !tokenReady}
          startIcon={
            submitting ? <CircularProgress size={18} color="inherit" /> : <LockResetIcon />
          }
        >
          {submitting ? 'Saving…' : 'Save new password'}
        </Button>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Need a new link?{' '}
          <Link component={RouterLink} to="/forgot-password">
            Request reset again
          </Link>
        </Typography>
      </Stack>
    </AuthFormLayout>
  )
}
