import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { io } from 'socket.io-client'
import {
  bulkMarkNotificationsRead,
  fetchNotifications,
  markNotificationRead,
} from '../api/notifications'
import { AUTH_SESSION_CLEARED_EVENT, AUTH_SESSION_UPDATED_EVENT } from '../auth/tokenStorage'
import { getMerchantIdFromAccessToken } from '../auth/jwtClaims'
import { useAuth } from '../auth/AuthContext'
import type { InAppNotification } from '../types/notifications'
import { isNotificationUnread, normalizeNotification } from '../utils/notifications'
import {
  getDesktopPermission,
  OPEN_NOTIFICATION_DRAWER_EVENT,
  requestDesktopPermission,
  showDesktopNotification,
  type DesktopPermission,
} from './pushNotifications'

const PREVIEW_LIMIT = 12
const LIVE_SYNC_POLL_MS = 30_000
const DISCONNECTED_POLL_MS = 60_000

interface NotificationContextValue {
  merchantId: string | null
  previewItems: InAppNotification[]
  unreadCount: number
  loading: boolean
  error: string | null
  drawerOpen: boolean
  socketConnected: boolean
  desktopPermission: DesktopPermission
  openDrawer: () => void
  closeDrawer: () => void
  refreshPreview: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markPreviewUnreadAsRead: () => Promise<void>
  requestPushPermission: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

function getSocketUrl(): string {
  const configured = import.meta.env.VITE_NOTIFICATIONS_WS_URL ?? ''
  return configured ? `${configured.replace(/\/$/, '')}/notifications` : '/notifications'
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [merchantId, setMerchantId] = useState<string | null>(() => getMerchantIdFromAccessToken())

  const [previewItems, setPreviewItems] = useState<InAppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [desktopPermission, setDesktopPermission] = useState<DesktopPermission>(getDesktopPermission)

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
  }, [])

  useEffect(() => {
    const syncMerchantId = () => {
      setMerchantId(getMerchantIdFromAccessToken())
    }
    syncMerchantId()
    window.addEventListener(AUTH_SESSION_UPDATED_EVENT, syncMerchantId)
    window.addEventListener(AUTH_SESSION_CLEARED_EVENT, syncMerchantId)
    return () => {
      window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, syncMerchantId)
      window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, syncMerchantId)
    }
  }, [isAuthenticated])

  const refreshPreview = useCallback(async () => {
    if (!merchantId) {
      setPreviewItems([])
      setUnreadCount(0)
      setError(
        'Merchant ID not found in the access token. Sign in with a merchant account so JWT tenantId (or merchantId) is present.',
      )
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await fetchNotifications(merchantId, { page: 1, limit: PREVIEW_LIMIT })
      setPreviewItems(result.data)
      setUnreadCount(result.unreadCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [merchantId])

  const openDrawer = useCallback(() => {
    setDrawerOpen(true)
    void refreshPreview()
  }, [refreshPreview])

  const applyIncoming = useCallback((raw: unknown) => {
    const incoming = normalizeNotification(raw)
    if (!incoming) {
      return
    }

    let isNew = false
    setPreviewItems((current) => {
      if (current.some((item) => item.id === incoming.id)) {
        return current
      }
      isNew = true
      return [incoming, ...current].slice(0, PREVIEW_LIMIT)
    })
    if (isNew && isNotificationUnread(incoming)) {
      setUnreadCount((count) => count + 1)
    }
    if (isNew) {
      showDesktopNotification(incoming)
    }
  }, [])

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!merchantId) {
        return
      }

      const result = await markNotificationRead(merchantId, notificationId)
      let wasUnread = false
      setPreviewItems((current) =>
        current.map((item) => {
          if (item.id !== notificationId) {
            return item
          }
          wasUnread = isNotificationUnread(item)
          return { ...item, readAt: result.readAt }
        }),
      )
      if (wasUnread) {
        setUnreadCount((count) => Math.max(0, count - 1))
      }
    },
    [merchantId],
  )

  const markPreviewUnreadAsRead = useCallback(async () => {
    if (!merchantId) {
      return
    }

    const unreadIds = previewItems.filter(isNotificationUnread).map((item) => item.id)
    if (unreadIds.length === 0) {
      return
    }

    await bulkMarkNotificationsRead(merchantId, unreadIds)
    const readAt = new Date().toISOString()
    setPreviewItems((current) =>
      current.map((item) => (unreadIds.includes(item.id) ? { ...item, readAt } : item)),
    )
    await refreshPreview()
  }, [merchantId, previewItems, refreshPreview])

  const requestPushPermission = useCallback(async () => {
    const permission = await requestDesktopPermission()
    setDesktopPermission(permission)
  }, [])

  useEffect(() => {
    void refreshPreview()
  }, [refreshPreview])

  useEffect(() => {
    const onOpenDrawer = () => {
      setDrawerOpen(true)
    }

    window.addEventListener(OPEN_NOTIFICATION_DRAWER_EVENT, onOpenDrawer)
    return () => {
      window.removeEventListener(OPEN_NOTIFICATION_DRAWER_EVENT, onOpenDrawer)
    }
  }, [])

  useEffect(() => {
    if (!merchantId) {
      return
    }

    const socket = io(getSocketUrl(), {
      path: '/socket.io',
      query: { userId: merchantId },
      auth: { userId: merchantId },
      transports: ['websocket', 'polling'],
      reconnection: true,
    })

    const onConnect = () => {
      setSocketConnected(true)
      void refreshPreview()
    }
    const onDisconnect = () => {
      setSocketConnected(false)
    }
    const onConnectError = () => {
      setSocketConnected(false)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.on('notification:new', applyIncoming)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off('notification:new', applyIncoming)
      socket.disconnect()
      setSocketConnected(false)
    }
  }, [applyIncoming, merchantId, refreshPreview])

  useEffect(() => {
    if (!merchantId) {
      return
    }

    const pollMs = socketConnected ? LIVE_SYNC_POLL_MS : DISCONNECTED_POLL_MS
    const timer = window.setInterval(() => {
      void refreshPreview()
    }, pollMs)

    return () => {
      window.clearInterval(timer)
    }
  }, [merchantId, refreshPreview, socketConnected])

  useEffect(() => {
    if (!drawerOpen) {
      return
    }
    void refreshPreview()
  }, [drawerOpen, refreshPreview])

  const value = useMemo<NotificationContextValue>(
    () => ({
      merchantId,
      previewItems,
      unreadCount,
      loading,
      error,
      drawerOpen,
      socketConnected,
      desktopPermission,
      openDrawer,
      closeDrawer,
      refreshPreview,
      markAsRead,
      markPreviewUnreadAsRead,
      requestPushPermission,
    }),
    [
      merchantId,
      previewItems,
      unreadCount,
      loading,
      error,
      drawerOpen,
      socketConnected,
      desktopPermission,
      openDrawer,
      closeDrawer,
      refreshPreview,
      markAsRead,
      markPreviewUnreadAsRead,
      requestPushPermission,
    ],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
