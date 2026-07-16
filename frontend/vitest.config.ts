import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      tests: path.resolve(__dirname, "./tests"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify("test-version"),
    __BUILD_DATE__: JSON.stringify("24 Apr 2026"),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    css: true,
    testTimeout: 15000,
    hookTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "json", "html"],
      include: [
        "src/api/**/*.ts",
        "src/components/auth/**/*.{ts,tsx}",
        "src/components/charts/**/*.{ts,tsx}",
        "src/components/dash/MiniProgressChart.tsx",
        "src/config/config.ts",
        "src/hooks/useLocalStorage.tsx",
        "src/hooks/useMfa.ts",
        "src/hooks/periodisation/useProgramme.ts",
        "src/hooks/periodisation/useSplits.ts",
        "src/hooks/workout/useProgressAnalytics.ts",
      ],
      exclude: [
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/assets/**",
        "src/components/ui/**",
        "src/components/skeletons/**",
        "src/components/auth/dialog/AuthRequirementsDialog.tsx",
      ],
    },
  },
});
