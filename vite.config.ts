import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    // Dev-only, self-signed HTTPS. getUserMedia (camera access, for barcode scanning) requires
    // a secure context; a phone reached over the LAN is neither localhost nor HTTPS by default,
    // so it's blocked outright without this. The browser will warn the cert isn't trusted —
    // click through once per device. Never used for the production build.
    basicSsl(),
  ],
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
    // Off by default (Vite only binds localhost), so a phone on the same network couldn't
    // reach the dev server at all regardless of HTTP vs HTTPS. Needed to test camera-based
    // barcode scanning from an actual device rather than a desktop browser.
    host: true,
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
