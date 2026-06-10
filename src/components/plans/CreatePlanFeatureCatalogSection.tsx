import { memo } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import CategoryIcon from '@mui/icons-material/Category'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import type { AttributeConfig, CatalogFeature } from '../../types/subscription'
import { defaultFeatureConfig } from '../../utils/planDefaults'
import { AttributeFeatureAccordion } from './AttributeFeatureAccordion'
import {
  RequiredAttributesSection,
  type RequiredAttributeEntry,
} from './RequiredAttributesSection'

type SelectedAttributeFeature = {
  featureId: string
  attributeIds: string[]
  configs: Record<string, AttributeConfig>
  linkFlags: Record<string, boolean>
}

interface OptionalAttributeFeatureItemProps {
  feature: CatalogFeature
  entry: SelectedAttributeFeature | undefined
  onToggle: (featureId: string, enabled: boolean) => void
  onConfigChange: (featureId: string, attributeId: string, patch: Partial<AttributeConfig>) => void
  onLinkFlagChange: (featureId: string, attributeId: string, value: boolean) => void
}

const OptionalAttributeFeatureItem = memo(function OptionalAttributeFeatureItem({
  feature,
  entry,
  onToggle,
  onConfigChange,
  onLinkFlagChange,
}: OptionalAttributeFeatureItemProps) {
  return (
    <AttributeFeatureAccordion
      feature={feature}
      selected={Boolean(entry)}
      configs={entry?.configs ?? {}}
      linkFlags={entry?.linkFlags ?? {}}
      onToggle={(enabled) => onToggle(feature.id, enabled)}
      onConfigChange={(attributeId, patch) => onConfigChange(feature.id, attributeId, patch)}
      onLinkFlagChange={(attributeId, value) => onLinkFlagChange(feature.id, attributeId, value)}
    />
  )
})

interface CreatePlanFeatureCatalogSectionProps {
  catalogLoading: boolean
  catalogError: string | null
  requiredAttributeEntries: RequiredAttributeEntry[]
  requiredAttributeConfigs: Record<string, AttributeConfig>
  optionalAttributeFeatures: CatalogFeature[]
  selectedAttributeFeatures: Record<string, SelectedAttributeFeature>
  selectedSimpleIds: string[]
  simpleFeatures: CatalogFeature[]
  onRequiredConfigChange: (attributeId: string, patch: Partial<AttributeConfig>) => void
  onOptionalToggle: (featureId: string, enabled: boolean) => void
  onOptionalConfigChange: (
    featureId: string,
    attributeId: string,
    patch: Partial<AttributeConfig>,
  ) => void
  onOptionalLinkFlagChange: (featureId: string, attributeId: string, value: boolean) => void
  onSimpleFeatureToggle: (featureId: string) => void
}

export const CreatePlanFeatureCatalogSection = memo(function CreatePlanFeatureCatalogSection({
  catalogLoading,
  catalogError,
  requiredAttributeEntries,
  requiredAttributeConfigs,
  optionalAttributeFeatures,
  selectedAttributeFeatures,
  selectedSimpleIds,
  simpleFeatures,
  onRequiredConfigChange,
  onOptionalToggle,
  onOptionalConfigChange,
  onOptionalLinkFlagChange,
  onSimpleFeatureToggle,
}: CreatePlanFeatureCatalogSectionProps) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
          <CategoryIcon color="primary" />
          <Typography variant="h6">Feature catalog</Typography>
        </Stack>

        {catalogLoading && (
          <Stack direction="row" spacing={1.5} sx={{ py: 2, alignItems: 'center' }}>
            <CircularProgress size={22} />
            <Typography color="text.secondary">
              Loading features from GET /api/v1/features...
            </Typography>
          </Stack>
        )}

        {catalogError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {catalogError}
          </Alert>
        )}

        <Alert icon={<InfoOutlinedIcon />} severity="info" sx={{ mb: 2 }}>
          These attributes are always included in every plan and must use <strong>INCLUDED</strong>{' '}
          pricing.
        </Alert>

        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Required attributes
        </Typography>
        <Box sx={{ mb: 3 }}>
          <RequiredAttributesSection
            entries={requiredAttributeEntries}
            configs={requiredAttributeConfigs}
            onConfigChange={onRequiredConfigChange}
          />
        </Box>

        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Optional attribute features
        </Typography>
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          {optionalAttributeFeatures.map((feature) => (
            <OptionalAttributeFeatureItem
              key={feature.id}
              feature={feature}
              entry={selectedAttributeFeatures[feature.id]}
              onToggle={onOptionalToggle}
              onConfigChange={onOptionalConfigChange}
              onLinkFlagChange={onOptionalLinkFlagChange}
            />
          ))}
        </Stack>

        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Simple features
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 1.5,
          }}
        >
          {simpleFeatures.map((feature) => {
            const checked = selectedSimpleIds.includes(feature.id)
            return (
              <Card
                key={feature.id}
                variant="outlined"
                sx={{
                  cursor: 'pointer',
                  borderColor: checked ? 'primary.main' : 'divider',
                  bgcolor: checked ? 'rgba(79, 70, 229, 0.05)' : 'background.paper',
                }}
                onClick={() => onSimpleFeatureToggle(feature.id)}
              >
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <FormControlLabel
                    control={<Switch checked={checked} />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {feature.name}
                        </Typography>
                        <Chip label={feature.code} size="small" sx={{ mt: 0.5 }} />
                      </Box>
                    }
                    sx={{ m: 0, alignItems: 'flex-start' }}
                  />
                </CardContent>
              </Card>
            )
          })}
        </Box>

        {selectedSimpleIds.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            Selected simple features use default INCLUDED config (
            {defaultFeatureConfig().planFeaturePriceMonthly} monthly /{' '}
            {defaultFeatureConfig().planFeaturePriceYearly} yearly).
          </Typography>
        )}
      </CardContent>
    </Card>
  )
})
