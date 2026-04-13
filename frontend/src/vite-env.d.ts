/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** Optional: Traction tenant proxy base URL for browser calls (CORS must allow your origin). */
  readonly VITE_TRACTION_URL?: string
  /**
   * Optional dev-only: publisher JWT seeded into sessionStorage on load when empty.
   * Do not set in production builds (inlined into the client bundle).
   */
  readonly VITE_DEV_PUBLISHER_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
