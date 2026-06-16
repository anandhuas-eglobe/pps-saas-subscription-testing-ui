import { memo, useMemo, useState } from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import type { CreatePlanPayload } from '../../types/subscription'

interface CreatePlanPayloadPreviewProps {
  payload: CreatePlanPayload
}

export const CreatePlanPayloadPreview = memo(function CreatePlanPayloadPreview({
  payload,
}: CreatePlanPayloadPreviewProps) {
  const [expanded, setExpanded] = useState(false)

  const payloadJson = useMemo(
    () => (expanded ? JSON.stringify(payload, null, 2) : ''),
    [expanded, payload],
  )

  return (
    <Card>
      <CardContent sx={{ pb: '16px !important' }}>
        <Accordion
          expanded={expanded}
          onChange={(_, isExpanded) => setExpanded(isExpanded)}
          disableGutters
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Payload preview</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 2,
                borderRadius: 2,
                bgcolor: '#0f172a',
                color: '#e2e8f0',
                fontSize: '0.78rem',
                overflow: 'auto',
                maxHeight: 360,
                maxWidth: '100%',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {payloadJson}
            </Box>
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  )
})
