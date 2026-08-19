import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Route splitting (see App.tsx) already separates the pages. This additionally
        // pins the framework into its own chunk so that shipping an app change does not
        // invalidate it in browser caches — on a VPN link, re-downloading React on every
        // deploy is the expensive part of a repeat visit.
        //
        // Grouped, not one-per-package: react and react-dom are tightly coupled and must
        // land together, and a chunk per dependency would trade cache hits for requests.
        // Path-based, not package-name based: main.tsx imports 'react-dom/client', which is
        // a different module id from 'react-dom', so a name list silently missed most of
        // react-dom. 'scheduler' is react's own runtime dependency and belongs with it.
        //
        // Only the framework is pinned. Sweeping all of node_modules into one vendor chunk
        // would be worse than doing nothing here: it would pull page-only dependencies —
        // react-barcode, lucide-react — onto the critical path that route splitting just
        // removed them from.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@microsoft/signalr')) return 'vendor-signalr';
          if (/[\/]node_modules[\/](react|react-dom|react-router|react-router-dom|scheduler)[\/]/.test(id))
            return 'vendor-react';
          return undefined;
        },
      },
    },
  },
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
