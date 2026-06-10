import type { ApiResponse, CatalogFeature } from '../types/subscription'
import { apiRequest } from './client'

export async function fetchFeatures(): Promise<CatalogFeature[]> {
  const { body } = await apiRequest<CatalogFeature[]>('/api/v1/features')
  return body.data ?? []
}

export type FeaturesApiResult = ApiResponse<CatalogFeature[]>
