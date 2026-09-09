import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'BookBox',
        short_name: 'BookBox',
        description: 'Biblioteca personal',
        theme_color: '#14120f',
        background_color: '#14120f',
        display: 'standalone',
        start_url: '/',
        lang: 'es',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,webp,jpg,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /book-files|\.epub(\?|$)/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/covers\/|book-covers|covers\.openlibrary\.org|books\.google\.com/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bookbox-covers',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
})
