import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Add this 'server' section
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8888/.netlify/functions',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
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
          // ... your icons ...
        ],
        screenshots: [
          {
            src: 'screenshot1.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Demonlist View'
          },
          {
            src: 'screenshot2.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Level Detail Page'
          }
        ]
      },
    }),
  ],
})