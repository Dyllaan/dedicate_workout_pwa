/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string
declare const __BUILD_DATE__: string

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_MIN_SETS: string
  readonly VITE_MAX_SETS: string
  readonly VITE_MIN_REPS: string
  readonly VITE_MAX_REPS: string
  readonly VITE_MIN_STRING_LENGTH: string
  readonly VITE_MAX_STRING_LENGTH: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}