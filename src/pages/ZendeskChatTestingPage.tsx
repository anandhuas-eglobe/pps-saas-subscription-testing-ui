import { useCallback, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ChatIcon from '@mui/icons-material/Chat'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import RefreshIcon from '@mui/icons-material/Refresh'
import { fetchZendeskMessagingJwt, type ZendeskMessagingJwtResult } from '../api/zendeskMessaging'
import { ApiRequestError } from '../api/client'
import { ApiErrorAlert } from '../components/ApiErrorAlert'
import { ApiTransactionInspector } from '../components/ApiTransactionInspector'
import { PageHeader } from '../components/layout/PageHeader'
import { useApiTransaction } from '../hooks/useApiTransaction'
import {
  isZendeskMessengerAvailable,
  loginZendeskMessenger,
  logoutZendeskMessenger,
} from '../utils/zendeskMessenger'

declare global {
  interface Window {
    zE?: (...args: unknown[]) => void
  }
}

export function ZendeskChatTestingPage() {
  const { transaction, execute } = useApiTransaction()
  const [jwtResult, setJwtResult] = useState<ZendeskMessagingJwtResult | null>(null)
  const [loginStatus, setLoginStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const widgetReady = isZendeskMessengerAvailable()

  const handleFetchJwt = useCallback(async () => {
    setBusy(true)
    setError(null)
    setStatusMessage(null)
    try {
      const result = await execute(() => fetchZendeskMessagingJwt())
      setJwtResult(result)
      setStatusMessage('Messaging JWT fetched from merchant-support.')
    } catch (err) {
      setError(err)
      setJwtResult(null)
    } finally {
      setBusy(false)
    }
  }, [execute])

  const handleLoginUser = useCallback(async () => {
    setBusy(true)
    setError(null)
    setStatusMessage(null)
    setLoginStatus('idle')
    try {
      await execute(async () => {
        await loginZendeskMessenger()
        return { message: 'zE messenger loginUser succeeded' }
      })
      setLoginStatus('ok')
      setStatusMessage('Zendesk Web Widget authenticated via loginUser.')
      try {
        window.zE?.('messenger', 'show')
        window.zE?.('messenger', 'open')
      } catch {
        // optional UX helpers
      }
    } catch (err) {
      setLoginStatus('error')
      setError(err)
    } finally {
      setBusy(false)
    }
  }, [execute])

  const handleLogoutUser = useCallback(() => {
    setError(null)
    logoutZendeskMessenger()
    setLoginStatus('idle')
    setJwtResult(null)
    setStatusMessage('Called zE messenger logoutUser.')
  }, [])

  return (
    <Stack spacing={3} sx={{ pb: 4 }}>
      <PageHeader
        eyebrow="Support"
        title="Zendesk Chat Auth"
        description="Fetch a signed Messaging JWT from merchant-support and authenticate the Zendesk Web Widget with zE('messenger', 'loginUser', …)."
        apiEndpoint="GET /api/v1/support/zendesk/messaging-jwt"
      />

      <Alert severity={widgetReady ? 'success' : 'warning'}>
        Zendesk widget snippet:{' '}
        <Chip
          size="small"
          label={widgetReady ? 'zE loaded' : 'zE not ready'}
          color={widgetReady ? 'success' : 'warning'}
        />
        . The snippet is embedded in index.html; login uses the IAM session JWT to call merchant-support.
      </Alert>

      {statusMessage && <Alert severity="info">{statusMessage}</Alert>}
      {error != null && (
        <ApiErrorAlert
          error={error}
          fallbackMessage={
            error instanceof ApiRequestError
              ? error.body.message ?? error.message
              : 'Zendesk messaging auth failed'
          }
        />
      )}

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ChatIcon fontSize="small" /> Messaging JWT + Widget
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Permission required on the access token: <code>support.zendesk.messaging.jwt</code>.
              The widget also auto-logs in when you sign into this Test UI.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={busy ? <CircularProgress size={16} /> : <RefreshIcon />}
                disabled={busy}
                onClick={() => void handleFetchJwt()}
              >
                Fetch Messaging JWT
              </Button>
              <Button
                variant="contained"
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <LoginIcon />}
                disabled={busy || !widgetReady}
                onClick={() => void handleLoginUser()}
              >
                zE loginUser
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<LogoutIcon />}
                disabled={busy}
                onClick={handleLogoutUser}
              >
                zE logoutUser
              </Button>
            </Stack>

            {loginStatus !== 'idle' && (
              <Chip
                label={loginStatus === 'ok' ? 'Widget authenticated' : 'Widget login failed'}
                color={loginStatus === 'ok' ? 'success' : 'error'}
                sx={{ alignSelf: 'flex-start' }}
              />
            )}

            {jwtResult && (
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  overflow: 'auto',
                  fontSize: 12,
                }}
              >
                {JSON.stringify(
                  {
                    externalId: jwtResult.externalId,
                    expiresAt: jwtResult.expiresAt,
                    expiresInSeconds: jwtResult.expiresInSeconds,
                    jwtPreview: `${jwtResult.jwt.slice(0, 48)}…`,
                  },
                  null,
                  2,
                )}
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      <ApiTransactionInspector transaction={transaction} />
    </Stack>
  )
}
