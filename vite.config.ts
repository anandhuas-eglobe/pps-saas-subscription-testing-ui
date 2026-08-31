import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { databaseDevToolsPlugin } from './vite-plugin-database-dev-tools'
import { redisDevToolsPlugin } from './vite-plugin-redis-dev-tools'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const gatewayUrl =
    env.VITE_API_GATEWAY_URL?.replace(/\/$/, '') ||
    'https://saasppsgateway.eglobeitsolutions.org'

  return {
    plugins: [react(), redisDevToolsPlugin(), databaseDevToolsPlugin()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: gatewayUrl,
          changeOrigin: true,
          secure: true,
        },
        '/socket.io': {
          target: gatewayUrl,
          changeOrigin: true,
          secure: true,
          ws: true,
        },
      },
    },
  }
})
