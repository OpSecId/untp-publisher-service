/** Decode JWT payload (no signature verification — for display / UX only). */
export function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.trim().split('.')
    if (parts.length < 2) return null
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

export function looksLikePublisherJwt(payload: Record<string, unknown> | null): boolean {
  if (!payload) return false
  return typeof payload.client_id === 'string' && typeof payload.expires === 'number'
}
