import { memo, useMemo, useState } from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { CopyJsonButton } from './CopyJsonButton'

const codeBlockSx = {
  m: 0,
  p: 2,
  borderRadius: 2,
  bgcolor: '#0f172a',
  color: '#e2e8f0',
  fontSize: '0.78rem',
  overflow: 'auto',
  maxHeight: 360,
  maxWidth: '100%',
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
}

interface ApiPayloadPreviewProps {
  payload: unknown
  title?: string
  defaultExpanded?: boolean
}

export const ApiPayloadPreview = memo(function ApiPayloadPreview({
  payload,
  title = 'Payload preview',
  defaultExpanded = false,
}: ApiPayloadPreviewProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

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
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', width: '100%', pr: 1 }}>
              <Typography variant="h6" sx={{ flex: 1 }}>
                {title}
              </Typography>
              <CopyJsonButton value={payload} label="Copy payload preview" />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Box component="pre" sx={codeBlockSx}>
              {payloadJson}
            </Box>
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  )
})
