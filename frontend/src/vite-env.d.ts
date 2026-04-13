/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** Optional: Traction tenant proxy base URL for browser calls (CORS must allow your origin). */
  readonly VITE_TRACTION_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
