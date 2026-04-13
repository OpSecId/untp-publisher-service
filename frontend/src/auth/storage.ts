import { normalizePortalAccessToken } from './normalizeToken'

export const ACCESS_TOKEN_KEY = 'untp_publisher_access_token'

export function getAccessToken(): string | null {
  try {
    const raw = sessionStorage.getItem(ACCESS_TOKEN_KEY)
    if (!raw) return null
    return normalizePortalAccessToken(raw)
  } catch {
    return null
  }
}

export function setAccessToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(ACCESS_TOKEN_KEY, normalizePortalAccessToken(token))
    else sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  } catch {
    /* ignore */
  }
}
