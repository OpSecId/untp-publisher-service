/** API prefix; dev default `/api` matches Vite proxy to FastAPI. */
export function apiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (raw !== undefined && raw !== '') return raw.replace(/\/$/, '')
  return '/api'
}
