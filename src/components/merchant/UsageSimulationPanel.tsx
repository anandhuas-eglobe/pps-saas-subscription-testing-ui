import { useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RefreshIcon from '@mui/icons-material/Refresh'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import {
  confirmMerchantUsage,
  logMerchantUsage,
  removeMerchantUsage,
  validateMerchantUsage,
} from '../../api/usageTracking'
import type { ApiResponse, SubscriptionLimitAndUsage } from '../../types/subscription'
import { formatUsageLimit } from '../../utils/planDisplay'
import { deriveIsOverageFromUsage } from '../../utils/usageTracking'
import { ApiLogPanel } from '../ApiLogPanel'

type SimulationStep = 'validate' | 'log' | 'confirm'

interface OperationLog {
  payload?: unknown
  response?: ApiResponse<unknown> | null
  error?: unknown
}

interface UsageSimulationPanelProps {
  merchantSubscriptionId: string
  limitsAndUsages: SubscriptionLimitAndUsage[]
  refreshingUsage?: boolean
  onUsageUpdated?: () => void | Promise<void>
}

function createEntityReferenceId(): string {
  return crypto.randomUUID()
}

function buildApiResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    timestamp: new Date().toISOString(),
    data,
  }
}

function usageProgressPercent(row: SubscriptionLimitAndUsage): number | null {
  if (row.usageType.toUpperCase() === 'UNLIMITED' || row.usageLimit == null || row.usageLimit <= 0) {
    return null
  }

  return Math.min(100, Math.round((row.usedCount / row.usageLimit) * 100))
}

function formatAttributeUsageLabel(row: SubscriptionLimitAndUsage): string {
  const usage = formatUsageLimit(
    row.usageType,
    row.usedCount,
    row.usageLimit,
    row.scheduledUsageLimit,
  )
  return `${row.attributeCode} · ${usage}`
}

function hasLoggedIsOverage(value: boolean | null): value is boolean {
  return typeof value === 'boolean'
}

