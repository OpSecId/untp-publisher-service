/** API prefix; dev default `/api` matches Vite proxy to FastAPI. */
export function apiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim()
  if (!raw) return '/api'

  let base = raw.replace(/\/$/, '')

  // Browsers block HTTP fetches from HTTPS pages (mixed content). Upgrade obvious typos
  // where the API is also served over HTTPS (e.g. public Railway URL).
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && base.startsWith('http://')) {
    try {
      const u = new URL(base)
      const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1'
      if (!local) {
        u.protocol = 'https:'
        base = u.href.replace(/\/$/, '')
      }
    } catch {
      /* keep base */
    }
  }

  return base
}
