import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'DashRank',
        short_name: 'DashRank',
        description: 'A Geometry Dash Demonlist website.',
        theme_color: '#0891b2',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ],
        screenshots: [
          { src: 'screenshot1.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: 'Demonlist View' },
          { src: 'screenshot2.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: 'Level Detail Page' }
        ]
      },
    }),
  ],
})