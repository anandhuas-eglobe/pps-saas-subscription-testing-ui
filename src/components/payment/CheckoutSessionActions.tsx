import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { openCheckoutSession } from '../../utils/checkoutSession'

interface CheckoutSessionActionsProps {
  checkoutUrl: string
  popupBlocked?: boolean
}

export function CheckoutSessionActions({
  checkoutUrl,
  popupBlocked = false,
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
        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
          {checkoutUrl}
        </Typography>
      </Stack>
    </Stack>
  )
}
