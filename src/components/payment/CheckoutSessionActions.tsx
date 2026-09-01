import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { openCheckoutSession } from '../../utils/checkoutSession'

interface CheckoutSessionActionsProps {
  checkoutUrl: string
  popupBlocked?: boolean
  onCancelCheckout?: () => void | Promise<void>
  cancellingCheckout?: boolean
}

export function CheckoutSessionActions({
  checkoutUrl,
  popupBlocked = false,
  onCancelCheckout,
  cancellingCheckout = false,
}: CheckoutSessionActionsProps) {
  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      {popupBlocked && (
        <Typography variant="body2" color="warning.main">
          Your browser blocked the checkout popup. Open the session manually below.
        </Typography>
      )}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<OpenInNewIcon />}
          onClick={() => openCheckoutSession(checkoutUrl)}
        >
          Open checkout session
        </Button>
        {onCancelCheckout && (
          <Button
            size="small"
            variant="outlined"
            color="warning"
            disabled={cancellingCheckout}
            startIcon={
              cancellingCheckout ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <CancelOutlinedIcon />
              )
            }
            onClick={() => void onCancelCheckout()}
          >
            {cancellingCheckout ? 'Cancelling…' : 'Cancel checkout'}
          </Button>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
          {checkoutUrl}
        </Typography>
      </Stack>
    </Stack>
  )
}
