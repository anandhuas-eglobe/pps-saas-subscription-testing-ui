import { useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import SearchIcon from '@mui/icons-material/Search'
import { EmailTemplateTestCard } from '../components/email-templates/EmailTemplateTestCard'
import { PageHeader } from '../components/layout/PageHeader'
import {
  EMAIL_TEMPLATE_CATEGORIES,
  SUBSCRIPTION_EMAIL_TEMPLATES,
  type EmailTemplateCategory,
} from '../config/emailTemplateCatalog'

export function EmailTemplatesTestingPage() {
  const [categoryFilter, setCategoryFilter] = useState<EmailTemplateCategory | 'all'>('all')
  const [search, setSearch] = useState('')

  const automatedCount = useMemo(
    () => SUBSCRIPTION_EMAIL_TEMPLATES.filter((template) => template.automated).length,
    [],
  )

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase()

    return SUBSCRIPTION_EMAIL_TEMPLATES.filter((template) => {
      if (categoryFilter !== 'all' && template.category !== categoryFilter) {
        return false
      }

      if (!query) {
        return true
      }

      return (
        template.title.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.eventType.toLowerCase().includes(query) ||
        template.templateId.toLowerCase().includes(query)
      )
    })
  }, [categoryFilter, search])

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Notifications"
        title="Email template testing"
        description="Browse all subscription notification templates and run one-click flows where automated tests are available."
        showBack
        backTo="/"
      />

      <Box
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 55%, #ecfeff 100%)',
          border: '1px solid rgba(99, 102, 241, 0.12)',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              <EmailOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {SUBSCRIPTION_EMAIL_TEMPLATES.length} subscription templates
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {automatedCount} automated · {SUBSCRIPTION_EMAIL_TEMPLATES.length - automatedCount}{' '}
                coming soon
              </Typography>
            </Box>
          </Stack>

          <TextField
            size="small"
            placeholder="Search templates…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{
              input: {
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />,
              },
            }}
            sx={{ minWidth: { xs: '100%', md: 280 }, bgcolor: 'background.paper' }}
          />
        </Stack>
      </Box>

      <Alert severity="info" icon={<EmailOutlinedIcon />}>
        Ensure the notifications service is running and subscribed to subscription email topics.
        Trial allocation emails fire on trial checkout completion (purchase), not after Redis payment
        confirmation.
      </Alert>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Chip
          label="All"
          clickable
          color={categoryFilter === 'all' ? 'primary' : 'default'}
          variant={categoryFilter === 'all' ? 'filled' : 'outlined'}
          onClick={() => setCategoryFilter('all')}
        />
        {EMAIL_TEMPLATE_CATEGORIES.map((category) => (
          <Chip
            key={category.id}
            label={category.label}
            clickable
            color={categoryFilter === category.id ? 'primary' : 'default'}
            variant={categoryFilter === category.id ? 'filled' : 'outlined'}
            onClick={() => setCategoryFilter(category.id)}
          />
        ))}
      </Stack>

      {filteredTemplates.length === 0 ? (
        <Alert severity="warning">No templates match your search or filter.</Alert>
      ) : (
        <Grid container spacing={2.5}>
          {filteredTemplates.map((template) => (
            <Grid key={template.id} size={{ xs: 12, sm: 6, xl: 4 }}>
              <EmailTemplateTestCard template={template} />
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  )
}
