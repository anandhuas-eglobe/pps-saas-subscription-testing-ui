import type { CreatePlanPayload } from '../../types/subscription'
import { ApiPayloadPreview } from '../ApiPayloadPreview'

interface CreatePlanPayloadPreviewProps {
  payload: CreatePlanPayload
}

export function CreatePlanPayloadPreview({ payload }: CreatePlanPayloadPreviewProps) {
  return <ApiPayloadPreview payload={payload} title="Payload preview" />
}
