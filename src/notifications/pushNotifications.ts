import type { InAppNotification } from '../types/notifications'

export const OPEN_NOTIFICATION_DRAWER_EVENT = 'pps:open-notification-drawer'

export type DesktopPermission = NotificationPermission | 'unsupported'

export function getDesktopPermission(): DesktopPermission {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported'
  }
  return Notification.permission
}

export async function requestDesktopPermission(): Promise<DesktopPermission> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported'
  }
  if (Notification.permission !== 'default') {
    return Notification.permission
  }
  return Notification.requestPermission()
}

export function showDesktopNotification(notification: InAppNotification): void {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return
  }
  if (Notification.permission !== 'granted') {
    return
  }

  const desktop = new Notification(notification.title, {
    body: notification.message,
    tag: notification.id,
    icon: '/vite.svg',
  })

  desktop.onclick = () => {
    window.focus()
    window.dispatchEvent(
      new CustomEvent<InAppNotification>(OPEN_NOTIFICATION_DRAWER_EVENT, {
        detail: notification,
      }),
    )
    desktop.close()
  }
}

export function dispatchOpenNotificationDrawer(notification?: InAppNotification): void {
  window.dispatchEvent(
    new CustomEvent<InAppNotification | undefined>(OPEN_NOTIFICATION_DRAWER_EVENT, {
      detail: notification,
    }),
  )
}
