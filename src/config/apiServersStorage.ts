import {
  isAppVisualThemeId,
  type AppVisualThemeId,
} from '../theme/visualThemes'

export interface ApiServer {
  id: string
  name: string
  baseUrl: string
  notificationsWsUrl: string
  theme: AppVisualThemeId
  createdAt: number
  updatedAt: number
}

export const API_SERVER_CHANGED_EVENT = 'subscription-tester:api-server-changed'

const SERVERS_KEY = 'subscription-tester:apiServers'
const SELECTED_SERVER_KEY = 'subscription-tester:selectedApiServerId'

const DEFAULT_NOTIFICATIONS_WS_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_NOTIFICATIONS_WS_URL
    ? String(import.meta.env.VITE_NOTIFICATIONS_WS_URL)
    : 'http://localhost:3108'
  ).replace(/\/$/, '') || 'http://localhost:3108'

const DEFAULT_SERVER: Omit<ApiServer, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'localhost',
  baseUrl: 'http://localhost:8080',
  notificationsWsUrl: DEFAULT_NOTIFICATIONS_WS_URL,
  theme: 'default',
}

function createServerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `server-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '')
}

function validateAbsoluteUrl(value: string, label: string): string {
  const normalized = normalizeBaseUrl(value)
  if (!normalized) {
    throw new Error(`${label} is required.`)
  }

  try {
    new URL(normalized)
  } catch {
    throw new Error(`${label} must be a valid absolute URL (e.g. http://localhost:3108).`)
  }

  return normalized
}

function normalizeServer(raw: Partial<ApiServer> & Pick<ApiServer, 'id' | 'name' | 'baseUrl'>): ApiServer {
  return {
    id: raw.id,
    name: raw.name,
    baseUrl: normalizeBaseUrl(raw.baseUrl),
    notificationsWsUrl: normalizeBaseUrl(
      raw.notificationsWsUrl || DEFAULT_NOTIFICATIONS_WS_URL,
    ),
    theme: isAppVisualThemeId(raw.theme) ? raw.theme : 'default',
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  }
}

function readServers(): ApiServer[] {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = localStorage.getItem(SERVERS_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as Array<Partial<ApiServer>>
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter(
        (server) =>
          server &&
          typeof server.id === 'string' &&
          typeof server.name === 'string' &&
          typeof server.baseUrl === 'string',
      )
      .map((server) =>
        normalizeServer(server as Partial<ApiServer> & Pick<ApiServer, 'id' | 'name' | 'baseUrl'>),
      )
  } catch {
    return []
  }
}

function writeServers(servers: ApiServer[]): void {
  localStorage.setItem(SERVERS_KEY, JSON.stringify(servers))
}

function dispatchServerChanged(): void {
  window.dispatchEvent(new CustomEvent(API_SERVER_CHANGED_EVENT))
}

function ensureDefaultServer(): ApiServer[] {
  const servers = readServers()
  if (servers.length > 0) {
    const raw = localStorage.getItem(SERVERS_KEY)
    // Persist migrated theme / WS fields once if older entries lacked them.
    if (raw && (!raw.includes('"theme"') || !raw.includes('"notificationsWsUrl"'))) {
      writeServers(servers)
    }
    return servers
  }

  const now = Date.now()
  const defaultServer: ApiServer = {
    id: createServerId(),
    ...DEFAULT_SERVER,
    createdAt: now,
    updatedAt: now,
  }

  writeServers([defaultServer])
  localStorage.setItem(SELECTED_SERVER_KEY, defaultServer.id)
  return [defaultServer]
}

export function getApiServers(): ApiServer[] {
  return ensureDefaultServer().sort((left, right) => right.updatedAt - left.updatedAt)
}

export function getSelectedApiServerId(): string | null {
  ensureDefaultServer()
  return localStorage.getItem(SELECTED_SERVER_KEY)
}

export function setSelectedApiServerId(id: string): void {
  localStorage.setItem(SELECTED_SERVER_KEY, id)
  dispatchServerChanged()
}

export function getSelectedApiServer(): ApiServer | null {
  const servers = getApiServers()
  const selectedId = getSelectedApiServerId()
  if (!selectedId) {
    return servers[0] ?? null
  }

  return servers.find((server) => server.id === selectedId) ?? servers[0] ?? null
}

export function getSelectedApiBaseUrl(): string {
  const selected = getSelectedApiServer()
  return selected?.baseUrl ?? ''
}

export function getSelectedNotificationsWsUrl(): string {
  const selected = getSelectedApiServer()
  return selected?.notificationsWsUrl || DEFAULT_NOTIFICATIONS_WS_URL
}

export function getSelectedVisualThemeId(): AppVisualThemeId {
  return getSelectedApiServer()?.theme ?? 'default'
}

export function upsertApiServer(input: {
  id?: string
  name: string
  baseUrl: string
  notificationsWsUrl: string
  theme: AppVisualThemeId
}): ApiServer {
  const name = input.name.trim()
  if (!name) {
    throw new Error('Server name is required.')
  }

  const baseUrl = validateAbsoluteUrl(input.baseUrl, 'Base URL')
  const notificationsWsUrl = validateAbsoluteUrl(
    input.notificationsWsUrl,
    'Notifications WS URL',
  )
  const theme = isAppVisualThemeId(input.theme) ? input.theme : 'default'

  const servers = ensureDefaultServer()
  const existingIndex = input.id
    ? servers.findIndex((server) => server.id === input.id)
    : -1

  const now = Date.now()
  const nextServer: ApiServer = {
    id: existingIndex >= 0 ? servers[existingIndex].id : createServerId(),
    name,
    baseUrl,
    notificationsWsUrl,
    theme,
    createdAt: existingIndex >= 0 ? servers[existingIndex].createdAt : now,
    updatedAt: now,
  }

  if (existingIndex >= 0) {
    servers[existingIndex] = nextServer
  } else {
    servers.push(nextServer)
  }

  writeServers(servers)

  if (!getSelectedApiServerId()) {
    setSelectedApiServerId(nextServer.id)
  } else if (getSelectedApiServerId() === nextServer.id) {
    dispatchServerChanged()
  }

  return nextServer
}

export function deleteApiServer(id: string): void {
  const servers = ensureDefaultServer().filter((server) => server.id !== id)
  if (servers.length === 0) {
    localStorage.removeItem(SERVERS_KEY)
    localStorage.removeItem(SELECTED_SERVER_KEY)
    ensureDefaultServer()
    dispatchServerChanged()
    return
  }

  writeServers(servers)

  if (getSelectedApiServerId() === id) {
    setSelectedApiServerId(servers[0].id)
  } else {
    dispatchServerChanged()
  }
}

export function getApiServerById(id: string): ApiServer | null {
  return getApiServers().find((server) => server.id === id) ?? null
}

export function getDefaultNotificationsWsUrl(): string {
  return DEFAULT_NOTIFICATIONS_WS_URL
}
