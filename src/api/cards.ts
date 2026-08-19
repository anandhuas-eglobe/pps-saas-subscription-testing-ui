import type {
  ListSavedCardsParams,
  ListSavedCardsResult,
  SaveCardPayload,
  SaveCardResult,
} from '../types/cards'
import { apiRequest } from './client'

const PAYMENT_BASE = import.meta.env.VITE_PAYMENT_BASE_URL ?? ''

function buildListQuery(params: ListSavedCardsParams = {}): string {
  const search = new URLSearchParams()
  if (params.page != null) {
    search.set('page', String(params.page))
  }
  if (params.limit != null) {
    search.set('limit', String(params.limit))
  }
  if (params.status) {
    search.set('status', params.status)
  }
  if (params.search) {
    search.set('search', params.search)
  }
  if (params.sortBy) {
    search.set('sortBy', params.sortBy)
  }
  if (params.sortOrder) {
    search.set('sortOrder', params.sortOrder)
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

export async function listSavedCards(
  params: ListSavedCardsParams = {},
): Promise<ListSavedCardsResult> {
  const { body } = await apiRequest<ListSavedCardsResult>(
    `/api/v1/cards${buildListQuery(params)}`,
    undefined,
    { baseUrl: PAYMENT_BASE },
  )
  return body.data!
}

export async function saveCard(payload: SaveCardPayload): Promise<SaveCardResult> {
  const { body } = await apiRequest<SaveCardResult>(
    '/api/v1/cards',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    { baseUrl: PAYMENT_BASE },
  )
  return body.data!
}

export async function setDefaultSavedCard(cardId: string): Promise<void> {
  await apiRequest<null>(
    `/api/v1/cards/${cardId}/default`,
    {
      method: 'PUT',
    },
    { baseUrl: PAYMENT_BASE },
  )
}

export async function deleteSavedCard(cardId: string): Promise<void> {
  await apiRequest<null>(
    `/api/v1/cards/${cardId}`,
    {
      method: 'DELETE',
    },
    { baseUrl: PAYMENT_BASE },
  )
}
