import { confirmMerchantUsage, logMerchantUsage, validateMerchantUsage } from '../api/usageTracking'
import type { SubscriptionLimitAndUsage } from '../types/subscription'
import { deriveIsOverageFromUsage } from './usageTracking'

export interface BulkOverageGenerationResult {
  succeeded: number
  failed: number
  errors: string[]
}

function createEntityReferenceId(): string {
  return crypto.randomUUID()
}

/**
 * Runs validate → log → confirm repeatedly to accumulate overage usage.
 */
export async function generateBulkOverageUsage(params: {
  attributeCode: string
  count: number
  limitsAndUsages: SubscriptionLimitAndUsage[]
  onProgress?: (completed: number, total: number) => void
  onIterationComplete?: () => Promise<void>
  maxConsecutiveFailures?: number
}): Promise<BulkOverageGenerationResult> {
  const errors: string[] = []
  let succeeded = 0
  let consecutiveFailures = 0
  const maxFailures = params.maxConsecutiveFailures ?? 3

  for (let index = 0; index < params.count; index++) {
    try {
      const validateData = await validateMerchantUsage(params.attributeCode)
      const entityReferenceId = createEntityReferenceId()
      const usageRow = params.limitsAndUsages.find((row) => row.attributeCode === params.attributeCode)

      const logData = await logMerchantUsage(
        {
          attributeCode: params.attributeCode,
          entityReferenceId,
          planFeatureAttributeId: validateData.planFeatureAttributeId,
          merchantSubscriptionId: validateData.merchantSubscriptionId,
          isOverageAllowed: validateData.isOverageAllowed,
        },
        { fallbackIsOverage: deriveIsOverageFromUsage(usageRow) },
      )

      await confirmMerchantUsage({
        entityReferenceId,
        attributeCode: params.attributeCode,
        isOverage: logData.isOverage,
        usageId: logData.id,
      })

      succeeded++
      consecutiveFailures = 0
      params.onProgress?.(index + 1, params.count)

      if (params.onIterationComplete) {
        await params.onIterationComplete()
      }
    } catch (error) {
      consecutiveFailures++
      const message = error instanceof Error ? error.message : String(error)
      errors.push(message)

      if (consecutiveFailures >= maxFailures) {
        break
      }
    }
  }

  return {
    succeeded,
    failed: params.count - succeeded,
    errors,
  }
}
