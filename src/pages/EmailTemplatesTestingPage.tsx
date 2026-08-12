import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import { PageHeader } from '../components/layout/PageHeader'
import { TrialAllocatedEmailTestCard } from '../components/email-templates/TrialAllocatedEmailTestCard'

export function EmailTemplatesTestingPage() {
  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Notifications"
        title="Email template testing"
        description="One-click flows that exercise subscription notification emails end-to-end. Each card runs the API steps needed to publish the corresponding notification event."
        showBack
        backTo="/"
      />

      <Alert severity="info" icon={<EmailOutlinedIcon />}>
        Ensure the notifications service is running and subscribed to subscription email topics.
        Trial allocation emails are sent when trial checkout completes (purchase), not after Redis
        payment confirmation.
      </Alert>

      <TrialAllocatedEmailTestCard />
    </Stack>
  )
}
