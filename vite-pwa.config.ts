import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Lovly Property Management',
        short_name: 'LovlyProp',
        description: 'Property management system with M-Pesa integration for rent and utility payments',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-72x72.svg',
            sizes: '72x72',
            type: 'image/svg+xml',
            purpose: 'maskable any'
          },
          {
            src: 'icons/icon-96x96.svg',
            sizes: '96x96',
            type: 'image/svg+xml',
            purpose: 'maskable any'
          },
          {
            src: 'icons/icon-128x128.svg',
            sizes: '128x128',
            type: 'image/svg+xml',
            purpose: 'maskable any'
          },
          {
            src: 'icons/icon-144x144.svg',
            sizes: '144x144',
            type: 'image/svg+xml',
            purpose: 'maskable any'
          },
          {
            src: 'icons/icon-152x152.svg',
            sizes: '152x152',
            type: 'image/svg+xml',
            purpose: 'maskable any'
          },
          {
            src: 'icons/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'maskable any'
          },
          {
            src: 'icons/icon-384x384.svg',
            sizes: '384x384',
            type: 'image/svg+xml',
            purpose: 'maskable any'
          },
          {
            src: 'icons/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable any'
          }
        ],
        shortcuts: [
          {
            name: 'Pay Rent',
            short_name: 'Rent',
            description: 'Quick access to rent payment',
            url: '/?action=pay-rent',
            icons: [
              {
                src: 'icons/rent-icon-96x96.svg',
                sizes: '96x96'
              }
            ]
          },
          {
            name: 'Pay Utilities',
            short_name: 'Utilities',
            description: 'Quick access to utility payments',
            url: '/?action=pay-utilities',
            icons: [
              {
                src: 'icons/utility-icon-96x96.svg',
                sizes: '96x96'
              }
            ]
          },
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'View your dashboard',
            url: '/dashboard',
            icons: [
              {
                src: 'icons/dashboard-icon-96x96.svg',
                sizes: '96x96'
              }
            ]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.safaricom\.co\.ke\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'mpesa-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/kozhlejudselgtmohdfm\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ]
});

