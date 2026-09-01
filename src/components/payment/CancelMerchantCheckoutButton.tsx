import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import { cancelMerchantCheckout } from '../../api/merchant'
import { ApiRequestError } from '../../api/client'

interface CancelMerchantCheckoutButtonProps {
  onCancelled?: () => void | Promise<void>
  size?: 'small' | 'medium' | 'large'
  variant?: 'outlined' | 'text' | 'contained'
  label?: string
}

export function CancelMerchantCheckoutButton({
  onCancelled,
  size = 'small',
  variant = 'outlined',
  label = 'Cancel checkout session',
}: CancelMerchantCheckoutButtonProps) {
  const [cancelling, setCancelling] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCancel = async () => {
    setCancelling(true)
    setMessage(null)
    setError(null)

    try {
      const result = await cancelMerchantCheckout()
      setMessage(result.message)
      await onCancelled?.()
    } catch (err) {
      const errorMessage =
        err instanceof ApiRequestError
          ? err.body.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to cancel checkout'
      setError(errorMessage)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <Button
        size={size}
        variant={variant}
        color="warning"
        disabled={cancelling}
        startIcon={
          cancelling ? <CircularProgress size={size === 'small' ? 14 : 18} color="inherit" /> : <CancelOutlinedIcon />
        }
        onClick={() => void handleCancel()}
      >
        {cancelling ? 'Cancelling…' : label}
      </Button>
      {message && (
        <Alert severity="success" sx={{ mt: 1 }}>
          {message}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </>
  )
}
