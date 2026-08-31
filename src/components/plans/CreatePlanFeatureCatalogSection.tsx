import { memo } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CategoryIcon from '@mui/icons-material/Category'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import type { AttributeConfig, CatalogFeature, FeatureConfig } from '../../types/subscription'
import { defaultFeatureConfig } from '../../utils/planDefaults'
import { AttributeFeatureAccordion } from './AttributeFeatureAccordion'
import {
  RequiredAttributesSection,
  type RequiredAttributeEntry,
} from './RequiredAttributesSection'
import { SimpleFeatureAccordion } from './SimpleFeatureAccordion'

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
  onAttributeToggle: (featureId: string, attributeId: string, enabled: boolean) => void
  onConfigChange: (featureId: string, attributeId: string, patch: Partial<AttributeConfig>) => void
  onLinkFlagChange: (featureId: string, attributeId: string, value: boolean) => void
}

const OptionalAttributeFeatureItem = memo(function OptionalAttributeFeatureItem({
  feature,
  entry,
  onToggle,
  onAttributeToggle,
  onConfigChange,
  onLinkFlagChange,
}: OptionalAttributeFeatureItemProps) {
  return (
    <AttributeFeatureAccordion
      feature={feature}
      selected={Boolean(entry)}
      selectedAttributeIds={entry?.attributeIds ?? []}
      configs={entry?.configs ?? {}}
      linkFlags={entry?.linkFlags ?? {}}
      onToggle={(enabled) => onToggle(feature.id, enabled)}
      onAttributeToggle={(attributeId, enabled) =>
        onAttributeToggle(feature.id, attributeId, enabled)
      }
      onConfigChange={(attributeId, patch) => onConfigChange(feature.id, attributeId, patch)}
      onLinkFlagChange={(attributeId, value) => onLinkFlagChange(feature.id, attributeId, value)}
    />
  )
})

interface SimpleFeatureItemProps {
  feature: CatalogFeature
  selected: boolean
  config: FeatureConfig
  onToggle: (featureId: string, enabled: boolean) => void
  onConfigChange: (featureId: string, patch: Partial<FeatureConfig>) => void
}

const SimpleFeatureItem = memo(function SimpleFeatureItem({
  feature,
  selected,
  config,
  onToggle,
  onConfigChange,
}: SimpleFeatureItemProps) {
  return (
    <SimpleFeatureAccordion
      feature={feature}
      selected={selected}
      config={config}
      onToggle={(enabled) => onToggle(feature.id, enabled)}
      onConfigChange={(patch) => onConfigChange(feature.id, patch)}
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
  selectedSimpleFeatures: Record<string, FeatureConfig>
  simpleFeatures: CatalogFeature[]
  onRequiredConfigChange: (attributeId: string, patch: Partial<AttributeConfig>) => void
  onOptionalToggle: (featureId: string, enabled: boolean) => void
  onOptionalAttributeToggle: (featureId: string, attributeId: string, enabled: boolean) => void
  onOptionalConfigChange: (
    featureId: string,
    attributeId: string,
    patch: Partial<AttributeConfig>,
  ) => void
  onOptionalLinkFlagChange: (featureId: string, attributeId: string, value: boolean) => void
  onSimpleFeatureToggle: (featureId: string, enabled: boolean) => void
  onSimpleFeatureConfigChange: (featureId: string, patch: Partial<FeatureConfig>) => void
}

export const CreatePlanFeatureCatalogSection = memo(function CreatePlanFeatureCatalogSection({
  catalogLoading,
  catalogError,
  requiredAttributeEntries,
  requiredAttributeConfigs,
  optionalAttributeFeatures,
  selectedAttributeFeatures,
  selectedSimpleFeatures,
  simpleFeatures,
  onRequiredConfigChange,
  onOptionalToggle,
  onOptionalAttributeToggle,
  onOptionalConfigChange,
  onOptionalLinkFlagChange,
  onSimpleFeatureToggle,
  onSimpleFeatureConfigChange,
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
          Required attributes (<strong>NUM_USERS</strong>, <strong>MONTHLY_ORDER_VOLUME</strong>)
          are always included with <strong>INCLUDED</strong> pricing. PER_COUNT rows require
          per-unit monthly/yearly prices; VOLUME_PRICE rows require at least one tier and must omit
          count limits. Overage is only available on monthly-limit attributes. Linkable attributes
          can set <strong>linkToMonthlyOrderVolume</strong> (PER_COUNT only, no min/max limits).
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
          {optionalAttributeFeatures.length === 0 && !catalogLoading && (
            <Typography variant="body2" color="text.secondary">
              No optional attribute features in the catalog.
            </Typography>
          )}
          {optionalAttributeFeatures.map((feature) => (
            <OptionalAttributeFeatureItem
              key={feature.id}
              feature={feature}
              entry={selectedAttributeFeatures[feature.id]}
              onToggle={onOptionalToggle}
              onAttributeToggle={onOptionalAttributeToggle}
              onConfigChange={onOptionalConfigChange}
              onLinkFlagChange={onOptionalLinkFlagChange}
            />
          ))}
        </Stack>

        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Simple features
        </Typography>
        <Stack spacing={1.5}>
          {simpleFeatures.length === 0 && !catalogLoading && (
            <Typography variant="body2" color="text.secondary">
              No simple features in the catalog.
            </Typography>
          )}
          {simpleFeatures.map((feature) => {
            const selected = feature.id in selectedSimpleFeatures
            return (
              <SimpleFeatureItem
                key={feature.id}
                feature={feature}
                selected={selected}
                config={selectedSimpleFeatures[feature.id] ?? defaultFeatureConfig()}
                onToggle={onSimpleFeatureToggle}
                onConfigChange={onSimpleFeatureConfigChange}
              />
            )
          })}
        </Stack>
      </CardContent>
    </Card>
  )
})
