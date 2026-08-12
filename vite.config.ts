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
      // Subscription service
      '/api': {
        target: 'http://localhost:3112',
        changeOrigin: true,
      },
    },
  },
})
