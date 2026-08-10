import { useCallback, useEffect, useState } from 'react'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { getValidAccessToken } from '../../auth/sessionManager'

export function CopyAccessTokenButton() {
  const [copied, setCopied] = useState(false)
  const [copying, setCopying] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const handleCopy = useCallback(async () => {
    setCopying(true)
    try {
      const token = await getValidAccessToken()
      if (!token) {
        return
      }
      await navigator.clipboard.writeText(token)
      setCopied(true)
    } finally {
      setCopying(false)
    }
  }, [])

  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy access token to clipboard'}>
      <span>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          onClick={() => void handleCopy()}
          disabled={copying}
          startIcon={
            copied ? (
              <CheckIcon sx={{ fontSize: '18px !important' }} />
            ) : (
              <ContentCopyIcon sx={{ fontSize: '18px !important' }} />
            )
          }
          sx={{
            color: 'white',
            borderColor: 'rgba(255,255,255,0.45)',
            flexShrink: 0,
            '&:hover': {
              borderColor: 'rgba(255,255,255,0.8)',
              bgcolor: 'rgba(255,255,255,0.08)',
            },
            '&.Mui-disabled': {
              color: 'rgba(255,255,255,0.45)',
              borderColor: 'rgba(255,255,255,0.2)',
            },
          }}
        >
          {copied ? 'Copied!' : 'Copy token'}
        </Button>
      </span>
    </Tooltip>
  )
}
