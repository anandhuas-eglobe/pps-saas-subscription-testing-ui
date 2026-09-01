import type { CancelMessageResult, UpdateSubscriptionDatesPayload } from '../types/subscription'
import { apiRequest } from './client'

export async function updateSubscriptionDates(
  payload: UpdateSubscriptionDatesPayload,
): Promise<CancelMessageResult> {
  const { body } = await apiRequest<CancelMessageResult>(
    '/api/v1/test/subscription/update-dates',
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
  return body.data ?? { message: body.message ?? 'Subscription dates updated successfully.' }
}
