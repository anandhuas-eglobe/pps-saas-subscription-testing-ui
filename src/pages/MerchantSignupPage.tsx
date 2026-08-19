import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined'
import SubscriptionsIcon from '@mui/icons-material/Subscriptions'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { initiateMerchantSignup } from '../api/merchantSignup'
import { ApiRequestError } from '../api/client'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { PageHeader } from '../components/layout/PageHeader'
import { useApiTransaction } from '../hooks/useApiTransaction'
import { waitForRegistrationVerificationToken } from '../utils/verificationToken'

export function MerchantSignupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { transaction, execute } = useApiTransaction()

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('Email is required.')
      return
    }

    setSubmitting(true)
    setError(null)
    setStatusMessage(null)

    try {
      const payload = { email: normalizedEmail }
      const result = await execute(
        payload,
        () => initiateMerchantSignup(payload),
        'POST /api/v1/merchants/signup/initiate',
      )

      setStatusMessage(`${result.message} Fetching verification token from notification email logs…`)

      const verificationToken = await execute(
        { toEmail: normalizedEmail },
        () => waitForRegistrationVerificationToken(normalizedEmail),
        'GET /api/v1/email-logs (poll for verificationUrl)',
      )

      navigate(
        `/register?token=${encodeURIComponent(verificationToken)}&email=${encodeURIComponent(normalizedEmail)}`,
        { replace: true },
      )
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to initiate merchant signup'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Merchant MS"
        title="Merchant signup"
        description="Start merchant self-registration by sending a verification email, then automatically resolve the registration token from notification service email logs and open the profile completion form."
        apiEndpoint="POST /api/v1/merchants/signup/initiate · GET /api/v1/email-logs"
        backTo="/login"
        backLabel="Back to login"
      />

      <Card>
        <CardContent>
          <Stack spacing={2} sx={{ maxWidth: 480 }}>
            <Typography variant="body2" color="text.secondary">
              Enter the email for a new merchant account. After signup initiation, the test UI polls
              notification email logs for the `auth/registration-verification` message and opens
              `/register` with the extracted token.
            </Typography>
            <TextField
              label="Email"
              type="email"
              placeholder="newmerchant@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              fullWidth
              autoComplete="email"
            />
            <Button
              variant="contained"
              startIcon={
                submitting ? <CircularProgress size={16} color="inherit" /> : <PersonAddOutlinedIcon />
              }
              onClick={() => void handleSubmit()}
              disabled={submitting}
            >
              {submitting ? 'Sending invitation…' : 'Send signup invitation'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {statusMessage && <Alert severity="info">{statusMessage}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: 'text.secondary',
        }}
      >
        <SubscriptionsIcon fontSize="small" />
        <Typography variant="body2">
          Already have an account?{' '}
          <Link component={RouterLink} to="/login">
            Sign in
          </Link>
        </Typography>
      </Box>

      <ApiTransactionInspector
        livePayload={email.trim() ? { email: email.trim().toLowerCase() } : undefined}
        livePayloadTitle="Signup initiate payload"
        transaction={transaction}
      />
    </Stack>
  )
}
