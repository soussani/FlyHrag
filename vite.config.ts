import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  base: "/FlyHrag/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "icons/*",
        "data/airports.json",
        "data/airports-meta.json",
      ],
      manifest: {
        name: "FlyHrag",
        short_name: "FlyHrag",
        description: "Your personal flight companion",
        start_url: "/FlyHrag/",
        scope: "/FlyHrag/",
        display: "standalone",
        background_color: "#f3f6fa",
        theme_color: "#102e4d",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 24000000,
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/FlyHrag/data/weather"),
            handler: "NetworkFirst",
            options: {
              cacheName: "flyhrag-weather",
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 5, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
  define: {
    __BUILD_COMMIT__: JSON.stringify(
      process.env.GITHUB_SHA?.slice(0, 7) || "local",
    ),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
