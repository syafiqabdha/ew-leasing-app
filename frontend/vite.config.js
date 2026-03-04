import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192x192.svg', 'pwa-512x512.svg', 'apple-touch-icon.svg'],
      manifest: {
        name: 'EW Leasing App',
        short_name: 'EW Leasing',
        description: 'EW Leasing Application',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
  server: {
    host: true, // Listen on all addresses
    port: 5173,
    allowedHosts: ['syafiq-nb.tail5e6f37.ts.net', 'localhost', '127.0.0.1', '0.0.0.0'],
    proxy: {
      '/api': {
        target: 'http://ew_api:5000', // Proxy to Backend Container
        changeOrigin: true,
        secure: false,
      }
    },
    watch: {
      usePolling: true,
    }
  }
})