import { useEffect, useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import SubscriptionsIcon from '@mui/icons-material/Subscriptions'
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { formatAuthError, useAuth } from '../auth/AuthContext'
import {
  deleteSavedCredential,
  getLastSelectedCredentialId,
  getSaveCredentialsOnLogin,
  getSavedCredentialById,
  getSavedCredentials,
  setLastSelectedCredentialId,
  setSaveCredentialsOnLogin,
  upsertSavedCredential,
  type SavedCredential,
} from '../auth/savedCredentialsStorage'

const EMPTY_CREDENTIAL_SELECTION = ''

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
  const [savedCredentials, setSavedCredentials] = useState<SavedCredential[]>([])
  const [selectedCredentialId, setSelectedCredentialId] = useState(EMPTY_CREDENTIAL_SELECTION)
  const [saveOnLogin, setSaveOnLogin] = useState(false)
  const [saveLabel, setSaveLabel] = useState('')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    const credentials = getSavedCredentials()
    setSavedCredentials(credentials)
    setSaveOnLogin(getSaveCredentialsOnLogin())

    const lastSelectedId = getLastSelectedCredentialId()
    if (!lastSelectedId) {
      return
    }

    const lastSelected = getSavedCredentialById(lastSelectedId)
    if (!lastSelected) {
      return
    }

    setSelectedCredentialId(lastSelected.id)
    setEmail(lastSelected.email)
    setPassword(lastSelected.password)
    setRememberMe(lastSelected.rememberMe)
    setSaveLabel(lastSelected.label)
  }, [])

  if (isReady && isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  function applySavedCredential(credential: SavedCredential): void {
    setSelectedCredentialId(credential.id)
    setEmail(credential.email)
    setPassword(credential.password)
    setRememberMe(credential.rememberMe)
    setSaveLabel(credential.label)
    setLastSelectedCredentialId(credential.id)
    setSaveMessage(null)
    setError(null)
  }

  function handleCredentialSelection(credentialId: string): void {
    setSelectedCredentialId(credentialId)
    setSaveMessage(null)

    if (!credentialId) {
      setLastSelectedCredentialId(null)
      return
    }

    const credential = getSavedCredentialById(credentialId)
    if (credential) {
      applySavedCredential(credential)
    }
  }

  function handleSaveCredentials(): void {
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setSaveMessage('Enter an email and password before saving credentials.')
      return
    }

    const saved = upsertSavedCredential({
      id: selectedCredentialId || undefined,
      label: saveLabel.trim() || trimmedEmail,
      email: trimmedEmail,
      password,
      rememberMe,
    })

    setSavedCredentials(getSavedCredentials())
    applySavedCredential(saved)
    setSaveMessage(`Saved credentials for ${saved.label}.`)
  }

  function handleDeleteSelectedCredential(): void {
    if (!selectedCredentialId) {
      return
    }

    deleteSavedCredential(selectedCredentialId)
    setSavedCredentials(getSavedCredentials())
    setSelectedCredentialId(EMPTY_CREDENTIAL_SELECTION)
    setSaveLabel('')
    setSaveMessage('Saved credentials removed.')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaveMessage(null)
    setSubmitting(true)

    try {
      await login(email, password, rememberMe)

      if (saveOnLogin) {
        const saved = upsertSavedCredential({
          id: selectedCredentialId || undefined,
          label: saveLabel.trim() || email.trim(),
          email,
          password,
          rememberMe,
        })
        setLastSelectedCredentialId(saved.id)
      }

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
          {saveMessage ? <Alert severity="success">{saveMessage}</Alert> : null}

          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <FormControl fullWidth size="small">
                <InputLabel id="saved-credentials-label">Saved credentials</InputLabel>
                <Select
                  labelId="saved-credentials-label"
                  label="Saved credentials"
                  value={selectedCredentialId}
                  onChange={(event) => handleCredentialSelection(event.target.value)}
                >
                  <MenuItem value={EMPTY_CREDENTIAL_SELECTION}>
                    {savedCredentials.length > 0 ? 'Enter manually' : 'No saved credentials yet'}
                  </MenuItem>
                  {savedCredentials.map((credential) => (
                    <MenuItem key={credential.id} value={credential.id}>
                      {credential.label} ({credential.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Tooltip title="Delete selected saved credentials">
                <span>
                  <IconButton
                    aria-label="Delete selected saved credentials"
                    color="error"
                    disabled={!selectedCredentialId}
                    onClick={handleDeleteSelectedCredential}
                  >
                    <DeleteOutlineOutlinedIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Pick a saved test account to fill the login form, or save new credentials below.
            </Typography>
          </Stack>

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

          <Divider />

          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Save credentials locally</Typography>
            <TextField
              label="Saved profile label"
              value={saveLabel}
              onChange={(event) => setSaveLabel(event.target.value)}
              placeholder={email.trim() || 'Merchant admin, QA user, etc.'}
              fullWidth
              size="small"
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                type="button"
                variant="outlined"
                startIcon={<BookmarkAddOutlinedIcon />}
                onClick={handleSaveCredentials}
                disabled={!email.trim() || !password}
                fullWidth
              >
                Save credentials
              </Button>
            </Stack>
            <FormControlLabel
              control={
                <Checkbox
                  checked={saveOnLogin}
                  onChange={(event) => {
                    setSaveOnLogin(event.target.checked)
                    setSaveCredentialsOnLogin(event.target.checked)
                  }}
                />
              }
              label="Update saved credentials when signing in"
            />
            <Typography variant="caption" color="text.secondary">
              Saved credentials are stored in this browser&apos;s localStorage for quick test logins.
            </Typography>
          </Stack>

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting || !email || !password}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <LockOutlinedIcon />}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>

          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            Need a new merchant account?{' '}
            <Link component={RouterLink} to="/merchant/signup">
              Start merchant signup
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  )
}
