import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // NotificationContext connects to the relative path /hubs/notifications. Without
      // this entry the SignalR negotiate request hits the dev server instead of the API
      // and fails, twice — once on connect and again on the automatic reconnect.
      '/hubs': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
