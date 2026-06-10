import { memo } from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import type { CatalogFeature, FeatureConfig } from '../../types/subscription'
import { defaultFeatureConfig } from '../../utils/planDefaults'
import { FeatureConfigFields } from './FeatureConfigFields'

interface SimpleFeatureAccordionProps {
  feature: CatalogFeature
  selected: boolean
  config: FeatureConfig
  onToggle: (enabled: boolean) => void
  onConfigChange: (patch: Partial<FeatureConfig>) => void
}

export const SimpleFeatureAccordion = memo(function SimpleFeatureAccordion({
  feature,
  selected,
  config,
  onToggle,
  onConfigChange,
}: SimpleFeatureAccordionProps) {
  return (
    <Accordion
      expanded={selected}
      onChange={(_, expanded) => onToggle(expanded)}
      disableGutters
      sx={{
        border: '1px solid',
        borderColor: selected ? 'primary.light' : 'divider',
        bgcolor: selected ? 'rgba(79, 70, 229, 0.04)' : 'background.paper',
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1.5} sx={{ width: '100%', pr: 1, alignItems: 'center' }}>
          <Checkbox checked={selected} tabIndex={-1} disableRipple />
          <Stack spacing={0.25} sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>{feature.name}</Typography>
            {feature.description && (
              <Typography variant="caption" color="text.secondary">
                {feature.description}
              </Typography>
            )}
          </Stack>
          <Chip label={feature.code} size="small" variant="outlined" />
        </Stack>
      </AccordionSummary>

      <AccordionDetails>
        <FeatureConfigFields
          config={config ?? defaultFeatureConfig()}
          onChange={onConfigChange}
        />
      </AccordionDetails>
    </Accordion>
  )
})
