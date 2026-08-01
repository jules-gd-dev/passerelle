import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Passerelle',
        short_name: 'Passerelle',
        description: 'Passerelle Mobile PWA',
        theme_color: '#0d0d0d',
        background_color: '#0d0d0d',
        display: 'standalone',
        icons: [
          {
            src: 'logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    // M8: restrict accepted Host header to the dev tunnel hostname instead of
    // accepting any host (which enables DNS-rebinding attacks in dev).
    allowedHosts: [process.env.DEV_HOST || 'passerelle-dev-instance.julesgd.dev'],
    proxy: {
      '/api': {
        target: process.env.API_TARGET || 'http://api:8787',
        changeOrigin: true,
      },
      '/link': {
        target: process.env.API_TARGET || 'http://api:8787',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.WS_TARGET || 'ws://api:8787',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
  },
});
