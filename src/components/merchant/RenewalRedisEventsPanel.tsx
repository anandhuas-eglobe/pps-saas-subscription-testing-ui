import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  DEFAULT_REDIS_CONNECTION,
  readRedisStreams,
  type RedisStreamMessage,
} from '../../api/redisDevTools'
import { formatDateTime } from '../../utils/planDisplay'
import {
  eventMatchesMerchant,
  getRenewalEventSummary,
  RENEWAL_INTEGRATION_STREAMS,
  RENEWAL_STREAM_LABELS,
  renewalStreamSeverity,
} from '../../utils/renewalEventStreams'

interface RenewalRedisEventsPanelProps {
  merchantId?: string
  autoRefresh?: boolean
  refreshIntervalMs?: number
}

function severityColor(
  severity: ReturnType<typeof renewalStreamSeverity>,
): 'error' | 'warning' | 'info' | 'success' {
  return severity
}

function formatEventTime(message: RedisStreamMessage): string {
  if (message.timestamp) {
    const parsed = Number(message.timestamp)
    if (!Number.isNaN(parsed) && parsed > 0) {
      return formatDateTime(new Date(parsed).toISOString())
    }
  }

  const payload = message.payload
  if (payload && typeof payload === 'object') {
    const occurredAt = (payload as Record<string, unknown>).occurredAt
    if (typeof occurredAt === 'string') {
      return formatDateTime(occurredAt)
    }
    const cancelledAt = (payload as Record<string, unknown>).cancelledAt
    if (typeof cancelledAt === 'string') {
      return formatDateTime(cancelledAt)
    }
  }

  return message.id
}

export function RenewalRedisEventsPanel({
  merchantId,
  autoRefresh = false,
  refreshIntervalMs = 5000,
}: RenewalRedisEventsPanelProps) {
  const [messages, setMessages] = useState<RedisStreamMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterByMerchant, setFilterByMerchant] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await readRedisStreams({
        streams: [...RENEWAL_INTEGRATION_STREAMS],
        count: 30,
        redis: DEFAULT_REDIS_CONNECTION,
      })
      setMessages(result.messages)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read Redis streams'
      setError(message)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = window.setInterval(() => {
      void loadEvents()
    }, refreshIntervalMs)
    return () => window.clearInterval(interval)
  }, [autoRefresh, loadEvents, refreshIntervalMs])

  const visibleMessages = useMemo(() => {
    if (!filterByMerchant || !merchantId) {
      return messages
    }
    return messages.filter((message) => eventMatchesMerchant(message.payload, merchantId))
  }, [filterByMerchant, merchantId, messages])

  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ mb: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Box>
            <Typography variant="h6" gutterBottom>
              Renewal validation events (Redis)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Reads integration events published during renewal validation from Redis streams.
              Requires <code>MESSAGING_PROVIDER=redis</code> on the subscription service.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={filterByMerchant}
                  onChange={(event) => setFilterByMerchant(event.target.checked)}
                  disabled={!merchantId}
                />
              }
              label="Current merchant only"
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}
              onClick={() => void loadEvents()}
              disabled={loading}
            >
              Refresh events
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
          {RENEWAL_INTEGRATION_STREAMS.map((stream) => (
            <Chip key={stream} label={RENEWAL_STREAM_LABELS[stream]} size="small" variant="outlined" />
          ))}
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!error && !loading && visibleMessages.length === 0 && (
          <Alert severity="info">
            No renewal integration events found in Redis yet. Trigger a renewal (auto-renew or POST
            /renew) and refresh — validation failures and side effects appear here.
          </Alert>
        )}

        {visibleMessages.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>Summary</TableCell>
                  <TableCell width={48} />
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleMessages.map((message) => {
                  const rowKey = `${message.stream}:${message.id}`
                  const severity = renewalStreamSeverity(message.stream)
                  const isExpanded = expandedId === rowKey

                  return (
                    <Fragment key={rowKey}>
                      <TableRow hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {formatEventTime(message)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={RENEWAL_STREAM_LABELS[message.stream as keyof typeof RENEWAL_STREAM_LABELS] ?? message.stream}
                            size="small"
                            color={severityColor(severity)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {getRenewalEventSummary(message.stream, message.payload)}
                          </Typography>
                          {message.correlationId && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block' }}
                            >
                              correlation: {message.correlationId}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => setExpandedId(isExpanded ? null : rowKey)}
                          >
                            {isExpanded ? 'Hide' : 'JSON'}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Box
                              component="pre"
                              sx={{
                                m: 0,
                                p: 1.5,
                                bgcolor: 'grey.50',
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                overflow: 'auto',
                              }}
                            >
                              {JSON.stringify(message.payload, null, 2)}
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {visibleMessages.length > 0 && (
          <Accordion disableGutters sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">Stream reference</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                {RENEWAL_INTEGRATION_STREAMS.map((stream) => (
                  <Typography key={stream} variant="caption" color="text.secondary">
                    <strong>{RENEWAL_STREAM_LABELS[stream]}</strong> — {stream}
                  </Typography>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        )}
      </CardContent>
    </Card>
  )
}
