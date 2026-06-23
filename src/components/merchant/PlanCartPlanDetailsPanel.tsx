import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import TuneIcon from '@mui/icons-material/Tune'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import type { ReactNode } from 'react'
import type { PlanCartPlanDetails, PlanDetail } from '../../types/subscription'
import {
  resolvePlanAttributeLabel,
  resolvePlanEntityLabel,
  resolvePlanFeatureLabel,
} from '../../utils/planCartDisplay'

interface PlanCartPlanDetailsPanelProps {
  plan: PlanDetail
  planDetails: PlanCartPlanDetails
}

function SectionHeader({
  icon,
  title,
  count,
  color = 'default',
}: {
  icon: ReactNode
  title: string
  count: number
  color?: 'default' | 'warning' | 'info' | 'success'
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
      {icon}
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Chip label={count} size="small" color={color} variant={count > 0 ? 'filled' : 'outlined'} />
    </Stack>
  )
}

function EmptyNote({ children }: { children: string }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
      {children}
    </Typography>
  )
}

export function PlanCartPlanDetailsPanel({ plan, planDetails }: PlanCartPlanDetailsPanelProps) {
  const selections = planDetails.selections ?? []
  const systemAddedEntities = planDetails.systemAddedEntities ?? []
  const autoAlignedAttributes = planDetails.autoAlignedAttributes ?? []
  const warningAttributes = planDetails.warningAttributes ?? []

  const hasTransitionMetadata =
    systemAddedEntities.length > 0 ||
    autoAlignedAttributes.length > 0 ||
    warningAttributes.length > 0

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Cart selections & transition metadata
      </Typography>

      {warningAttributes.length > 0 && (
        <Alert severity="warning" icon={<WarningAmberIcon />}>
          {warningAttributes.length} attribute warning
          {warningAttributes.length === 1 ? '' : 's'} on this cart. Review usage vs selected
          limits before checkout.
        </Alert>
      )}

      {systemAddedEntities.length > 0 && (
        <Alert severity="info" icon={<PlaylistAddIcon />}>
          The system added {systemAddedEntities.length} feature
          {systemAddedEntities.length === 1 ? '' : 's'} or attribute
          {systemAddedEntities.length === 1 ? '' : 's'} during plan transition to satisfy usage or
          plan rules.
        </Alert>
      )}

      {autoAlignedAttributes.length > 0 && (
        <Alert severity="info" icon={<AutoFixHighIcon />}>
          {autoAlignedAttributes.length} attribute limit
          {autoAlignedAttributes.length === 1 ? '' : 's'} were auto-aligned to match current usage.
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent>
          <SectionHeader
            icon={<TuneIcon fontSize="small" color="primary" />}
            title="Your selections"
            count={selections.length}
          />
          {selections.length === 0 ? (
            <EmptyNote>No feature selections on this cart (trial or base plan only).</EmptyNote>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Feature</TableCell>
                    <TableCell>Attribute</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell>Trial</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selections.flatMap((selection) => {
                    const featureLabel = resolvePlanFeatureLabel(plan, selection.planFeatureId)
                    const attributes = selection.attributes ?? []

                    if (attributes.length === 0) {
                      return (
                        <TableRow key={selection.planFeatureId}>
                          <TableCell>{featureLabel}</TableCell>
                          <TableCell>—</TableCell>
                          <TableCell align="right">—</TableCell>
                          <TableCell>
                            {selection.isAddonTrial ? (
                              <Chip label="Add-on trial" size="small" color="warning" />
                            ) : (
                              '—'
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    }

                    return attributes.map((attribute, index) => (
                      <TableRow
                        key={`${selection.planFeatureId}-${attribute.planFeatureAttributeId}`}
                      >
                        <TableCell>{index === 0 ? featureLabel : ''}</TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {resolvePlanAttributeLabel(plan, attribute.planFeatureAttributeId)}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontFamily: 'monospace' }}
                          >
                            {attribute.planFeatureAttributeId}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{attribute.value.toLocaleString()}</TableCell>
                        <TableCell>
                          {index === 0 && selection.isAddonTrial ? (
                            <Chip label="Add-on trial" size="small" color="warning" />
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderColor: systemAddedEntities.length > 0 ? 'info.light' : undefined }}>
        <CardContent>
          <SectionHeader
            icon={<PlaylistAddIcon fontSize="small" color="info" />}
            title="System-added entities"
            count={systemAddedEntities.length}
            color="info"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Features or attributes the backend added automatically during upgrade/downgrade
            transition.
          </Typography>
          {systemAddedEntities.length === 0 ? (
            <EmptyNote>None — no system-added entities on this cart.</EmptyNote>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Entity</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {systemAddedEntities.map((entity) => (
                    <TableRow key={`${entity.type}-${entity.id}`}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {resolvePlanEntityLabel(plan, entity.id, entity.type)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {entity.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={entity.type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">{entity.count.toLocaleString()}</TableCell>
                      <TableCell>{entity.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderColor: autoAlignedAttributes.length > 0 ? 'success.light' : undefined }}>
        <CardContent>
          <SectionHeader
            icon={<AutoFixHighIcon fontSize="small" color="success" />}
            title="Auto-aligned attributes"
            count={autoAlignedAttributes.length}
            color="success"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Limits adjusted upward so selected counts are not below current usage.
          </Typography>
          {autoAlignedAttributes.length === 0 ? (
            <EmptyNote>None — no attribute limits were auto-aligned.</EmptyNote>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Attribute</TableCell>
                    <TableCell align="right">Previous</TableCell>
                    <TableCell align="right">Adjusted</TableCell>
                    <TableCell>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {autoAlignedAttributes.map((row) => (
                    <TableRow key={row.attributeId}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {resolvePlanAttributeLabel(plan, row.attributeId)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {row.attributeId}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {row.previousSelectedCount.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontWeight: 600, color: 'success.main' }}>
                          {row.adjustedCount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card
        variant="outlined"
        sx={{ borderColor: warningAttributes.length > 0 ? 'warning.light' : undefined }}
      >
        <CardContent>
          <SectionHeader
            icon={<WarningAmberIcon fontSize="small" color="warning" />}
            title="Warning attributes"
            count={warningAttributes.length}
            color="warning"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Selected limits that may be insufficient relative to current usage.
          </Typography>
          {warningAttributes.length === 0 ? (
            <EmptyNote>None — no usage warnings on this cart.</EmptyNote>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Attribute</TableCell>
                    <TableCell align="right">Selected</TableCell>
                    <TableCell align="right">Used</TableCell>
                    <TableCell align="right">Required min</TableCell>
                    <TableCell>Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {warningAttributes.map((row) => (
                    <TableRow key={row.attributeId}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {resolvePlanAttributeLabel(plan, row.attributeId)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {row.attributeId}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{row.selectedCount.toLocaleString()}</TableCell>
                      <TableCell align="right">{row.usedCount.toLocaleString()}</TableCell>
                      <TableCell align="right">{row.requiredMinimum.toLocaleString()}</TableCell>
                      <TableCell>
                        <Box sx={{ maxWidth: 320 }}>
                          <Typography variant="body2">{row.message}</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {!hasTransitionMetadata && selections.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          Transition metadata arrays are empty — cart selections were accepted as submitted with no
          system adjustments or warnings.
        </Typography>
      )}
    </Stack>
  )
}
