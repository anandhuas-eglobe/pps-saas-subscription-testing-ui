export interface InitiateMerchantSignupPayload {
  email: string
}

export interface InitiateMerchantSignupResult {
  message: string
}

export interface IndustryDropdownItem {
  id: string
  name: string
}

export interface CompleteMerchantProfilePayload {
  verificationToken: string
  firstName: string
  lastName: string
  businessName: string
  industryId: string
  phoneNumber: string
  password: string
  termsAccepted: true
}

export interface CompleteMerchantProfileUser {
  id: string
  email: string
  username: string
  firstName: string | null
  lastName: string | null
  displayName: string | null
  role: string | null
  permissions: string[]
}

export interface CompleteMerchantProfileResult {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: CompleteMerchantProfileUser
  merchant: {
    businessName: string
  }
}

export interface EmailLogEvent {
  id: string
  eventType: string
  toEmail: string
  internalStatus: string
  createdAt: string
  updatedAt: string
  templateId?: string
  subject?: string
  variables?: Record<string, unknown>
}

export interface EmailLogsResult {
  data: EmailLogEvent[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
