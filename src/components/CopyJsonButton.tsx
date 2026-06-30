import { useCallback, useEffect, useState } from 'react'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'

interface CopyJsonButtonProps {
  value: unknown
  label?: string
  size?: 'small' | 'medium'
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function CopyJsonButton({ value, label = 'Copy JSON', size = 'small' }: CopyJsonButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const handleCopy = useCallback(async () => {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    await copyText(text)
    setCopied(true)
  }, [value])

  return (
    <Tooltip title={copied ? 'Copied!' : label}>
      <IconButton
        size={size}
        onClick={(event) => {
          event.stopPropagation()
          void handleCopy()
        }}
        aria-label={label}
        color={copied ? 'success' : 'default'}
      >
        {copied ? <CheckIcon fontSize="inherit" /> : <ContentCopyIcon fontSize="inherit" />}
      </IconButton>
    </Tooltip>
  )
}
