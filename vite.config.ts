import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { databaseDevToolsPlugin } from './vite-plugin-database-dev-tools'
import { redisDevToolsPlugin } from './vite-plugin-redis-dev-tools'

export default defineConfig({
  plugins: [react(), redisDevToolsPlugin(), databaseDevToolsPlugin()],
  server: {
    port: 5173,
    proxy: {
      // IAM auth endpoints (login / refresh / logout)
      '/api/v1/auth': {
        target: 'http://localhost:3104',
        changeOrigin: true,
      },
      // Payment service cards (must be before the generic /api proxy)
      '/api/v1/cards': {
        target: 'http://localhost:3107',
        changeOrigin: true,
      },
      // Merchant service signup/profile (must be before the generic /api proxy)
      '/api/v1/merchants': {
        target: 'http://localhost:3105',
        changeOrigin: true,
      },
      '/api/v1/industries': {
        target: 'http://localhost:3105',
        changeOrigin: true,
      },
      // Notifications service (must be before the generic /api proxy)
      '/api/v1/notifications': {
        target: 'http://localhost:3108',
        changeOrigin: true,
      },
      '/api/v1/email-logs': {
        target: 'http://localhost:3108',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3108',
        changeOrigin: true,
        ws: true,
      },
      // Subscription service
      '/api': {
        target: 'http://localhost:3112',
        changeOrigin: true,
      },
    },
  },
})
