import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { databaseDevToolsPlugin } from './vite-plugin-database-dev-tools'
import { cronDevToolsPlugin } from './vite-plugin-cron-dev-tools'
import { redisDevToolsPlugin } from './vite-plugin-redis-dev-tools'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const gatewayUrl =
    env.VITE_API_GATEWAY_URL?.replace(/\/$/, '') ||
    'https://saasppsgateway.eglobeitsolutions.org'
  const notificationsWsUrl =
    env.VITE_NOTIFICATIONS_WS_URL?.replace(/\/$/, '') || 'http://localhost:3108'

  return {
    plugins: [react(), redisDevToolsPlugin(), cronDevToolsPlugin(), databaseDevToolsPlugin()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: gatewayUrl,
          changeOrigin: true,
          secure: true,
        },
        // Socket.io must bypass the API gateway — it only proxies HTTP under /api/*
        '/socket.io': {
          target: notificationsWsUrl,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  }
})
