import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { formatDateTime } from '../../utils/planDisplay'

interface NextRenewalDateFieldProps {
  nextRenewalDate: string | null | undefined
}

export function NextRenewalDateField({ nextRenewalDate }: NextRenewalDateFieldProps) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Next renewal date
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {nextRenewalDate ? formatDateTime(nextRenewalDate) : '—'}
      </Typography>
    </Box>
  )
}
