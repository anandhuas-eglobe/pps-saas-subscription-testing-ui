import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import { extendMerchantSubscriptionEndDate } from '../api/plans'
import { ApiRequestError } from '../api/client'
import { PageHeader } from '../components/layout/PageHeader'
import type { ExtendMerchantSubscriptionEndDateResponse } from '../types/subscription'
import { formatDateTime } from '../utils/planDisplay'

export function ExtendSubscriptionEndDatePage() {
  const [merchantId, setMerchantId] = useState('')
  const [days, setDays] = useState('30')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ExtendMerchantSubscriptionEndDateResponse | null>(null)

  const handleSubmit = async () => {
    const parsedDays = Number(days)
    if (!merchantId.trim()) {
      setError('Merchant ID is required.')
      return
    }
    if (!Number.isInteger(parsedDays) || parsedDays <= 0) {
      setError('Days must be a positive integer.')
      return
    }

    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const response = await extendMerchantSubscriptionEndDate({
        merchantId: merchantId.trim(),
        days: parsedDays,
      })
      setResult(response)
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to extend subscription end date'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Admin"
        title="Extend subscription end date"
        description="Add days to a merchant's active subscription end date. Useful for testing renewal timing. To trigger auto-renew immediately, expire the subscription in DB (see Renewal Testing page)."
        apiEndpoint="POST /api/v1/admin/plans/merchant/extend-subscription-end-date"
        backTo="/merchant/renewal-testing"
        backLabel="Back to renewal testing"
      />

      <Card>
        <CardContent>
          <Stack spacing={2} sx={{ maxWidth: 480 }}>
            <TextField
              label="Merchant ID"
              placeholder="UUID of the merchant"
              value={merchantId}
              onChange={(event) => setMerchantId(event.target.value)}
              fullWidth
            />
            <TextField
              label="Days to add"
              type="number"
              slotProps={{ htmlInput: { min: 1 } }}
              value={days}
              onChange={(event) => setDays(event.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <EventAvailableIcon />}
              onClick={() => void handleSubmit()}
              disabled={submitting}
            >
              Extend end date
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      {result && (
        <Alert severity="success">
          <Typography variant="subtitle2" gutterBottom>
            {result.message}
          </Typography>
          <Typography variant="body2">
            Subscription {result.subscriptionId}: {formatDateTime(result.previousEndDate)} →{' '}
            {formatDateTime(result.newEndDate)}
          </Typography>
        </Alert>
      )}
    </Stack>
  )
}
