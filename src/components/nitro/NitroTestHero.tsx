import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import BoltIcon from '@mui/icons-material/Bolt'
import SpeedIcon from '@mui/icons-material/Speed'
import { Link as RouterLink } from 'react-router-dom'

interface NitroTestHeroProps {
  catalogCount?: number
  catalogReady?: boolean
  actions?: ReactNode
}

function SpeedStreak({
  top,
  left,
  width,
  rotate,
  opacity,
}: {
  top: string | number
  left: string | number
  width: number
  rotate: number
  opacity: number
}) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        top,
        left,
        width,
        height: 3,
        borderRadius: 999,
        background: 'linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.9), rgba(251, 191, 36, 0.8), transparent)',
        transform: `rotate(${rotate}deg)`,
        opacity,
        pointerEvents: 'none',
      }}
    />
  )
}

export function NitroTestHero({ catalogCount, catalogReady, actions }: NitroTestHeroProps) {
  return (
    <Stack spacing={2}>
      <Button
        component={RouterLink}
        to="/"
        startIcon={<ArrowBackIcon />}
        sx={{ alignSelf: 'flex-start' }}
      >
        Back to home
      </Button>

      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          p: { xs: 3, md: 5 },
          borderRadius: 4,
          color: 'white',
          background:
            'linear-gradient(125deg, #020617 0%, #1e1b4b 22%, #0e7490 52%, #c2410c 78%, #f97316 100%)',
          boxShadow: '0 28px 64px rgba(14, 116, 144, 0.28), 0 12px 32px rgba(249, 115, 22, 0.18)',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 85% 15%, rgba(251, 191, 36, 0.35) 0%, transparent 42%), radial-gradient(circle at 12% 88%, rgba(34, 211, 238, 0.22) 0%, transparent 38%)',
            pointerEvents: 'none',
          }}
        />

        <SpeedStreak top="18%" left="-8%" width={280} rotate={-8} opacity={0.55} />
        <SpeedStreak top="42%" left="55%" width={200} rotate={-14} opacity={0.4} />
        <SpeedStreak top="72%" left="8%" width={240} rotate={-5} opacity={0.35} />

        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            right: { xs: -40, md: 24 },
            top: { xs: -20, md: '50%' },
            transform: { md: 'translateY(-50%)' },
            width: { xs: 140, md: 200 },
            height: { xs: 140, md: 200 },
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.12)',
            background:
              'radial-gradient(circle at 30% 30%, rgba(34, 211, 238, 0.35), rgba(249, 115, 22, 0.15) 55%, transparent 70%)',
            opacity: 0.9,
            pointerEvents: 'none',
          }}
        />

        <Stack
          spacing={2.5}
          sx={{ position: 'relative', zIndex: 1, maxWidth: { md: '72%' } }}
        >
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(135deg, #22d3ee 0%, #f97316 100%)',
                boxShadow: '0 8px 24px rgba(34, 211, 238, 0.35)',
              }}
            >
              <BoltIcon sx={{ fontSize: 28 }} />
            </Box>
            <Chip
              icon={<SpeedIcon sx={{ color: 'inherit !important', fontSize: '16px !important' }} />}
              label="High-speed testing"
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.14)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.18)',
                backdropFilter: 'blur(8px)',
              }}
            />
            {catalogReady && catalogCount != null && (
              <Chip
                label={`${catalogCount} catalog features loaded`}
                size="small"
                sx={{
                  bgcolor: 'rgba(34, 211, 238, 0.18)',
                  color: '#ecfeff',
                  border: '1px solid rgba(34, 211, 238, 0.35)',
                }}
              />
            )}
          </Stack>

          <Box>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                mb: 0.5,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}
            >
              <Box
                component="span"
                sx={{
                  background: 'linear-gradient(90deg, #ffffff 0%, #fde68a 45%, #22d3ee 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Nitro
              </Box>{' '}
              Test
            </Typography>
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                color: 'rgba(255,255,255,0.72)',
                letterSpacing: '0.2em',
                fontWeight: 600,
              }}
            >
              Subscription lifecycle · turbo mode
            </Typography>
          </Box>

          <Typography variant="h6" sx={{ opacity: 0.92, maxWidth: '52ch', fontWeight: 400, lineHeight: 1.55 }}>
            One-click plan generation for rapid end-to-end testing. Each tier stacks higher limits,
            richer pricing mixes, and more INCLUDED / ADDON features — no form wizard required.
          </Typography>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {['5 tiers', '1-click create', 'Volume pricing', 'Addons included'].map((label) => (
              <Chip
                key={label}
                label={label}
                size="small"
                sx={{
                  bgcolor: 'rgba(0,0,0,0.22)',
                  color: 'rgba(255,255,255,0.92)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  fontWeight: 500,
                }}
              />
            ))}
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { xs: 'stretch', sm: 'center' }, pt: 0.5 }}
          >
            <Chip
              label="POST /api/v1/admin/plans/create-plan · GET /api/v1/features"
              size="small"
              sx={{
                bgcolor: 'rgba(0,0,0,0.28)',
                color: 'rgba(255,255,255,0.88)',
                border: '1px solid rgba(255,255,255,0.12)',
                fontFamily: 'monospace',
                fontSize: '0.7rem',
                maxWidth: '100%',
                height: 'auto',
                '& .MuiChip-label': {
                  display: 'block',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  py: 0.75,
                },
              }}
            />
            {actions}
          </Stack>
        </Stack>
      </Box>
    </Stack>
  )
}
