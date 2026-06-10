import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { redisDevToolsPlugin } from './vite-plugin-redis-dev-tools'

export default defineConfig({
  plugins: [react(), redisDevToolsPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3112',
        changeOrigin: true,
      },
    },
  },
})
