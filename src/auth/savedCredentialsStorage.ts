export interface SavedCredential {
  id: string
  label: string
  email: string
  password: string
  rememberMe: boolean
  updatedAt: number
}

const STORAGE_KEY = 'subscription-tester:savedCredentials'
const LAST_SELECTED_KEY = 'subscription-tester:lastSelectedCredentialId'
const SAVE_ON_LOGIN_KEY = 'subscription-tester:saveCredentialsOnLogin'

function readCredentials(): SavedCredential[] {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as SavedCredential[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCredentials(credentials: SavedCredential[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials))
}

function createCredentialId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `cred-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function getSavedCredentials(): SavedCredential[] {
  return readCredentials().sort((left, right) => right.updatedAt - left.updatedAt)
}

export function getLastSelectedCredentialId(): string | null {
  return localStorage.getItem(LAST_SELECTED_KEY)
}

export function setLastSelectedCredentialId(id: string | null): void {
  if (id) {
    localStorage.setItem(LAST_SELECTED_KEY, id)
  } else {
    localStorage.removeItem(LAST_SELECTED_KEY)
  }
}

export function getSaveCredentialsOnLogin(): boolean {
  return localStorage.getItem(SAVE_ON_LOGIN_KEY) === 'true'
}

export function setSaveCredentialsOnLogin(value: boolean): void {
  localStorage.setItem(SAVE_ON_LOGIN_KEY, String(value))
}

export function upsertSavedCredential(input: {
  id?: string
  label?: string
  email: string
  password: string
  rememberMe?: boolean
}): SavedCredential {
  const normalizedEmail = input.email.trim().toLowerCase()
  const credentials = readCredentials()
  const existingIndex = input.id
    ? credentials.findIndex((credential) => credential.id === input.id)
    : credentials.findIndex((credential) => credential.email === normalizedEmail)

  const nextCredential: SavedCredential = {
    id: existingIndex >= 0 ? credentials[existingIndex].id : createCredentialId(),
    label: input.label?.trim() || normalizedEmail,
    email: normalizedEmail,
    password: input.password,
    rememberMe: input.rememberMe ?? false,
    updatedAt: Date.now(),
  }

  if (existingIndex >= 0) {
    credentials[existingIndex] = nextCredential
  } else {
    credentials.push(nextCredential)
  }

  writeCredentials(credentials)
  return nextCredential
}

export function deleteSavedCredential(id: string): void {
  const credentials = readCredentials().filter((credential) => credential.id !== id)
  writeCredentials(credentials)

  if (getLastSelectedCredentialId() === id) {
    setLastSelectedCredentialId(null)
  }
}

export function getSavedCredentialById(id: string): SavedCredential | null {
  return readCredentials().find((credential) => credential.id === id) ?? null
}
