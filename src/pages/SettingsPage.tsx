import { useEffect, useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Radio from '@mui/material/Radio'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import { useTheme } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {
  deleteApiServer,
  getApiServers,
  getDefaultNotificationsWsUrl,
  getSelectedApiServerId,
  setSelectedApiServerId,
  upsertApiServer,
  type ApiServer,
} from '../config/apiServersStorage'
import {
  APP_VISUAL_THEMES,
  getAppVisualThemeMeta,
  type AppVisualThemeId,
} from '../theme/visualThemes'

export function SettingsPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { isAuthenticated, isReady } = useAuth()
  const [servers, setServers] = useState<ApiServer[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [notificationsWsUrl, setNotificationsWsUrl] = useState(getDefaultNotificationsWsUrl())
  const [visualTheme, setVisualTheme] = useState<AppVisualThemeId>('default')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function refresh(): void {
    setServers(getApiServers())
    setSelectedId(getSelectedApiServerId())
  }

  useEffect(() => {
    refresh()
  }, [])

  function handleBack(): void {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate(isReady && isAuthenticated ? '/' : '/login', { replace: true })
  }

  function resetForm(): void {
    setEditingId(null)
    setName('')
    setBaseUrl('')
    setNotificationsWsUrl(getDefaultNotificationsWsUrl())
    setVisualTheme('default')
    setError(null)
  }

  function handleSelectServer(id: string): void {
    setSelectedApiServerId(id)
    setSelectedId(id)
    const server = getApiServers().find((item) => item.id === id)
    setMessage(
      server
        ? `Active: “${server.name}” (${server.baseUrl}) · theme ${getAppVisualThemeMeta(server.theme).label}`
        : null,
    )
    setError(null)
  }

  function handleEdit(server: ApiServer): void {
    setEditingId(server.id)
    setName(server.name)
    setBaseUrl(server.baseUrl)
    setNotificationsWsUrl(server.notificationsWsUrl)
    setVisualTheme(server.theme)
    setError(null)
    setMessage(null)
  }

  function handleDelete(server: ApiServer): void {
    deleteApiServer(server.id)
    refresh()
    resetForm()
    setMessage(`Removed “${server.name}”.`)
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault()
    setError(null)
    setMessage(null)

    try {
      const saved = upsertApiServer({
        id: editingId ?? undefined,
        name,
        baseUrl,
        notificationsWsUrl,
        theme: visualTheme,
      })
      refresh()
      resetForm()
      setMessage(
        editingId
          ? `Updated “${saved.name}”.`
          : `Added “${saved.name}”. Select it below to route API calls there.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save server.')
    }
  }

  const selectedServer = servers.find((server) => server.id === selectedId) ?? null

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: theme.custom.pageShellBackground,
        py: { xs: 2, sm: 4 },
      }}
    >
      <Box sx={{ maxWidth: 760, mx: 'auto', px: 2 }}>
        <Stack spacing={3}>
          <Stack spacing={2}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
              sx={{ alignSelf: 'flex-start' }}
            >
              Back
            </Button>
            <Box>
              <Chip label="Configuration" size="small" color="primary" sx={{ mb: 1 }} />
              <Typography variant="h4" gutterBottom>
                Settings
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Configure API servers, notification sockets, and a visual theme so each environment
                is easy to recognize.
              </Typography>
            </Box>
          </Stack>

          {selectedServer ? (
            <Alert severity="info">
              Active server: <strong>{selectedServer.name}</strong> —{' '}
              <Box component="span" sx={{ fontFamily: 'monospace' }}>
                {selectedServer.baseUrl}
              </Box>
              {' · '}
              theme <strong>{getAppVisualThemeMeta(selectedServer.theme).label}</strong>
              {' · '}
              WS{' '}
              <Box component="span" sx={{ fontFamily: 'monospace' }}>
                {selectedServer.notificationsWsUrl}
              </Box>
            </Alert>
          ) : null}

          {error ? <Alert severity="error">{error}</Alert> : null}
          {message ? <Alert severity="success">{message}</Alert> : null}

          <Paper sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3 }}>
            <Stack spacing={2} component="form" onSubmit={handleSubmit}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {editingId ? <EditOutlinedIcon color="primary" /> : <AddOutlinedIcon color="primary" />}
                <Typography variant="h6">
                  {editingId ? 'Edit API server' : 'Add API server'}
                </Typography>
              </Stack>

              <TextField
                label="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="localhost"
                required
                fullWidth
                size="small"
              />
              <TextField
                label="API base URL"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="http://localhost:8080"
                required
                fullWidth
                size="small"
                helperText="No trailing slash. Paths like /api/v1/... are appended automatically."
              />
              <TextField
                label="Notifications WS URL"
                value={notificationsWsUrl}
                onChange={(event) => setNotificationsWsUrl(event.target.value)}
                placeholder="http://localhost:3108"
                required
                fullWidth
                size="small"
                helperText="Socket.IO host for live notifications (without /notifications)."
              />

              <FormControl fullWidth size="small">
                <InputLabel id="server-theme-label">Visual theme</InputLabel>
                <Select
                  labelId="server-theme-label"
                  label="Visual theme"
                  value={visualTheme}
                  onChange={(event) => setVisualTheme(event.target.value as AppVisualThemeId)}
                >
                  {APP_VISUAL_THEMES.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 0.5 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 24,
                            borderRadius: 1,
                            flexShrink: 0,
                            background: item.previewGradient,
                            border: '1px solid rgba(15, 23, 42, 0.12)',
                            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)',
                          }}
                        />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  background: APP_VISUAL_THEMES.find((item) => item.id === visualTheme)?.previewGradient,
                  color: 'white',
                  minHeight: 72,
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}>
                  Preview · {getAppVisualThemeMeta(visualTheme).label}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                {editingId ? (
                  <Button type="button" onClick={resetForm}>
                    Cancel
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={editingId ? <SaveOutlinedIcon /> : <AddOutlinedIcon />}
                >
                  {editingId ? 'Save changes' : 'Add server'}
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Box>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Saved servers
            </Typography>
            <Stack spacing={1.5}>
              {servers.map((server) => {
                const isSelected = server.id === selectedId
                const themeMeta = getAppVisualThemeMeta(server.theme)

                return (
                  <Card
                    key={server.id}
                    variant="outlined"
                    sx={{
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      bgcolor: isSelected ? 'action.selected' : undefined,
                    }}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: 'flex-start', minWidth: 0, flex: 1, cursor: 'pointer' }}
                          onClick={() => handleSelectServer(server.id)}
                        >
                          <Radio
                            checked={isSelected}
                            value={server.id}
                            onChange={() => handleSelectServer(server.id)}
                            size="small"
                            sx={{ mt: -0.25 }}
                          />
                          <Box sx={{ minWidth: 0 }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}
                            >
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {server.name}
                              </Typography>
                              {isSelected ? (
                                <Chip label="Active" size="small" color="primary" />
                              ) : null}
                              <Chip
                                size="small"
                                label={themeMeta.label}
                                sx={{
                                  color: 'white',
                                  background: themeMeta.previewGradient,
                                }}
                              />
                            </Stack>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                            >
                              API {server.baseUrl}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontFamily: 'monospace', wordBreak: 'break-all', display: 'block' }}
                            >
                              WS {server.notificationsWsUrl}
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                          <Tooltip title="Edit">
                            <IconButton
                              aria-label={`Edit ${server.name}`}
                              size="small"
                              onClick={() => handleEdit(server)}
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              aria-label={`Delete ${server.name}`}
                              size="small"
                              color="error"
                              onClick={() => handleDelete(server)}
                            >
                              <DeleteOutlineOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                )
              })}
            </Stack>
          </Box>

          <Divider />
          <Typography variant="caption" color="text.secondary">
            Selecting a server applies its API base URL, notifications socket host, and visual theme
            across the whole test UI. Values are stored in this browser only.
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}
