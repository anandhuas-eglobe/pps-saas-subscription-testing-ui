export const SavedCardStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
} as const

export type SavedCardStatusValue = (typeof SavedCardStatus)[keyof typeof SavedCardStatus]

export const LIST_SAVED_CARDS_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'last4',
  'brand',
  'billingName',
  'billingEmail',
  'status',
  'expMonth',
  'expYear',
  'isDefault',
] as const

export type ListSavedCardsSortBy = (typeof LIST_SAVED_CARDS_SORT_FIELDS)[number]

export interface SavedCardListItem {
  id: string
  last4: string
  brand: string | null
  expMonth: number
  expYear: number
  isDefault: boolean
  status: SavedCardStatusValue
  billingName: string | null
  billingEmail: string | null
  createdAt: string
  updatedAt: string
}

export interface SavedCardsPagination {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ListSavedCardsResult {
  cards: SavedCardListItem[]
  pagination: SavedCardsPagination
}

export interface ListSavedCardsParams {
  page?: number
  limit?: number
  status?: SavedCardStatusValue
  search?: string
  sortBy?: ListSavedCardsSortBy
  sortOrder?: 'asc' | 'desc'
}

export interface SaveCardPayload {
  agreedToTerms: boolean
}

export interface SaveCardResult {
  setupUrl: string
}
