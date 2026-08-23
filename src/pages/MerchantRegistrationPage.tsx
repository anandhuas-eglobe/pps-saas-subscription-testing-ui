import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import Link from '@mui/material/Link'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined'
import SubscriptionsIcon from '@mui/icons-material/Subscriptions'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import { completeMerchantProfile, listIndustryDropdown } from '../api/merchantSignup'
import { ApiRequestError } from '../api/client'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { PageHeader } from '../components/layout/PageHeader'
import { setSession } from '../auth/tokenStorage'
import {
  setLastSelectedCredentialId,
  upsertSavedCredential,
} from '../auth/savedCredentialsStorage'
import { useApiTransaction } from '../hooks/useApiTransaction'
import type { CompleteMerchantProfileResult, IndustryDropdownItem } from '../types/merchantSignup'

export function MerchantRegistrationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tokenFromQuery = searchParams.get('token') ?? ''
  const emailFromQuery = searchParams.get('email') ?? ''

  const [verificationToken, setVerificationToken] = useState(tokenFromQuery)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [industryId, setIndustryId] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('+12025551234')
  const [password, setPassword] = useState('Password@123')
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const [industries, setIndustries] = useState<IndustryDropdownItem[]>([])
  const [loadingIndustries, setLoadingIndustries] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CompleteMerchantProfileResult | null>(null)
  const { transaction, execute } = useApiTransaction()

  useEffect(() => {
    if (tokenFromQuery) {
      setVerificationToken(tokenFromQuery)
    }
  }, [tokenFromQuery])

  useEffect(() => {
    let cancelled = false

    async function loadIndustries() {
      setLoadingIndustries(true)
      try {
        const items = await listIndustryDropdown()
        if (!cancelled) {
          setIndustries(items)
          if (items.length > 0) {
            setIndustryId((current) => current || items[0].id)
          }
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiRequestError
              ? err.body.message ?? err.message
              : err instanceof Error
                ? err.message
                : 'Failed to load industries'
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setLoadingIndustries(false)
        }
      }
    }

    void loadIndustries()

    return () => {
      cancelled = true
    }
  }, [])

  const livePayload = useMemo(() => {
    if (!verificationToken.trim()) {
      return undefined
    }
    return {
      verificationToken: verificationToken.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      businessName: businessName.trim(),
      industryId,
      phoneNumber: phoneNumber.trim(),
      password: password ? '••••••••' : '',
      termsAccepted,
    }
  }, [
    verificationToken,
    firstName,
    lastName,
    businessName,
    industryId,
    phoneNumber,
    password,
    termsAccepted,
  ])

  const handleSubmit = async () => {
    if (!verificationToken.trim()) {
      setError('Verification token is required.')
      return
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.')
      return
    }
    if (businessName.trim().length < 2) {
      setError('Business name must be at least 2 characters.')
      return
    }
    if (!industryId) {
      setError('Industry is required.')
      return
    }
    if (!termsAccepted) {
      setError('You must accept the Terms & Conditions.')
      return
    }

    setSubmitting(true)
    setError(null)
    setResult(null)

    try {
      const payload = {
        verificationToken: verificationToken.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        businessName: businessName.trim(),
        industryId,
        phoneNumber: phoneNumber.trim(),
        password,
        termsAccepted: true as const,
      }

      const response = await execute(
        { ...payload, password: '••••••••' },
        () => completeMerchantProfile(payload),
        'POST /api/v1/merchants/complete-your-profile',
      )

      setResult(response)
      setSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
        tokenType: response.tokenType,
        user: {
          id: response.user.id,
          email: response.user.email,
          username: response.user.username,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          displayName: response.user.displayName,
          role: response.user.role,
        },
      })

      const savedCredential = upsertSavedCredential({
        label: firstName.trim() || response.user.email,
        email: response.user.email,
        password,
      })
      setLastSelectedCredentialId(savedCredential.id)
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to complete merchant profile'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Merchant MS"
        title="Complete merchant profile"
        description="Finish merchant registration using the email verification token. This mirrors the production `/register?token=…` flow and posts to the merchant complete-your-profile endpoint."
        apiEndpoint="POST /api/v1/merchants/complete-your-profile"
        backTo="/merchant/signup"
        backLabel="Back to signup"
      />

      {emailFromQuery && (
        <Alert severity="info">
          Completing registration for <strong>{emailFromQuery}</strong>
        </Alert>
      )}

      {!verificationToken && (
        <Alert severity="warning">
          No verification token in the URL. Start from{' '}
          <Link component={RouterLink} to="/merchant/signup">
            merchant signup
          </Link>{' '}
          or paste a token below.
        </Alert>
      )}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <TextField
              label="Verification token"
              value={verificationToken}
              onChange={(event) => setVerificationToken(event.target.value)}
              fullWidth
              multiline
              minRows={2}
              helperText="Populated automatically after signup initiation, or from /register?token=…"
            />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="First name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                fullWidth
              />
              <TextField
                label="Last name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                fullWidth
              />
            </Stack>

            <TextField
              label="Business name"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              fullWidth
            />

            <FormControl fullWidth disabled={loadingIndustries}>
              <InputLabel>Industry</InputLabel>
              <Select
                label="Industry"
                value={industryId}
                onChange={(event) => setIndustryId(event.target.value)}
              >
                {industries.map((industry) => (
                  <MenuItem key={industry.id} value={industry.id}>
                    {industry.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Phone number"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              fullWidth
              helperText="E.164 format, e.g. +12025551234"
            />

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              fullWidth
              helperText="Must include upper, lower, digit, and special character (@$!%*?&)"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((value) => !value)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                />
              }
              label="I accept the Terms & Conditions"
            />

            <Box>
              <Button
                variant="contained"
                startIcon={
                  submitting ? <CircularProgress size={16} color="inherit" /> : <HowToRegOutlinedIcon />
                }
                onClick={() => void handleSubmit()}
                disabled={submitting || loadingIndustries}
              >
                Complete registration
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      {result && (
        <Alert severity="success">
          <Typography variant="subtitle2" gutterBottom>
            Merchant account created for {result.merchant.businessName}
          </Typography>
          <Typography variant="body2" gutterBottom>
            Signed in as {result.user.email} ({result.user.role ?? 'Merchant Admin'}). Credentials
            saved for quick login.
          </Typography>
          <Button variant="outlined" size="small" onClick={() => navigate('/', { replace: true })}>
            Go to test UI home
          </Button>
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
        <SubscriptionsIcon fontSize="small" />
        <Typography variant="body2">
          Need a new invitation?{' '}
          <Link component={RouterLink} to="/merchant/signup">
            Start merchant signup
          </Link>
        </Typography>
      </Box>

      <ApiTransactionInspector
        livePayload={livePayload}
        livePayloadTitle="Complete profile payload"
        transaction={transaction}
      />
    </Stack>
  )
}
