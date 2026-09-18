import { useEffect, useState } from 'react'
import {
  API_SERVER_CHANGED_EVENT,
  getSelectedApiServer,
  type ApiServer,
} from '../config/apiServersStorage'

export function useSelectedApiServer(): ApiServer | null {
  const [server, setServer] = useState<ApiServer | null>(() => getSelectedApiServer())

  useEffect(() => {
    const sync = () => {
      setServer(getSelectedApiServer())
    }

    sync()
    window.addEventListener(API_SERVER_CHANGED_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(API_SERVER_CHANGED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return server
}
