import Alert from '@mui/material/Alert'
import type { ReactNode } from 'react'
import { ValidationErrorsAlert } from './ValidationErrorsAlert'
import {
  extractApiErrorMeta,
  extractApiErrors,
  getApiErrorCode,
  getApiErrorTitle,
} from '../utils/apiErrors'

interface ApiErrorAlertProps {
  error: unknown
  subtitle?: string
  action?: ReactNode
}

export function ApiErrorAlert({ error, subtitle, action }: ApiErrorAlertProps) {
  const errors = extractApiErrors(error)
  const meta = extractApiErrorMeta(error)
  const title = getApiErrorTitle(error)
  const errorCode = getApiErrorCode(error)

  if (errors.length === 0 && !errorCode && !meta) {
    return (
      <Alert severity="error" action={action}>
        {title}
      </Alert>
    )
  }

  return (
    <ValidationErrorsAlert
      title={title}
      errors={errors}
      errorCode={errorCode}
      subtitle={subtitle}
      meta={meta}
      action={action}
    />
  )
}
