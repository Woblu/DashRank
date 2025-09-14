import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // This is the new line to add 👇
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
        // OPTIONAL: Add screenshots for a better UI
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