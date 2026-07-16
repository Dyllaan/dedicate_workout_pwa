import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";
import { version } from "./package.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function shouldPrecacheShellAsset(url: string) {
  if (url === "index.html" || url === "manifest.webmanifest" || url === "registerSW.js") {
    return true;
  }

  if (url.startsWith("assets/entry/")) {
    return true;
  }

  return /\.(css|ico|png|svg|woff|woff2)$/.test(url);
}

function manualChunks(id: string) {
  if (!id.includes("node_modules")) {
    return undefined;
  }

  if (id.includes("react-muscle-highlighter")) {
    return "heatmap-vendor";
  }

  if (id.includes("@dnd-kit/")) {
    return "editor-vendor";
  }

  if (
    id.includes("react-hook-form") ||
    id.includes("@hookform/resolvers") ||
    id.includes("/zod/")
  ) {
    return "auth-vendor";
  }

  return undefined;
}

export default defineConfig(({ mode }) => {
  const analyze = mode === "analyze";
  const plugins: PluginOption[] = [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["dedicate.png"],
      manifest: {
        name: "Dedicate",
        short_name: "Dedicate",
        description: "Track your workouts and lifting progress",
        theme_color: "#09090b",
        background_color: "#09090b",
        display: "standalone",
        icons: [
          {
            src: "dedicate-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "dedicate-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "dedicate-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/auth\//, /^\/workout\//, /^\/api\//],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        manifestTransforms: [
          async (entries) => ({
            manifest: entries.filter((entry) => shouldPrecacheShellAsset(entry.url)),
            warnings: [],
          }),
        ],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.destination === "script" && url.pathname.includes("/assets/chunks/"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "lazy-route-chunks",
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "app-documents",
              networkTimeoutSeconds: 3,
            },
          },
        ],
      }
    }),
  ];

  if (analyze) {
    plugins.push(
      visualizer({
        filename: "dist/bundle-analysis.html",
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
      }),
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __BUILD_DATE__: JSON.stringify(new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      }))
    },
    build: {
      rollupOptions: {
        output: {
          entryFileNames: "assets/entry/[name]-[hash].js",
          chunkFileNames: "assets/chunks/[name]-[hash].js",
          manualChunks,
        },
      },
    },
    server: {
      proxy: {
        "/api/auth": {
          target: "http://127.0.0.1:8080",
          rewrite: (requestPath) => requestPath.replace(/^\/api/, ""),
        },
        "/api/workout": {
          target: "http://127.0.0.1:8080",
          rewrite: (requestPath) => requestPath.replace(/^\/api/, ""),
        },
        "/api/service-status": {
          target: "http://127.0.0.1:8080",
          rewrite: (requestPath) => requestPath.replace(/^\/api/, ""),
        },
        "/api/actuator": {
          target: "http://127.0.0.1:8080",
          rewrite: (requestPath) => requestPath.replace(/^\/api/, ""),
        },
        "/api/version": {
          target: "http://127.0.0.1:8080",
          rewrite: (requestPath) => requestPath.replace(/^\/api/, ""),
        },
      },
    },
  };
});
