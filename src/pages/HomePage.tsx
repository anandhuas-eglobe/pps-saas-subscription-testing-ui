import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import { Link as RouterLink } from 'react-router-dom'
import { operations } from '../config/operations'

export function HomePage() {
  return (
    <Stack spacing={4}>
      <Box
        sx={{
          p: { xs: 3, md: 5 },
          borderRadius: 4,
          background: 'linear-gradient(135deg, #312e81 0%, #4338ca 45%, #2563eb 100%)',
          color: 'white',
          boxShadow: '0 24px 60px rgba(49, 46, 129, 0.25)',
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ mb: 2, alignItems: 'center' }}>
          <RocketLaunchIcon />
          <Chip
            label="Subscription lifecycle testing"
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: 'white' }}
          />
        </Stack>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1.5, maxWidth: '18ch' }}>
          Subscription Admin Console
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: '52ch', fontWeight: 400 }}>
          Test subscription plan APIs end-to-end. Create plans, browse existing ones, configure
          merchant carts, and validate lifecycle workflows from a single testing UI.
        </Typography>
      </Box>

      <Box>
        <Typography variant="h5" sx={{ mb: 0.5 }}>
          Operations
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Choose an operation to get started.
        </Typography>

        <Grid container spacing={2.5}>
          {operations.map((operation) => {
            const Icon = operation.icon
            const card = (
              <Card
                sx={{
                  height: '100%',
                  opacity: operation.available ? 1 : 0.72,
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  ...(operation.available && {
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 16px 40px rgba(79, 70, 229, 0.15)',
                    },
                  }),
                }}
              >
                <CardActionArea
                  disabled={!operation.available}
                  {...(operation.available
                    ? { component: RouterLink, to: operation.path }
                    : {})}
                  sx={{ height: '100%', alignItems: 'stretch' }}
                >
                  <CardContent sx={{ p: 3, height: '100%' }}>
                    <Stack spacing={2} sx={{ height: '100%' }}>
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: 2.5,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: 'primary.main',
                          color: 'white',
                        }}
                      >
                        <Icon />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
                          <Typography variant="h6">{operation.title}</Typography>
                          {!operation.available && (
                            <Chip label="Coming soon" size="small" />
                          )}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {operation.description}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <Chip
                          label={operation.apiEndpoint}
                          size="small"
                          variant="outlined"
                          sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                        />
                        {operation.available && <ArrowForwardIcon color="primary" fontSize="small" />}
                      </Stack>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            )

            return (
              <Grid key={operation.path} size={{ xs: 12, md: 6, lg: 4 }}>
                {card}
              </Grid>
            )
          })}
        </Grid>
      </Box>
    </Stack>
  )
}