export function UsageSimulationPanel({
  merchantSubscriptionId,
  limitsAndUsages,
  refreshingUsage = false,
  onUsageUpdated,
}: UsageSimulationPanelProps) {
  const [activeStep, setActiveStep] = useState<SimulationStep>('validate')
  const [attributeCode, setAttributeCode] = useState('')
  const [entityReferenceId, setEntityReferenceId] = useState(createEntityReferenceId)
  const [planFeatureAttributeId, setPlanFeatureAttributeId] = useState('')
  const [subscriptionId, setSubscriptionId] = useState(merchantSubscriptionId)
  const [isOverageAllowed, setIsOverageAllowed] = useState(false)
  const [loggedIsOverage, setLoggedIsOverage] = useState<boolean | null>(null)
  const [usageId, setUsageId] = useState('')
  const [usageLimit, setUsageLimit] = useState<number | null>(null)
  const [removeAttributeCode, setRemoveAttributeCode] = useState('')
  const [removeEntityReferenceId, setRemoveEntityReferenceId] = useState('')
  const [runningFlow, setRunningFlow] = useState(false)
  const [validateLog, setValidateLog] = useState<OperationLog>({})
  const [logLog, setLogLog] = useState<OperationLog>({})
  const [confirmLog, setConfirmLog] = useState<OperationLog>({})
  const [removeLog, setRemoveLog] = useState<OperationLog>({})

  const attributeOptions = useMemo(
    () =>
      limitsAndUsages.map((row) => ({
        code: row.attributeCode,
        planFeatureAttributeId: row.planFeatureAttributeId,
        usageLimit: row.usageLimit,
        overageEnabled: row.overageEnabled,
        usedCount: row.usedCount,
        usageType: row.usageType,
        scheduledUsageLimit: row.scheduledUsageLimit,
      })),
    [limitsAndUsages],
  )

  const selectedUsageRow = limitsAndUsages.find((row) => row.attributeCode === attributeCode)
  const selectedAttribute = attributeOptions.find((option) => option.code === attributeCode)

  function applyAttributeSelection(code: string) {
    setAttributeCode(code)
    const match = attributeOptions.find((option) => option.code === code)
    if (match) {
      setPlanFeatureAttributeId(match.planFeatureAttributeId)
      setUsageLimit(match.usageLimit)
    }
  }

  async function refreshCurrentUsage() {
    if (onUsageUpdated) {
      await onUsageUpdated()
    }
  }

  async function handleValidate() {
    const payload = { attributeCode }
    setValidateLog({ payload })

    try {
      const data = await validateMerchantUsage(attributeCode)
      setPlanFeatureAttributeId(data.planFeatureAttributeId)
      setSubscriptionId(data.merchantSubscriptionId)
      setIsOverageAllowed(Boolean(data.isOverageAllowed))
      setUsageLimit(data.usageLimit)
      setLoggedIsOverage(null)
      setValidateLog({ payload, response: buildApiResponse(data) })
      setActiveStep('log')
    } catch (error) {
      setValidateLog({ payload, error })
    }
  }

  async function handleLog() {
    const payload = {
      attributeCode,
      entityReferenceId,
      planFeatureAttributeId,
      merchantSubscriptionId: subscriptionId,
      isOverageAllowed,
    }
    setLogLog({ payload })
    setLoggedIsOverage(null)

    try {
      const data = await logMerchantUsage(payload, {
        fallbackIsOverage: deriveIsOverageFromUsage(selectedUsageRow),
      })
      setUsageId(data.id)
      setLoggedIsOverage(data.isOverage)
      setLogLog({ payload, response: buildApiResponse(data) })
      setActiveStep('confirm')
    } catch (error) {
      setLogLog({ payload, error })
    }
  }

  async function handleConfirm() {
    if (!hasLoggedIsOverage(loggedIsOverage)) {
      return
    }

    const payload = {
      entityReferenceId,
      attributeCode,
      isOverage: loggedIsOverage,
      usageId,
    }
    setConfirmLog({ payload })

    try {
      const data = await confirmMerchantUsage(payload)
      setConfirmLog({ payload, response: buildApiResponse(data) })
      setActiveStep('confirm')
      await refreshCurrentUsage()
    } catch (error) {
      setConfirmLog({ payload, error })
    }
  }

  async function handleRemove() {
    const payload = {
      entityReferenceId: removeEntityReferenceId,
      attributeCode: removeAttributeCode,
    }
    setRemoveLog({ payload })

    try {
      await removeMerchantUsage(payload)
      setRemoveLog({
        payload,
        response: {
          success: true,
          timestamp: new Date().toISOString(),
          message: 'Usage removed (204 No Content)',
        },
      })
      await refreshCurrentUsage()
    } catch (error) {
      setRemoveLog({ payload, error })
    }
  }

  async function handleRunFullFlow() {
    if (!attributeCode) {
      return
    }

    setRunningFlow(true)
    setValidateLog({})
    setLogLog({})
    setConfirmLog({})
    setRemoveLog({})
    setLoggedIsOverage(null)

    const validatePayload = { attributeCode }
    setValidateLog({ payload: validatePayload })
    let step: SimulationStep = 'validate'

    try {
      const validateData = await validateMerchantUsage(attributeCode)
      setPlanFeatureAttributeId(validateData.planFeatureAttributeId)
      setSubscriptionId(validateData.merchantSubscriptionId)
      setIsOverageAllowed(validateData.isOverageAllowed)
      setUsageLimit(validateData.usageLimit)
      setValidateLog({ payload: validatePayload, response: buildApiResponse(validateData) })

      const logPayload = {
        attributeCode,
        entityReferenceId,
        planFeatureAttributeId: validateData.planFeatureAttributeId,
        merchantSubscriptionId: validateData.merchantSubscriptionId,
        isOverageAllowed: validateData.isOverageAllowed,
      }
      step = 'log'
      setLogLog({ payload: logPayload })

      const logData = await logMerchantUsage(logPayload, {
        fallbackIsOverage: deriveIsOverageFromUsage(
          limitsAndUsages.find((row) => row.attributeCode === attributeCode),
        ),
      })
      setUsageId(logData.id)
      setLoggedIsOverage(logData.isOverage)
      setLogLog({ payload: logPayload, response: buildApiResponse(logData) })

      const confirmPayload = {
        entityReferenceId,
        attributeCode,
        isOverage: logData.isOverage,
        usageId: logData.id,
      }
      step = 'confirm'
      setConfirmLog({ payload: confirmPayload })

      const confirmData = await confirmMerchantUsage(confirmPayload)
      setConfirmLog({ payload: confirmPayload, response: buildApiResponse(confirmData) })
      setActiveStep('confirm')
      await refreshCurrentUsage()
    } catch (error) {
      if (step === 'validate') {
        setValidateLog({ payload: validatePayload, error })
      } else if (step === 'log') {
        setLogLog((current) => ({ ...current, error }))
      } else {
        setConfirmLog((current) => ({ ...current, error }))
      }
    } finally {
      setRunningFlow(false)
    }
  }

  function applyFlowContextToRemove() {
    setRemoveEntityReferenceId(entityReferenceId)
    setRemoveAttributeCode(attributeCode)
  }

  function resetSession() {
    setEntityReferenceId(createEntityReferenceId())
    setUsageId('')
    setIsOverageAllowed(false)
    setLoggedIsOverage(null)
    setValidateLog({})
    setLogLog({})
    setConfirmLog({})
    setRemoveLog({})
    setRemoveAttributeCode('')
    setRemoveEntityReferenceId('')
    setActiveStep('validate')
  }

  return (
    <Stack spacing={3}>
      <Alert severity="info">
        Run the validate → log → confirm sequence to simulate consumption tracking. Remove is a
        separate cleanup call — use it when you need to drop tracked usage for an entity without
        going through the flow again.
      </Alert>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Usage tracking flow
            </Typography>

            {limitsAndUsages.length > 0 && (
              <Box>
                <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
                  <Typography variant="subtitle2">Current usage</Typography>
                  {refreshingUsage && <CircularProgress size={14} />}
                </Stack>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Attribute</TableCell>
                        <TableCell>Consumption</TableCell>
                        <TableCell width="40%">Progress</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {limitsAndUsages.map((row) => {
                        const progress = usageProgressPercent(row)
                        const isSelected = row.attributeCode === attributeCode

                        return (
                          <TableRow
                            key={row.usageId}
                            hover
                            selected={isSelected}
                            sx={{ cursor: 'pointer' }}
                            onClick={() => applyAttributeSelection(row.attributeCode)}
                          >
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: isSelected ? 600 : 400 }}>
                                {row.attributeCode}
                              </Typography>
                              <Chip label={row.usageType} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatUsageLimit(
                                  row.usageType,
                                  row.usedCount,
                                  row.usageLimit,
                                  row.scheduledUsageLimit,
                                )}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {progress != null ? (
                                <Stack spacing={0.5}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={progress}
                                    color={progress >= 100 ? 'error' : progress >= 80 ? 'warning' : 'primary'}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    {progress}% of limit
                                  </Typography>
                                </Stack>
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  No limit
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            <FormControl fullWidth size="small">
              <InputLabel id="usage-simulation-attribute-label">Attribute</InputLabel>
              <Select
                labelId="usage-simulation-attribute-label"
                label="Attribute"
                value={attributeCode}
                onChange={(event) => applyAttributeSelection(event.target.value)}
              >
                {attributeOptions.length === 0 && (
                  <MenuItem value="" disabled>
                    No INCLUDED attributes on this subscription
                  </MenuItem>
                )}
                {attributeOptions.map((option) => {
                  const row = limitsAndUsages.find((item) => item.attributeCode === option.code)
                  return (
                    <MenuItem key={option.code} value={option.code}>
                      {row ? formatAttributeUsageLabel(row) : option.code}
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { sm: 'flex-end' } }}
            >
              <TextField
                label="Entity reference id"
                size="small"
                fullWidth
                value={entityReferenceId}
                onChange={(event) => setEntityReferenceId(event.target.value)}
              />
              <Button
                variant="outlined"
                onClick={() => setEntityReferenceId(createEntityReferenceId())}
              >
                New UUID
              </Button>
            </Stack>

            {selectedAttribute && selectedUsageRow && (
              <Stack spacing={0.5}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Current usage:{' '}
                  {formatUsageLimit(
                    selectedUsageRow.usageType,
                    selectedUsageRow.usedCount,
                    selectedUsageRow.usageLimit,
                    selectedUsageRow.scheduledUsageLimit,
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Plan feature attribute: {selectedAttribute.planFeatureAttributeId} · Subscription:{' '}
                  {subscriptionId}
                  {usageLimit != null ? ` · Validated limit: ${usageLimit}` : ''}
                  {selectedUsageRow.overageEnabled ? ' · Overage enabled' : ''}
                </Typography>
              </Stack>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                disabled={!attributeCode || runningFlow}
                onClick={() => void handleRunFullFlow()}
              >
                Run validate → log → confirm
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={resetSession}
                disabled={runningFlow}
              >
                Reset session
              </Button>
            </Stack>

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Partial testing
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  disabled={!attributeCode || runningFlow}
                  onClick={() => void handleValidate()}
                >
                  Validate
                </Button>
                <Button
                  variant="outlined"
                  disabled={
                    runningFlow ||
                    !attributeCode ||
                    !entityReferenceId ||
                    !planFeatureAttributeId ||
                    !subscriptionId
                  }
                  onClick={() => void handleLog()}
                >
                  Log
                </Button>
                <Button
                  variant="outlined"
                  disabled={
                    runningFlow ||
                    !attributeCode ||
                    !entityReferenceId ||
                    !usageId ||
                    !hasLoggedIsOverage(loggedIsOverage)
                  }
                  onClick={() => void handleConfirm()}
                >
                  Confirm
                </Button>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeStep}
          onChange={(_, value: SimulationStep) => setActiveStep(value)}
          aria-label="Usage simulation steps"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="1. Validate" value="validate" />
          <Tab label="2. Log" value="log" />
          <Tab label="3. Confirm" value="confirm" />
        </Tabs>
      </Box>

      {activeStep === 'validate' && (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            GET /api/v1/merchant/usage-tracking/validate — checks whether usage can be tracked for
            the selected attribute.
          </Typography>
          <ApiLogPanel
            title="Validate response"
            payload={validateLog.payload}
            response={validateLog.response}
            error={validateLog.error}
          />
        </Stack>
      )}

      {activeStep === 'log' && (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            POST /api/v1/merchant/usage-tracking/log — records pending usage for an entity.
          </Typography>
          <TextField
            label="Plan feature attribute id"
            size="small"
            fullWidth
            value={planFeatureAttributeId}
            onChange={(event) => setPlanFeatureAttributeId(event.target.value)}
          />
          <TextField
            label="Merchant subscription id"
            size="small"
            fullWidth
            value={subscriptionId}
            onChange={(event) => setSubscriptionId(event.target.value)}
          />
          <FormControlLabel
            control={<Switch checked={isOverageAllowed} disabled />}
            label="Overage allowed (from validate response)"
          />
          {loggedIsOverage !== null && (
            <FormControlLabel
              control={<Switch checked={loggedIsOverage} disabled />}
              label="Counts as overage (from log response)"
            />
          )}
          <ApiLogPanel
            title="Log response"
            payload={logLog.payload}
            response={logLog.response}
            error={logLog.error}
          />
        </Stack>
      )}

      {activeStep === 'confirm' && (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            PUT /api/v1/merchant/usage-tracking/confirm — finalizes the pending usage row.
          </Typography>
          <TextField
            label="Usage id"
            size="small"
            fullWidth
            value={usageId}
            onChange={(event) => setUsageId(event.target.value)}
            helperText="Populated automatically after a successful log step"
          />
          <FormControlLabel
            control={<Switch checked={loggedIsOverage ?? false} disabled />}
            label="Counts as overage (from log response)"
          />
          <Typography variant="caption" color="text.secondary">
            {loggedIsOverage === null
              ? 'Run log first — confirm uses isOverage from the log response.'
              : !hasLoggedIsOverage(loggedIsOverage)
                ? 'Log response did not include a valid isOverage flag. Run log again.'
                : `Confirm sends isOverage: ${String(loggedIsOverage)} from the log response.`}
          </Typography>
          <ApiLogPanel
            title="Confirm response"
            payload={confirmLog.payload}
            response={confirmLog.response}
            error={confirmLog.error}
          />
        </Stack>
      )}

      <Divider />

      <Card
        variant="outlined"
        sx={{
          borderColor: 'warning.main',
          bgcolor: 'warning.50',
          boxShadow: 'none',
        }}
      >
        <CardContent>
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'warning.main',
                    color: 'warning.contrastText',
                  }}
                >
                  <DeleteOutlineOutlinedIcon />
                </Box>
                <Box>
                  <Typography variant="h6">Remove tracked usage</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Standalone cleanup — not part of the validate / log / confirm sequence.
                  </Typography>
                </Box>
              </Stack>
              <Chip
                label="DELETE /api/v1/merchant/usage-tracking/remove"
                size="small"
                variant="outlined"
                sx={{ fontFamily: 'monospace', fontSize: '0.7rem', alignSelf: { xs: 'flex-start', sm: 'center' } }}
              />
            </Stack>

            <Typography variant="body2" color="text.secondary">
              Deletes usage tied to an entity reference and attribute. Typical use: roll back a
              confirmed entity after testing, or clear stale tracking without re-running the flow.
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel id="usage-remove-attribute-label">Attribute</InputLabel>
              <Select
                labelId="usage-remove-attribute-label"
                label="Attribute"
                value={removeAttributeCode}
                onChange={(event) => setRemoveAttributeCode(event.target.value)}
              >
                {attributeOptions.length === 0 && (
                  <MenuItem value="" disabled>
                    No INCLUDED attributes on this subscription
                  </MenuItem>
                )}
                {limitsAndUsages.map((row) => (
                  <MenuItem key={row.attributeCode} value={row.attributeCode}>
                    {formatAttributeUsageLabel(row)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { sm: 'flex-end' } }}
            >
              <TextField
                label="Entity reference id"
                size="small"
                fullWidth
                value={removeEntityReferenceId}
                onChange={(event) => setRemoveEntityReferenceId(event.target.value)}
              />
              <Button
                variant="outlined"
                onClick={() => setRemoveEntityReferenceId(createEntityReferenceId())}
              >
                New UUID
              </Button>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="warning"
                startIcon={<DeleteOutlineOutlinedIcon />}
                disabled={!removeAttributeCode || !removeEntityReferenceId}
                onClick={() => void handleRemove()}
              >
                Remove usage
              </Button>
              <Button
                variant="text"
                disabled={!attributeCode && !entityReferenceId}
                onClick={applyFlowContextToRemove}
              >
                Use values from flow above
              </Button>
            </Stack>

            <ApiLogPanel
              title="Remove response"
              payload={removeLog.payload}
              response={removeLog.response}
              error={removeLog.error}
            />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
