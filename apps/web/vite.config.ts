import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

const https = process.env.HTTPS === '1';

export default defineConfig({
  plugins: [
    react(),
    // Self-signed HTTPS so a phone on the same Wi-Fi can use the service worker and camera.
    ...(https ? [basicSsl() as PluginOption] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'FlipLens',
        short_name: 'FlipLens',
        description: 'Should I buy this for resale?',
        theme_color: '#0f766e',
        background_color: '#0b0f10',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Content pages and crawler files are real documents from the server, never the cached app shell.
        navigateFallbackDenylist: [/^\/api\//, /^\/(guides|pricing|faq|how-it-works)(\/|$)/, /\.(txt|xml|png)$/],
        globIgnores: ['**/guides/**', 'guides.html', 'pricing.html', 'faq.html', 'how-it-works.html', 'og.png'],
        runtimeCaching: [{ urlPattern: /\/api\//, handler: 'NetworkOnly' }],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
  preview: {
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
});
